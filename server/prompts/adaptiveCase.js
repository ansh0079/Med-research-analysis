'use strict';

function buildAdaptiveCasePrompt(topic, guidelines, topicKnowledge, weaknesses, options = {}, synopsis = null) {
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
        weaknessInstruction = `\nTARGETED WEAKNESSES — this learner struggles with:\n${lines}\nDesign steps 2-5 to specifically probe these weak areas.`;
    }

    // Build evidence base from guidelines
    const guidelineBlock = (guidelines || []).length > 0
        ? `\nCLINICAL GUIDELINES (your primary source — all management decisions MUST reference these):\n${guidelines.map((g, i) => {
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

    // Build evidence base from topic knowledge (teaching points from actual papers)
    let teachingBlock = '';
    const tk = topicKnowledge?.knowledge;
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
            teachingBlock += `\n\nVALIDATED MCQ ANGLES (known high-yield testing angles for this topic):\n${tk.mcqAngles.slice(0, 8).map((a, i) => `  MA${i + 1}. ${a}`).join('\n')}`;
        }

        if (tk.sourceArticles && tk.sourceArticles.length > 0) {
            teachingBlock += `\n\nSOURCE PAPERS:\n${tk.sourceArticles.slice(0, 10).map((a, i) => `  [${i + 1}] ${a.title}`).join('\n')}`;
        }
    }

    // Synopsis context
    let synopsisBlock = '';
    if (synopsis) {
        const synText = typeof synopsis === 'string' ? synopsis : synopsis.text || synopsis.synopsis || '';
        if (synText.length > 50) {
            synopsisBlock = `\nTOPIC SYNOPSIS (evidence-based summary from seeded papers):\n${synText.slice(0, 2000)}`;
        }
    }

    const hasEvidence = guidelineBlock || teachingBlock;

    return `You are a clinical education case assembler. You construct clinical cases STRICTLY from the evidence base provided below. You do NOT invent clinical facts, drug doses, investigation thresholds, or management protocols from general knowledge.

TOPIC: ${topic}
LEARNING MODE: ${learningMode} — ${modeGuidance}
DIFFICULTY: ${difficulty} — ${difficultyGuidance}
${weaknessInstruction}
${guidelineBlock}
${teachingBlock}
${synopsisBlock}

STRICT EVIDENCE GROUNDING RULES:
${hasEvidence ? `- Every correct answer MUST be traceable to a guideline [Gn] or teaching point [TPn] listed above.
- Drug names, doses, thresholds, and investigation cut-offs must come from the provided guidelines or teaching points. If a specific value is not in the evidence base, use the guideline recommendation without inventing a number.
- In the explanation for each step, cite which guideline or teaching point supports the answer (e.g. "Per G2, AHA 2023 recommends..." or "As per TP4...").
- Do NOT introduce management approaches, drug interactions, or clinical facts not present in the evidence base above.` : `- No guidelines or teaching points were found for this topic. Generate a case using well-established clinical knowledge only. Flag in the caseSummary that this case lacks specific evidence grounding.`}
- Lab values and vital signs in the narrative should be realistic for the condition.
- Patient demographics should be epidemiologically appropriate for the topic.

Generate a realistic clinical case with EXACTLY 5 sequential steps. The case must be a single coherent patient journey.

Return ONLY valid JSON:
{
  "title": "Brief descriptive title (e.g. 'A 58-year-old woman with progressive dyspnoea')",
  "setting": "ED" | "Ward" | "Outpatient" | "ICU" | "GP",
  "steps": [
    {
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
    },
    {
      "type": "investigation",
      "narrative": "Investigation results revealed by the previous step's correct action. Specific values.",
      "question": "...", "questionType": "...", "options": [...], "correctAnswer": "...",
      "explanation": "...", "whyOthersWrong": "...", "teachingPoint": "...", "evidenceSource": "..."
    },
    {
      "type": "management",
      "narrative": "Clinical picture evolves. New information or decision point.",
      "question": "...", "questionType": "...", "options": [...], "correctAnswer": "...",
      "explanation": "...", "whyOthersWrong": "...", "teachingPoint": "...", "evidenceSource": "..."
    },
    {
      "type": "complication",
      "narrative": "Complication or unexpected finding. Tests adaptability.",
      "question": "...", "questionType": "...", "options": [...], "correctAnswer": "...",
      "explanation": "...", "whyOthersWrong": "...", "teachingPoint": "...", "evidenceSource": "..."
    },
    {
      "type": "resolution",
      "narrative": "Case resolution with outcome.",
      "question": "...", "questionType": "...", "options": [...], "correctAnswer": "...",
      "explanation": "...", "whyOthersWrong": "...", "teachingPoint": "...", "evidenceSource": "..."
    }
  ],
  "caseSummary": "2-3 sentence summary of the full case",
  "keyLearningPoints": ["3-5 learning points — each citing its evidence source"],
  "guidelinesApplied": ["Which guidelines [Gn] were tested and how"],
  "evidenceGaps": ["Any areas where the provided evidence was insufficient and general knowledge was used"]
}

RULES:
- Each step's narrative MUST build on the previous step.
- Question types should vary across the 5 steps.
- At least one step must test guideline knowledge (questionType: "guideline").
- At least one step must include a common pitfall (questionType: "pitfall").
- Every explanation must cite its source from the evidence base.
- Do NOT include patient-identifying information.`;
}

module.exports = { buildAdaptiveCasePrompt };
