const logger = require('../config/logger');
const { parseStructuredQuizArray } = require('../utils/parseJson');
const { coldStartMcqKey } = require('../utils/teachingObjectKeys');
const { validateAiOutput } = require('./aiOutputValidation');
const { createBudgetForAction, runWithLlmBudget } = require('./llmRequestBudget');

/**
 * High-quality MCQ exemplars to guide generation through few-shot learning
 */
const EXEMPLAR_MCQS = {
    good: `GOOD EXAMPLE (clinical application, medium difficulty):
{
  "questionType": "clinical_application",
  "question": "A 67-year-old man with type 2 diabetes (HbA1c 8.2%), hypertension, and CKD stage 3b (eGFR 38) asks about starting a GLP-1 agonist for weight loss and glycemic control. What is the most appropriate response?",
  "options": [
    "A: Start semaglutide 0.25mg weekly — safe and shown to reduce cardiovascular and renal events in CKD",
    "B: Avoid GLP-1 agonists — contraindicated in CKD stage 3b due to risk of acute kidney injury",
    "C: Safe but minimal benefit — focus on SGLT2 inhibitor as first-line cardioprotective agent",
    "D: Requires dose adjustment — reduce to 50% dose and monitor creatinine weekly"
  ],
  "correctAnswer": "A",
  "explanation": "SUSTAIN-6 and FLOW trials demonstrated that semaglutide is safe and beneficial in CKD stage 3, reducing cardiovascular events, progression to macroalbuminuria, and eGFR decline. No dose adjustment needed for CKD 3b. While SGLT2 inhibitors are also beneficial, GLP-1 agonists provide complementary metabolic and renal protection.",
  "difficulty": "medium"
}`,
    bad: `BAD EXAMPLE (avoid this pattern):
{
  "questionType": "recall",
  "question": "What is diabetes mellitus?",
  "options": [
    "A: High blood sugar",
    "B: Low blood sugar", 
    "C: No sugar",
    "D: Normal sugar"
  ],
  "correctAnswer": "A",
  "explanation": "Diabetes is characterized by high blood sugar levels.",
  "difficulty": "easy"
}
ISSUES: Too basic for target audience, unrealistic distractors, no clinical context, superficial explanation.`
};

/**
 * Groups array of items by a key function
 */
function groupBy(array, keyFn) {
    const grouped = {};
    for (const item of array) {
        const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    }
    return grouped;
}

/**
 * Shuffles array in place (Fisher-Yates algorithm)
 */
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Validates and enforces MCQ diversity by overgeneration + filtering
 */
function enforceMCQDiversity(questions, targetDistribution) {
    const { 
        types = { recall: 1, clinical_application: 2, guideline: 1, pitfall: 1 },
        difficulties = { easy: 2, medium: 2, hard: 1 }
    } = targetDistribution;
    
    const byType = groupBy(questions, 'questionType');
    const selected = [];
    const typeKeys = Object.keys(types);
    const difficultyKeys = Object.keys(difficulties);
    
    // First pass: select by question type distribution
    for (const [type, count] of Object.entries(types)) {
        const available = byType[type] || [];
        const shuffled = shuffle(available);
        selected.push(...shuffled.slice(0, count));
    }
    
    // If we don't have enough, fill from any available questions
    if (selected.length < 5) {
        const remaining = questions.filter(q => !selected.includes(q));
        selected.push(...shuffle(remaining).slice(0, 5 - selected.length));
    }
    
    // Validate difficulty distribution
    const selectedDifficulties = groupBy(selected, 'difficulty');
    const difficultyReport = difficultyKeys.map(d => ({
        difficulty: d,
        target: difficulties[d] || 0,
        actual: (selectedDifficulties[d] || []).length
    }));
    
    const typeReport = typeKeys.map(t => ({
        type: t,
        target: types[t] || 0,
        actual: selected.filter(q => q.questionType === t).length
    }));
    
    return {
        questions: selected.slice(0, 5),
        diversityReport: {
            types: typeReport,
            difficulties: difficultyReport,
            meetsTypeTarget: typeReport.every(r => r.actual >= Math.floor(r.target * 0.7)),  // 70% tolerance
            meetsDifficultyTarget: difficultyReport.every(r => r.actual >= Math.floor(r.target * 0.7))
        }
    };
}

function buildMcqPrompt(topic, knowledge, { includeExemplars = true, sourceArticles = [] } = {}) {
    const k = knowledge || {};
    const teachingPoints = (k.teachingPoints || []).map((tp, i) =>
        `${i + 1}. ${tp.claim || tp.text || ''}`
    ).join('\n');
    const mcqAngles = (k.mcqAngles || []).join('; ');

    const exemplarBlock = includeExemplars ? `\n\nQUALITY STANDARDS:\n${EXEMPLAR_MCQS.good}\n\n${EXEMPLAR_MCQS.bad}\n` : '';

    const sourceBlock = Array.isArray(sourceArticles) && sourceArticles.length
        ? `\nSOURCE PAPERS (ground questions in these; prioritise the landmark / practice-defining trials among them):\n${sourceArticles.slice(0, 10).map((a, i) => `${i + 1}. ${a.title || ''}${a.pubdate ? ` (${String(a.pubdate).slice(0, 4)})` : ''}`).join('\n')}\n`
        : '';

    return `Generate 10 high-quality MCQs about "${topic}" for final-year medical students.

TOPIC KNOWLEDGE: ${k.mentorMessage || ''}
KEY TEACHING POINTS:
${teachingPoints || 'General knowledge'}
MCQ ANGLES: ${mcqAngles || 'Mixed'}
${sourceBlock}${exemplarBlock}
STRICT REQUIREMENTS:
- Question types: Generate AT LEAST 2 clinical_application, 2 recall, 1 guideline, 1 pitfall, and fill remaining with mixed types
- Difficulty: Generate AT LEAST 3 easy, 4 medium, 3 hard
- Clinical vignettes MUST include: age, sex, presenting complaint, relevant comorbidities
- 4 options (A-D), exactly one correct
- Distractors must be plausible but clearly incorrect to an expert
- EVIDENCE PRIORITY: base correct answers on landmark, practice-defining trials and
  seminal studies for this topic (the pivotal RCTs), not isolated or recent
  low-impact papers. Name the specific trial in the explanation where relevant.
- Explanations must cite evidence or guidelines (if available in teaching points)
- Do NOT invent drug doses, guidelines, or trial results not in the teaching points

Return ONLY valid JSON with this shape (no markdown, no prose outside JSON):
{"questions":[{"type":"multiple_choice","questionType":"recall|clinical_application|guideline|pitfall","question":"...","options":["A: ...","B: ...","C: ...","D: ..."],"correctAnswer":"A","explanation":"2-3 sentences with evidence","difficulty":"easy|medium|hard","sourceReference":null}]}`;
}

async function generateAndStoreMCQs(db, ai, topic, knowledge, { provider = 'gemini', model = null, sourceArticles = [] } = {}) {
    return runWithLlmBudget(createBudgetForAction('quiz'), async () => {
        const normalizedTopic = db.normalizeTopic(topic);
        const objectKey = coldStartMcqKey(db, topic);

        const existing = await db.getTeachingObjectByKey(objectKey).catch(() => null);
        
        // Check if existing MCQs are stale or low quality
        if (existing?.payload?.mcqs?.length > 0) {
            const age = Date.now() - new Date(existing.generatedAt).getTime();
            const ageInDays = age / (1000 * 60 * 60 * 24);
            const confidence = existing.confidence || 0;
            
            // Expire old low-confidence MCQs
            if (ageInDays > 90 && confidence < 0.7) {
                logger.info({ topic, age: ageInDays, confidence }, 'Cold-start MCQs expired, regenerating');
                await db.deleteTeachingObject(existing.objectKey).catch(() => {});
            } else {
                return { skipped: true, topic, reason: 'Recent high-quality MCQs exist' };
            }
        }

        const prompt = buildMcqPrompt(topic, knowledge, { includeExemplars: true, sourceArticles });
        if (!provider) {
            throw new Error('No AI provider available for MCQ generation');
        }
        const parsed = await ai.callStructured(prompt, provider, model || undefined, {
            temperature: 0.4,
            maxOutputTokens: 4000,  // Increased for 10 MCQs
            usage: { operation: 'cold_start_mcq', topic },
        });

        const validated = validateAiOutput('quiz_generation', parsed, { allowDegrade: false });
        if (!validated.ok) {
            throw new Error(validated.errors.join('; ') || 'Invalid MCQ JSON from AI');
        }
        const allMcqs = parseStructuredQuizArray(validated.data);
        if (!Array.isArray(allMcqs) || allMcqs.length === 0) {
            throw new Error('Invalid MCQ JSON from AI');
        }

        // Enforce diversity through selection
        const targetDistribution = {
            types: { recall: 1, clinical_application: 2, guideline: 1, pitfall: 1 },
            difficulties: { easy: 2, medium: 2, hard: 1 }
        };
        const { questions: mcqs, diversityReport } = enforceMCQDiversity(allMcqs, targetDistribution);
        
        // Calculate confidence based on diversity achievement
        let confidence = 0.65;
        if (diversityReport.meetsTypeTarget && diversityReport.meetsDifficultyTarget) {
            confidence = 0.80;
        } else if (diversityReport.meetsTypeTarget || diversityReport.meetsDifficultyTarget) {
            confidence = 0.72;
        }

        await db.upsertTeachingObject({
            objectKey,
            objectType: 'cold_start_mcq',
            topic: normalizedTopic,
            title: `Cold-Start MCQs: ${topic}`,
            provider,
            model: model || provider,
            confidence,
            generatedAt: new Date().toISOString(),
            payload: { 
                mcqs, 
                topic,
                diversityReport,
                generationMetadata: {
                    totalGenerated: allMcqs.length,
                    selectedCount: mcqs.length,
                    diversityEnforced: true
                }
            },
        });

        logger.info({ 
            topic, 
            count: mcqs.length, 
            diversity: diversityReport,
            confidence 
        }, 'Cold-start MCQs stored with diversity enforcement');
        
        return { topic, count: mcqs.length, mcqs, diversityReport, confidence };
    });
}

module.exports = { buildMcqPrompt, generateAndStoreMCQs, enforceMCQDiversity, EXEMPLAR_MCQS };
