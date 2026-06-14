'use strict';

const STEP_SEQUENCE = ['presentation', 'investigation', 'management', 'complication', 'resolution'];

const MODE_GUIDANCE = {
    student: 'Target a medical student: test illness scripts, first principles, common differentials, core management steps.',
    resident: 'Target a junior doctor: test prioritisation, acute management, escalation decisions, evidence application.',
    specialist: 'Target a senior trainee: test nuanced phenotyping, guideline conflicts, advanced management controversies.',
    exam: 'Target exam preparation: test discriminators, classic pitfalls, high-yield exam topics.',
};

const DIFFICULTY_GUIDANCE = {
    easy: 'Classic textbook presentation. Each step should have a clearly best answer.',
    medium: 'Realistic presentation with some atypical features. Include plausible distractors.',
    hard: 'Atypical or complex multi-system presentation. Include subtle findings that change management.',
};

function buildEvidenceBlocks(guidelines, topicKnowledge, synopsis) {
    const guidelineBlock = (guidelines || []).length > 0
        ? `\nCLINICAL GUIDELINES (primary source — all management decisions MUST reference these):\n${guidelines.map((g, i) => {
            let line = `[G${i + 1}] ${g.source_body}`;
            if (g.source_year) line += ` (${g.source_year})`;
            line += `: ${g.recommendation_text}`;
            if (g.recommendation_strength) line += `\n     Strength: ${g.recommendation_strength}`;
            if (g.certainty_of_evidence) line += ` | Certainty: ${g.certainty_of_evidence}`;
            if (g.population) line += `\n     Population: ${g.population}`;
            if (g.cautions) line += `\n     Cautions: ${g.cautions}`;
            return line;
        }).join('\n\n')}`
        : '';

    let teachingBlock = '';
    const tk = topicKnowledge?.knowledge || topicKnowledge;
    if (tk) {
        const points = [];
        if (tk.coreTeachingPoints && tk.coreTeachingPoints.length > 0) {
            points.push(...tk.coreTeachingPoints.map((p, i) => {
                const text = p.text || p.claim || (typeof p === 'string' ? p : '');
                const src = p.sourceIndices ? ` [from papers ${p.sourceIndices.join(', ')}]` : '';
                return `  TP${i + 1}. ${text}${src}`;
            }));
        }
        if (tk.teachingPoints && tk.teachingPoints.length > 0 && (!tk.coreTeachingPoints || tk.coreTeachingPoints.length === 0)) {
            points.push(...tk.teachingPoints.slice(0, 15).map((p, i) => {
                const text = p.text || p.claim || (typeof p === 'string' ? p : '');
                return `  TP${i + 1}. ${text}`;
            }));
        }
        if (points.length > 0) {
            teachingBlock = `\nEVIDENCE-BASED TEACHING POINTS (extracted from seeded research papers):\n${points.join('\n')}`;
        }
        if (tk.mcqAngles && tk.mcqAngles.length > 0) {
            teachingBlock += `\n\nVALIDATED MCQ ANGLES:\n${tk.mcqAngles.slice(0, 8).map((a, i) => `  MA${i + 1}. ${a}`).join('\n')}`;
        }
    }

    let synopsisBlock = '';
    if (synopsis) {
        const synText = typeof synopsis === 'string' ? synopsis : synopsis.text || synopsis.synopsis || '';
        if (synText.length > 50) {
            synopsisBlock = `\nTOPIC SYNOPSIS:\n${synText.slice(0, 2000)}`;
        }
    }

    const hasEvidence = guidelineBlock || teachingBlock;
    const groundingRules = hasEvidence
        ? `- Every correct answer MUST be traceable to a guideline [Gn] or teaching point [TPn] listed above.
- Drug names, doses, thresholds, and investigation cut-offs must come from the provided guidelines or teaching points.
- In the explanation, cite which guideline or teaching point supports the answer (e.g. "Per G2, AHA 2023 recommends...").
- Do NOT introduce management approaches, drug interactions, or clinical facts not in the evidence base.`
        : `- No guidelines or teaching points were found. Use well-established clinical knowledge only. Flag this in the output.`;

    return { guidelineBlock, teachingBlock, synopsisBlock, groundingRules, hasEvidence };
}

/**
 * Build prompt for generating the INITIAL case step (step 1: presentation).
 * Returns the case scaffold (title, setting, patient demographics) plus step 1.
 */
function buildCaseInitPrompt(topic, guidelines, topicKnowledge, weaknesses, options = {}, synopsis = null) {
    const learningMode = options.learningMode || 'student';
    const difficulty = options.difficulty || 'medium';
    const modeText = MODE_GUIDANCE[learningMode] || MODE_GUIDANCE.student;
    const diffText = DIFFICULTY_GUIDANCE[difficulty] || DIFFICULTY_GUIDANCE.medium;

    let weaknessInstruction = '';
    if (weaknesses && weaknesses.length > 0) {
        const lines = weaknesses.map(w => `- ${w.type}: score ${w.score}%${w.detail ? ` (${w.detail})` : ''}`).join('\n');
        weaknessInstruction = `\nTARGETED WEAKNESSES — this learner struggles with:\n${lines}\nDesign later steps to probe these weak areas.`;
    }

    const { guidelineBlock, teachingBlock, synopsisBlock, groundingRules } = buildEvidenceBlocks(guidelines, topicKnowledge, synopsis);

    return `You are a clinical education case assembler. You construct clinical cases STRICTLY from the evidence base provided below. You do NOT invent clinical facts, drug doses, or management protocols from general knowledge.

TOPIC: ${topic}
LEARNING MODE: ${learningMode} — ${modeText}
DIFFICULTY: ${difficulty} — ${diffText}
${weaknessInstruction}
${guidelineBlock}
${teachingBlock}
${synopsisBlock}

STRICT EVIDENCE GROUNDING RULES:
${groundingRules}
- Lab values and vital signs should be realistic for the condition.
- Patient demographics should be epidemiologically appropriate.

You are generating step 1 of a 5-step branching clinical case. The full case will unfold step-by-step based on the learner's answers. You must establish the patient and setting now.

The 5 steps will be: presentation → investigation → management → complication → resolution.

Return ONLY valid JSON:
{
  "title": "Brief descriptive title (e.g. 'A 58-year-old woman with progressive dyspnoea')",
  "setting": "ED" | "Ward" | "Outpatient" | "ICU" | "GP",
  "patientProfile": "1-2 sentence summary of the patient for continuity (age, sex, key comorbidities)",
  "step": {
    "type": "presentation",
    "narrative": "Initial patient presentation with history, examination findings, and vitals. 3-5 sentences.",
    "question": "Single best answer question about the NEXT clinical step",
    "questionType": "clinical_application",
    "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
    "correctAnswer": "B",
    "explanation": "Why correct — cite guideline [Gn] or teaching point [TPn]. 2-3 sentences.",
    "whyOthersWrong": "Brief reason each wrong option is incorrect",
    "teachingPoint": "Key learning point from this step",
    "evidenceSource": "G2" or "TP4" or "G1, TP2"
  }
}

RULES:
- The narrative must be detailed and clinically realistic (specific vitals, exam findings).
- Do NOT include patient-identifying information.
- The question must be answerable from the information given.`;
}

/**
 * Build prompt for generating the NEXT step in a branching case.
 * Incorporates the learner's previous answer (correct or wrong) into the narrative.
 */
function buildCaseStepPrompt({ topic, stepIndex, stepType, caseHistory, userAnswer, wasCorrect, evidenceContext, options = {} }) {
    const learningMode = options.learningMode || 'student';
    const difficulty = options.difficulty || 'medium';
    const modeText = MODE_GUIDANCE[learningMode] || MODE_GUIDANCE.student;
    const diffText = DIFFICULTY_GUIDANCE[difficulty] || DIFFICULTY_GUIDANCE.medium;
    const isLastStep = stepIndex === 4;

    const { guidelineBlock, teachingBlock, synopsisBlock, groundingRules } = buildEvidenceBlocks(
        evidenceContext?.guidelines,
        evidenceContext?.topicKnowledge,
        evidenceContext?.synopsis
    );

    // Build the case history narrative
    const historyLines = caseHistory.map((h, i) => {
        const stepLabel = STEP_SEQUENCE[i] || `step${i + 1}`;
        let entry = `STEP ${i + 1} (${stepLabel}):\n  Narrative: ${h.narrative}\n  Question: ${h.question}`;
        entry += `\n  Correct answer: ${h.correctAnswer}`;
        entry += `\n  Learner answered: ${h.userAnswer}${h.wasCorrect ? ' ✓' : ' ✗'}`;
        if (!h.wasCorrect) {
            entry += `\n  → The learner chose INCORRECTLY. The next step must reflect consequences of this wrong choice.`;
        }
        return entry;
    }).join('\n\n');

    // Determine what question types haven't been used yet
    const usedTypes = new Set(caseHistory.map(h => h.questionType));
    let typeGuidance = '';
    if (!usedTypes.has('guideline') && stepIndex >= 2) {
        typeGuidance = '\nThis step SHOULD use questionType "guideline" (testing guideline-based decision making).';
    } else if (!usedTypes.has('pitfall') && stepIndex >= 3) {
        typeGuidance = '\nThis step SHOULD use questionType "pitfall" (testing a common clinical trap).';
    }

    const branchingInstruction = wasCorrect
        ? `The learner answered correctly ("${userAnswer}"). Continue the case as if the correct clinical action was taken. Show the expected results/progression.`
        : `The learner answered INCORRECTLY ("${userAnswer}" instead of the correct answer). The narrative MUST show realistic consequences of this wrong choice — delayed diagnosis, wrong investigation results, worsened patient status, or a near-miss. Then present a recovery question that tests whether the learner can course-correct. This is a key teaching moment.`;

    const stepTypeGuidance = {
        investigation: 'Show investigation results. Include specific lab values, imaging findings, or test results.',
        management: 'Present a management decision point. The clinical picture should evolve with new information.',
        complication: 'Introduce a complication, unexpected finding, or deterioration. Test adaptability.',
        resolution: 'Bring the case to a conclusion. Show patient outcome and final disposition. Include a reflective question.',
    }[stepType] || '';

    return `You are continuing a branching clinical case. You construct each step STRICTLY from the evidence base provided.

TOPIC: ${topic}
LEARNING MODE: ${learningMode} — ${modeText}
DIFFICULTY: ${difficulty} — ${diffText}
${guidelineBlock}
${teachingBlock}
${synopsisBlock}

STRICT EVIDENCE GROUNDING RULES:
${groundingRules}

CASE SO FAR:
Patient: ${caseHistory[0]?.patientProfile || 'See step 1 narrative'}

${historyLines}

GENERATING STEP ${stepIndex + 1} of 5 (${stepType}):
${branchingInstruction}

Step type guidance: ${stepTypeGuidance}
${typeGuidance}

Return ONLY valid JSON:
{
  "step": {
    "type": "${stepType}",
    "narrative": "What happens next — MUST reference the learner's previous answer and its consequences. 3-5 sentences with specific clinical details.",
    "question": "Single best answer question",
    "questionType": "clinical_application" | "recall" | "guideline" | "pitfall" | "trial_interpretation",
    "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
    "correctAnswer": "B",
    "explanation": "Why correct — cite guideline [Gn] or teaching point [TPn]. 2-3 sentences.",
    "whyOthersWrong": "Brief reason each wrong option is incorrect",
    "teachingPoint": "Key learning point",
    "evidenceSource": "G2" or "TP4" or "G1, TP2",
    "branchingNote": "How this step was influenced by the learner's previous ${wasCorrect ? 'correct' : 'incorrect'} answer"
  }${isLastStep ? `,
  "caseSummary": "2-3 sentence summary of the full case including how the learner's choices affected the outcome",
  "keyLearningPoints": ["3-5 learning points — each citing its evidence source"],
  "guidelinesApplied": ["Which guidelines [Gn] were tested and how"],
  "evidenceGaps": ["Any areas where the provided evidence was insufficient"]` : ''}
}

RULES:
- The narrative MUST build on the previous step and explicitly reference the learner's choice.
- If the learner was wrong, show consequences — don't just say "actually the right answer was X."
- Lab values, vital signs, and clinical details must be specific and realistic.
- Do NOT include patient-identifying information.`;
}

// Keep the legacy all-at-once prompt for backwards compatibility
function buildAdaptiveCasePrompt(topic, guidelines, topicKnowledge, weaknesses, options = {}, synopsis = null) {
    const learningMode = options.learningMode || 'student';
    const difficulty = options.difficulty || 'medium';
    const { guidelineBlock, teachingBlock, synopsisBlock, groundingRules } = buildEvidenceBlocks(guidelines, topicKnowledge, synopsis);
    const modeText = MODE_GUIDANCE[learningMode] || MODE_GUIDANCE.student;
    const diffText = DIFFICULTY_GUIDANCE[difficulty] || DIFFICULTY_GUIDANCE.medium;

    let weaknessInstruction = '';
    if (weaknesses && weaknesses.length > 0) {
        const lines = weaknesses.map(w => `- ${w.type}: score ${w.score}%${w.detail ? ` (${w.detail})` : ''}`).join('\n');
        weaknessInstruction = `\nTARGETED WEAKNESSES:\n${lines}\nDesign steps 2-5 to probe these weak areas.`;
    }

    return `You are a clinical education case assembler. You construct clinical cases STRICTLY from the evidence base provided below. You do NOT invent clinical facts, drug doses, investigation thresholds, or management protocols from general knowledge.

TOPIC: ${topic}
LEARNING MODE: ${learningMode} — ${modeText}
DIFFICULTY: ${difficulty} — ${diffText}
${weaknessInstruction}
${guidelineBlock}
${teachingBlock}
${synopsisBlock}

STRICT EVIDENCE GROUNDING RULES:
${groundingRules}
- Lab values and vital signs should be realistic for the condition.
- Patient demographics should be epidemiologically appropriate.

Generate a realistic clinical case with EXACTLY 5 sequential steps. The case must be a single coherent patient journey.

Return ONLY valid JSON:
{
  "title": "Brief descriptive title",
  "setting": "ED" | "Ward" | "Outpatient" | "ICU" | "GP",
  "steps": [
    {
      "type": "presentation",
      "narrative": "Initial patient presentation. 3-5 sentences.",
      "question": "Single best answer question",
      "questionType": "clinical_application",
      "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
      "correctAnswer": "B",
      "explanation": "Why correct — cite [Gn] or [TPn]. 2-3 sentences.",
      "whyOthersWrong": "Brief reason each wrong option is incorrect",
      "teachingPoint": "Key learning point",
      "evidenceSource": "G2" or "TP4"
    },
    { "type": "investigation", ... },
    { "type": "management", ... },
    { "type": "complication", ... },
    { "type": "resolution", ... }
  ],
  "caseSummary": "2-3 sentence summary",
  "keyLearningPoints": ["3-5 learning points citing evidence sources"],
  "guidelinesApplied": ["Which guidelines were tested"],
  "evidenceGaps": ["Areas where evidence was insufficient"]
}

RULES:
- Each step's narrative MUST build on the previous step.
- Question types should vary across the 5 steps.
- At least one step must test guideline knowledge (questionType: "guideline").
- At least one step must include a common pitfall (questionType: "pitfall").
- Every explanation must cite its source from the evidence base.
- Do NOT include patient-identifying information.`;
}

module.exports = { buildAdaptiveCasePrompt, buildCaseInitPrompt, buildCaseStepPrompt, STEP_SEQUENCE };
