const { formatMisconceptionPromptBlock } = require('../utils/misconceptionPromptBlock');

const SYNTHESIS_STAGE_RUBRIC = {
    preclinical: `AUDIENCE: Pre-clinical student. Frame the clinical bottom line in terms of mechanisms, pathophysiology, and basic pharmacology class effects. Avoid advanced clinical decision nuances.`,
    early_clinical: `AUDIENCE: Early clinical student / clerk. Emphasise illness scripts, initial management priorities, and discriminating features. Moderate clinical depth.`,
    finals: `AUDIENCE: Finals / exit exam candidate. Prioritise discriminators, first-line management, contraindications, guideline-anchored answers, and exam pitfalls.`,
    foundation_doctor: `AUDIENCE: Foundation doctor / intern. Emphasis on safe prescribing, escalation thresholds, referral criteria, drug interactions, and acute ward management decisions.`,
};

function buildSynthesisPrompt(articles, topic, guidelines = [], options = {}) {
    const validStages = ['preclinical', 'early_clinical', 'finals', 'foundation_doctor'];
    const trainingStage = validStages.includes(options.trainingStage) ? options.trainingStage : null;
    const stageInstruction = trainingStage ? `\n${SYNTHESIS_STAGE_RUBRIC[trainingStage]}\n` : '';
    const previousQueries = Array.isArray(options.previousQueries)
        ? options.previousQueries.map((q) => String(q || '').trim()).filter(Boolean).slice(-5)
        : [];
    const sessionDepth = typeof options.sessionDepth === 'number' ? options.sessionDepth : 0;

    // Deep session (≥4 prior searches on this topic): suppress intro, push to nuance
    const depthModeInstruction = sessionDepth >= 4
        ? `TRAJECTORY MODE — DEEP SESSION (${sessionDepth} prior searches on this topic):
- Skip all introductory or background framing. The learner already knows the basics.
- Focus exclusively on: subgroup contradictions, edge cases, practice-changing uncertainties, and findings that challenge conventional wisdom.
- Treat "conflicts", "uncertainties", and "researchGaps" as the primary payload — not "consensus" or "agreement".
- Expose methodological limitations and applicability gaps a non-expert would miss.
- Write as a peer-level evidence briefing, not a teaching intro.

`
        : sessionDepth >= 2
            ? `TRAJECTORY NOTE — returning learner (${sessionDepth} prior searches): omit obvious background; moderate clinical depth expected.

`
            : '';

    const trajectoryContext = previousQueries.length > 0
        ? `${depthModeInstruction}SESSION TRAJECTORY: The user previously explored: ${previousQueries.join(' -> ')}.
INSTRUCTION: Focus on the Knowledge Delta: highlight clinical nuances, subgroup findings, safety signals, or recent contradictions that were not covered in previous steps of this trajectory.
Do not repeat basic definitions if the user is deep into a research dive. Bridge the previous and current questions when they share physiology, population, intervention, outcome, or guideline logic.

`
        : depthModeInstruction;
    const context = articles
        .map((a, i) => {
            const citations = a.pmcrefcount ?? a.citationCount ?? 'unknown';
            const year = a.pubdate?.split(' ')[0] || a.year || 'unknown';
            const journal = a.source || a.journal || 'unknown';
            const studyType = a.pubtype?.[0] || 'Study';
            let fullTextBlock = '';
            if (a._fullTextIndexed && a._fullTextSections) {
                const sections = a._fullTextSections;
                const ordered = ['methods', 'results', 'discussion', 'conclusion'];
                const parts = [];
                for (const key of ordered) {
                    const text = sections[key];
                    if (text && String(text).trim().length > 20) {
                        parts.push(`${key.toUpperCase()}: ${String(text).slice(0, 1200)}`);
                    }
                }
                if (parts.length > 0) {
                    fullTextBlock = `\nFull-text excerpts (${a._fullTextWordCount || '?'} words total):\n${parts.join('\n')}`;
                }
            }
            return `[STUDY ${i + 1}]
Title: ${a.title}
Journal: ${journal} (${year})
Study type: ${studyType}
Citations: ${citations}
Abstract: ${a.abstract || 'No abstract provided.'}${fullTextBlock}`;
        })
        .join('\n\n');

    const guidelineContext = guidelines.length > 0
        ? guidelines.map((g, i) => `[GUIDELINE ${i + 1}]
Source: ${g.source_body}${g.source_region ? ` (${g.source_region})` : ''}${g.source_year ? ` — ${g.source_year}` : ''}
Recommendation: ${g.recommendation_text}${g.recommendation_strength ? `\nStrength: ${g.recommendation_strength}` : ''}${g.recommendation_certainty ? `\nCertainty: ${g.recommendation_certainty}` : ''}${g.population ? `\nPopulation: ${g.population}` : ''}${g.cautions ? `\nCautions: ${g.cautions}` : ''}`).join('\n\n')
        : 'No guideline context provided.';

    const misconceptionBlock = formatMisconceptionPromptBlock({
        personalMisconceptions: options.personalMisconceptions,
        inferredMisconceptions: options.inferredMisconceptions,
        style: 'synthesis',
    });

    return `${trajectoryContext}You are an expert medical research synthesiser with deep clinical knowledge. Analyse these ${articles.length} studies on the topic: "${topic}".${stageInstruction}${misconceptionBlock}

Critical provenance rule:
- Every clinical claim in overallAnswer, consensus, clinicalActionCard, clinicalBottomLine, clinicalImplications, keyFindings, limitations, researchGaps, practiceImpact (all string fields), evidenceDisagreement (all string fields and trial summaries), and paperContributions.practiceImpactNote must include inline study-index citations such as [1] or [1, 4], and guideline tags [G1] when appropriate.
- If a sentence cannot be tied to at least one supplied STUDY number, omit that sentence.
- Do not cite studies that do not directly support the claim.
- When guidelines and studies agree or conflict, explicitly note this and cite both with labels like "Study [1]" or "Guideline [G1]".

Evidence judgement (doctor-specific):
- Many apps hide tension between trials and guidelines. Do not smooth over real conflict — surface honest disagreement when the bundle supports it.
- Populate evidenceDisagreement and practiceImpact even when evidence is broadly aligned (use hasMaterialDisagreement=false and explain why discordance is limited).
- practiceImpact answers "should this change what I do on Monday morning?" for the bundle as a whole.
- Per-paper practiceImpactClass answers the same question for each individual study row.

Full-text advantage instruction:
- When a study includes "Full-text excerpts" below its abstract, prioritise those sections for: safety signals / adverse events, subgroup analyses, numerical results (NNT/NNH, absolute risk differences), and methodological limitations.
- Abstracts often omit harms and subgroup nuance — the full-text excerpts exist precisely to surface those signals.

STUDIES:
${context}

CLINICAL GUIDELINES:
${guidelineContext}

Return ONLY a valid JSON object matching this exact schema — no markdown, no explanation outside the JSON:

{
  "overallAnswer": "1-2 sentence direct answer to 'What does the evidence show for ${topic}?'",
  "consensus": "2-3 sentence summary of what the collective evidence shows",
  "agreement": ["Point all or most studies agree on", "Second agreed point"],
  "evidenceGrade": "HIGH" | "MODERATE" | "LOW" | "VERY_LOW",
  "gradeRationale": "1-2 sentences explaining the GRADE rating based on risk of bias, consistency, directness, precision",
  "keyFindings": [
    {
      "finding": "specific finding statement",
      "studyIndices": [1, 2],
      "strength": "strong" | "moderate" | "weak"
    }
  ],
  "conflicts": [
    {
      "description": "what is disputed",
      "studiesFor": [1],
      "studiesAgainst": [2]
    }
  ],
  "statistics": [
    {
      "metric": "NNT" | "NNH" | "HR" | "OR" | "RR" | "ARR" | "p-value" | "CI" | "other",
      "value": "e.g. 0.67 (95% CI 0.51–0.88)",
      "context": "what this number means clinically",
      "studyIndex": 1
    }
  ],
  "studyDesigns": {
    "metaAnalysis": 0,
    "rct": 0,
    "cohort": 0,
    "caseControl": 0,
    "crossSectional": 0,
    "caseReport": 0,
    "other": 0
  },
  "clinicalActionCard": {
    "recommendation": "One sentence: what a clinician should consider for typical patients, grounded in the evidence [1]. Phrase as clinical decision support, not patient-specific advice.",
    "certainty": "GRADE level in plain language — e.g. 'Moderate certainty — two consistent RCTs but limited to hospitalised adults'",
    "caveat": "Single most important restriction: population this evidence does not cover, or key contraindication — e.g. 'Does not apply to patients with eGFR <30 or severe hepatic impairment'"
  },
  "clinicalBottomLine": "1-2 sentence evidence summary for clinical discussion support, with inline citations [1].",
  "clinicalImplications": "Specific practice implications: what clinicians should consider changing or monitoring based on this evidence",
  "limitations": "key limitations of this body of evidence in 1-2 sentences",
  "researchGaps": "what studies are still needed in 1 sentence",
  "uncertainties": ["What remains unknown or contested", "Second uncertainty"],
  "safetySignals": [
    {
      "signal": "Adverse event or safety concern extracted from the evidence",
      "severity": "serious" | "moderate" | "mild",
      "studyIndices": [1],
      "context": "Incidence rate, comparator risk, or relevant subgroup if reported"
    }
  ],
  "paperContributions": [
    {
      "studyIndex": 1,
      "mainContribution": "What this specific study adds to the evidence base — one sentence",
      "strengthAdded": "strong" | "moderate" | "weak",
      "practiceImpactClass": "confirms_existing_practice" | "weakly_modifies_practice" | "practice_changing" | "hypothesis_generating_only" | "not_clinically_actionable_yet",
      "practiceImpactNote": "One sentence: how this paper should (or should not) change behaviour, with inline citations [1]"
    }
  ],
  "practiceImpact": {
    "classification": "confirms_existing_practice" | "weakly_modifies_practice" | "practice_changing" | "hypothesis_generating_only" | "not_clinically_actionable_yet",
    "mondayMorningLine": "Single sentence: what to do Monday morning for a typical appropriate patient, or why to wait — with citations [1] or [G1]",
    "rationale": "2-3 sentences tying classification to study design, consistency, and directness — with citations"
  },
  "evidenceDisagreement": {
    "hasMaterialDisagreement": true | false,
    "guidelineRecommendation": "What major guidelines recommend for this topic (use [G1], [G2] when guideline context exists; if no guidelines supplied, say so and anchor to strongest consensus studies [n])",
    "strongestSupportingTrial": {
      "studyIndex": 1,
      "summary": "The trial that most strongly supports the guideline-aligned position — one sentence with [n]"
    },
    "strongestContradictingTrial": {
      "studyIndex": null,
      "summary": "The trial or result that most clearly cuts against the main position; use null studyIndex only when no paper in the bundle opposes it, and explain with citations to the closest 'limiting' evidence [n]"
    },
    "populationsWhereFails": "Where the main recommendation may not apply (comorbidity, age, severity, care setting) — with citations",
    "whatWouldChangePractice": "Reflective prompt for the clinician: what further evidence OR patient-factor would shift management — 1-2 sentences with citations"
  },
  "followUpQuestions": [
    {
      "question": "Concise follow-up search question the user should explore next, derived from an unresolved conflict, uncertainty, or research gap in this evidence set",
      "rationale": "One sentence explaining what this question would reveal that the current evidence does not answer",
      "trigger": "conflict" | "uncertainty" | "gap" | "subgroup"
    }
  ]
}

Rules:
- studyIndices are 1-based integers referencing the STUDY numbers above
- Every clinical claim must include inline citations in square brackets using those same study indices.
- paperContributions must have one entry per study (all ${articles.length} studies), each including practiceImpactClass and practiceImpactNote
- practiceImpact.classification must be justified by the body of evidence (not by opinion)
- evidenceDisagreement: if hasMaterialDisagreement is false, strongestContradictingTrial.studyIndex may be null and summary should explain alignment or limited tension
- agreement and uncertainties should each have 2-4 bullet points
- followUpQuestions: generate exactly 2-4 questions. Draw each from a different source: conflicts, uncertainties, research gaps, or unexplored subgroups. Do not repeat questions. Questions must be phrased as search-friendly queries a clinician would type, not rhetorical prompts.
- Extract real statistics from abstracts; if none found leave statistics as []
- safetySignals: extract explicit adverse events, harms, or safety concerns from the studies. Use [] if none reported. Prioritise full-text excerpts when available — abstracts routinely omit harms data.
- If conflicts is empty use []
- evidenceGrade: HIGH = consistent RCTs/meta-analyses; MODERATE = some RCTs or consistent observational; LOW = observational/inconsistent; VERY_LOW = case reports/expert opinion
- Do not invent findings, effect sizes, guidelines, or citations. If a claim is not supported by one of the supplied studies, omit it.
- Be precise and clinically accurate`;
}

module.exports = { buildSynthesisPrompt };
