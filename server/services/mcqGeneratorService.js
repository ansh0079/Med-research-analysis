const logger = require('../config/logger');
const { parseJsonArrayBlock } = require('../utils/parseJson');

function buildMcqPrompt(topic, knowledge) {
    const k = knowledge || {};
    const teachingPoints = (k.teachingPoints || []).map((tp, i) =>
        `${i + 1}. ${tp.claim || tp.text || ''}`
    ).join('\n');
    const mcqAngles = (k.mcqAngles || []).join('; ');

    return `Generate 5 MCQs about "${topic}" for final-year medical students.

TOPIC KNOWLEDGE: ${k.mentorMessage || ''}
KEY TEACHING POINTS:
${teachingPoints || 'General knowledge'}
MCQ ANGLES: ${mcqAngles || 'Mixed'}

Rules:
- Mix types: recall, clinical_application, guideline, pitfall
- Mix difficulty: 2 easy, 2 medium, 1 hard
- Clinical vignettes: include age, sex, presenting complaint
- 4 options (A-D), exactly one correct
- Do NOT invent drug doses not in the teaching points

Start your response with [ and end with ]. No markdown. No explanation outside the JSON.
[{"type":"multiple_choice","questionType":"recall|clinical_application|guideline|pitfall","question":"...","options":["A: ...","B: ...","C: ...","D: ..."],"correctAnswer":"A","explanation":"2-3 sentences","difficulty":"easy|medium|hard","sourceReference":null}]`;
}

async function generateAndStoreMCQs(db, ai, topic, knowledge, { provider = 'gemini', model = null } = {}) {
    const normalizedTopic = db.normalizeTopic(topic);
    const objectKey = `cold-start-mcq:${normalizedTopic.replace(/\s+/g, '-')}`;

    const existing = await db.getTeachingObjectByKey(objectKey).catch(() => null);
    if (existing?.payload?.mcqs?.length > 0) return { skipped: true, topic };

    const prompt = buildMcqPrompt(topic, knowledge);
    let raw;

    if (provider === 'gemini' && ai.callGemini) {
        raw = await ai.callGemini(prompt, model || undefined, { temperature: 0.4, maxOutputTokens: 2500 });
    } else if (ai.callClaude) {
        raw = await ai.callClaude(prompt, model || 'claude-haiku-4-5-20251001', { temperature: 0.4, maxOutputTokens: 2500 });
    } else {
        throw new Error('No AI provider available for MCQ generation');
    }

    const mcqs = parseJsonArrayBlock(raw);
    if (!Array.isArray(mcqs) || mcqs.length === 0) {
        throw new Error('Invalid MCQ JSON from AI');
    }

    await db.upsertTeachingObject({
        objectKey,
        objectType: 'cold_start_mcq',
        topic: normalizedTopic,
        title: `Cold-Start MCQs: ${topic}`,
        provider,
        model: model || provider,
        confidence: 0.65,
        generatedAt: new Date().toISOString(),
        payload: {
            kind: 'cold_start_mcq',
            topic,
            normalizedTopic,
            mcqs: mcqs.slice(0, 5),
            generatedAt: new Date().toISOString(),
            trainingStage: 'finals',
            difficulty: 'mixed',
        },
    });

    logger.info({ topic, count: mcqs.length }, 'Auto-generated MCQs for new topic');
    return { generated: true, topic, count: mcqs.length };
}

module.exports = { buildMcqPrompt, generateAndStoreMCQs };
