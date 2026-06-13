'use strict';

function buildAdaptiveCasePrompt(topic, guidelines, topicKnowledge, weaknesses, options = {}) {
    const learningMode = options.learningMode || 'student';
    const difficulty = options.difficulty || 'medium';

    const modeGuidance = {
        student: 'Target a medical student: test illness scripts, first principles, common differentials, core management steps.',
        resident: 'Target a junior doctor: test prioritisation, acute management, escalation decisions, evidence application.',
        specialist: 'Target a senior trainee: test nuanced phenotyping, guideline conflicts, advanced management controversies.',
        exam: 'Target exam preparation: test discriminators, classic pitfalls, high-yield exam topics.',
    }[learningMode] || 'Target a medical student.';

    const difficultyGuidance = {
        easy: 'Classic textbook presentation. Each step should have a clearly best answer.',
        medium: 'Realistic presentation with some atypical features. Include plausible distractors.',
        hard: 'Atypical or complex multi-system presentation. Include subtle findings that change management.',
    }[difficulty] || 'Realistic presentation with plausible distractors.';

    let weaknessInstruction = '';
    if (weaknesses && weaknesses.length > 0) {
        const lines = weaknesses.map(w => `- ${w.type}: score ${w.score}%${w.detail ? ` (${w.detail})` : ''}`).join('\n');
        weaknessInstruction = `\nTARGETED WEAKNESSES — this learner struggles with:\n${lines}\nDesign steps 2-5 to specifically probe these weak areas. If the learner is weak on guidelines, include a step requiring guideline-based decision making. If weak on clinical application, include a management decision step.`;
    }

    const guidelineContext = (guidelines || []).length > 0
        ? guidelines.map((g, i) => `[G${i + 1}] ${g.source_body}${g.source_year ? ` ${g.source_year}` : ''}: ${g.recommendation_text}${g.recommendation_strength ? ` (${g.recommendation_strength})` : ''}`).join('\n')
        : '';

    const knowledgeContext = topicKnowledge?.knowledge?.coreTeachingPoints
        ? `\nCORE TEACHING POINTS:\n${topicKnowledge.knowledge.coreTeachingPoints.map((p, i) => `${i + 1}. ${p.text || p.claim || p}`).join('\n')}`
        : '';

    return `You are a clinical education expert creating a multi-step branching clinical case for medical learners.

TOPIC: ${topic}
LEARNING MODE: ${learningMode} — ${modeGuidance}
DIFFICULTY: ${difficulty} — ${difficultyGuidance}
${weaknessInstruction}
${guidelineContext ? `\nCLINICAL GUIDELINES:\n${guidelineContext}` : ''}
${knowledgeContext}

Generate a realistic clinical case with EXACTLY 5 sequential steps. The case must be a single coherent patient journey where each step reveals new information based on the previous step.

Return ONLY valid JSON:
{
  "title": "Brief descriptive title (e.g. 'A 58-year-old woman with progressive dyspnoea')",
  "setting": "ED" | "Ward" | "Outpatient" | "ICU" | "GP",
  "steps": [
    {
      "type": "presentation",
      "narrative": "Initial patient presentation with history, examination findings, and vitals. Include salient positives AND negatives. 3-5 sentences, realistic and specific.",
      "question": "Single best answer question about the NEXT clinical step",
      "questionType": "clinical_application",
      "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
      "correctAnswer": "B",
      "explanation": "Why this is correct, referencing the clinical findings. 2-3 sentences.",
      "whyOthersWrong": "Brief reason each wrong option is incorrect",
      "teachingPoint": "One key learning point from this step"
    },
    {
      "type": "investigation",
      "narrative": "Investigation results (bloods, imaging, ECG, etc.) revealed by the previous step's correct action. Be specific with values.",
      "question": "...",
      "questionType": "recall" | "clinical_application" | "trial_interpretation" | "guideline" | "pitfall",
      "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
      "correctAnswer": "...",
      "explanation": "...",
      "whyOthersWrong": "...",
      "teachingPoint": "..."
    },
    {
      "type": "management",
      "narrative": "The clinical picture evolves based on investigation results. New information or a complication emerges.",
      "question": "...",
      "questionType": "...",
      "options": [...],
      "correctAnswer": "...",
      "explanation": "...",
      "whyOthersWrong": "...",
      "teachingPoint": "..."
    },
    {
      "type": "complication",
      "narrative": "A complication, unexpected finding, or management decision point. Tests the learner's ability to adapt.",
      "question": "...",
      "questionType": "...",
      "options": [...],
      "correctAnswer": "...",
      "explanation": "...",
      "whyOthersWrong": "...",
      "teachingPoint": "..."
    },
    {
      "type": "resolution",
      "narrative": "Case resolution with outcome. Final teaching moment.",
      "question": "...",
      "questionType": "...",
      "options": [...],
      "correctAnswer": "...",
      "explanation": "...",
      "whyOthersWrong": "...",
      "teachingPoint": "..."
    }
  ],
  "caseSummary": "2-3 sentence summary of the full case for review after completion",
  "keyLearningPoints": ["3-5 high-yield learning points from this case"],
  "guidelinesApplied": ["Which guidelines were relevant and how — reference G1, G2 etc if guidelines provided"]
}

RULES:
- The narrative for each step MUST build on the previous step. Step 2 should reference the action taken in step 1.
- Use realistic lab values, vital signs, and imaging findings — not generic placeholders.
- Each step's question must be answerable from the information given up to that point.
- Question types should vary across steps (don't use clinical_application for all 5).
- At least one step should test guideline knowledge if guidelines are provided.
- At least one step should include a common pitfall or trap.
- All drug doses, investigation values, and clinical details must be medically accurate.
- Patient demographics and presentation must be realistic for the topic.
- Do NOT include patient-identifying information.`;
}

module.exports = { buildAdaptiveCasePrompt };
