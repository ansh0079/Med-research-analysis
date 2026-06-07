/**
 * Build a prompt that extracts a fully structured synopsis from a single article.
 * Returns JSON matching the ArticleSynopsis schema.
 * Temperature should be 0.15 — pure factual extraction, no invention.
 *
 * @param {{ title: string; abstract?: string; pubtype?: string[]; pubdate?: string; journal?: string; authors?: {name:string}[]; doi?: string }} article
 * @param {{ topic?: string; guidelines?: object[]; topicKnowledge?: object|null; trainingStage?: string }} [context]
 */

const SYNOPSIS_STAGE_RUBRIC = {
    preclinical: `AUDIENCE: Pre-clinical student. Emphasise mechanism and pathophysiology over clinical decision detail. Frame findings in terms of drug class effects and basic science concepts.`,
    early_clinical: `AUDIENCE: Early clinical student / clerk. Prioritise illness scripts, diagnostic criteria, and first-line management. Moderate clinical depth — explain abbreviations.`,
    finals: `AUDIENCE: Finals / exit exam candidate. Prioritise discriminators, guideline-aligned first-line answers, contraindications, and common exam pitfalls. Use precise numerical values.`,
    foundation_doctor: `AUDIENCE: Foundation doctor / intern. Emphasis on safe prescribing, monitoring parameters, escalation thresholds, drug interactions, and acute ward management decisions.`,
};

const SYNOPSIS_STAGE_STRUCTURE = {
    preclinical: `STRUCTURE: Emphasise background, mechanism, mainFindings, clinicalMeaning, and quizFocusPoints. Keep practiceImplication brief and set operational fields such as setting, inclusionCriteria, exclusionCriteria, and safetyOutcomes to null/[] when they are not explicitly useful from the article.`,
    early_clinical: `STRUCTURE: Emphasise clinicalQuestion, population, outcomes, mainFindings, clinicalMeaning, limitations, and quizFocusPoints. Include methods fields only when they change interpretation.`,
    finals: `STRUCTURE: Emphasise primaryOutcome, mainFindings, safetyOutcomes, weaknesses, bottomLine, whatNotToOverclaim, and exam-relevant quizFocusPoints. Preserve numbers and clinical discriminators.`,
    foundation_doctor: `STRUCTURE: Emphasise safetyOutcomes, practiceImplication, limitations, bottomLine, trustRationale, and whatNotToOverclaim. Omit low-yield educational lists when unsupported rather than padding them.`,
};

const {
    buildGuidelineContextBlock,
    buildTopicKnowledgeBlock,
    safeText,
} = require('./contextBuilders');

function formatCollectiveMemoryBlock(topicKnowledge) {
    const collective = topicKnowledge?.knowledge?.collective_memory;
    if (!collective || !collective.uniqueUsers) return '';
    const lines = [];
    const tooHard = Array.isArray(collective.tooHard) ? collective.tooHard.slice(0, 4) : [];
    const highDisc = Array.isArray(collective.highDiscrimination) ? collective.highDiscrimination.slice(0, 4) : [];
    const sharedMis = Array.isArray(collective.sharedMisconceptions) ? collective.sharedMisconceptions.slice(0, 4) : [];
    if (tooHard.length > 0) {
        lines.push(`Learners commonly struggle with: ${tooHard.map((q) => safeText(q.questionText || q.conceptHash, 120)).join('; ')}`);
    }
    if (highDisc.length > 0) {
        lines.push(`High-discrimination concepts worth emphasizing: ${highDisc.map((q) => safeText(q.questionText || q.conceptHash, 120)).join('; ')}`);
    }
    if (sharedMis.length > 0) {
        lines.push(`Frequent wrong answers across learners: ${sharedMis.map((m) => safeText(m.wrongAnswer || m.questionText, 100)).join('; ')}`);
    }
    return lines.join('\n');
}

function formatTopicKnowledge(topicKnowledge) {
    if (!topicKnowledge) return '';
    const knowledge = topicKnowledge.knowledge || topicKnowledge.mentorMessage || topicKnowledge.summary || '';
    const sourceArticles = Array.isArray(topicKnowledge.sourceArticles)
        ? topicKnowledge.sourceArticles.slice(0, 6).map((a) => safeText(a, 160)).filter(Boolean)
        : [];
    const lines = [];
    if (knowledge && typeof knowledge === 'object') {
        const teachingPoints = Array.isArray(knowledge.teachingPoints) ? knowledge.teachingPoints.slice(0, 6) : [];
        if (teachingPoints.length > 0) lines.push(safeText(teachingPoints.join('; '), 2200));
    } else if (knowledge) {
        lines.push(safeText(knowledge, 2200));
    }
    const collectiveBlock = formatCollectiveMemoryBlock(topicKnowledge);
    if (collectiveBlock) lines.push(collectiveBlock);
    if (sourceArticles.length > 0) lines.push(`Seminal/context papers: ${sourceArticles.join('; ')}`);
    return lines.join('\n');
}

function formatSynopsisFeedbackStats(stats) {
    if (!stats) return '';
    const helpful = Number(stats.helpful || 0);
    const notHelpful = Number(stats.notHelpful || 0);
    if (!helpful && !notHelpful) return '';
    const reasons = Array.isArray(stats.recentReasons)
        ? stats.recentReasons.map((r) => safeText(r, 120)).filter(Boolean).slice(0, 4)
        : [];
    return [
        `Prior user quality signals for this article synopsis: ${helpful} helpful, ${notHelpful} not helpful.`,
        reasons.length > 0 ? `Recent critique themes: ${reasons.join('; ')}` : '',
        notHelpful > helpful ? 'Adjust by being more concrete, conservative, and explicit about uncertainty; do not over-expand unsupported fields.' : '',
    ].filter(Boolean).join('\n');
}

function formatExplanationPreferences(preferences) {
    if (!preferences || typeof preferences !== 'object') return '';
    const lines = [];
    if (preferences.vocabulary === 'layperson') {
        lines.push('Use plain language; avoid unexplained jargon and abbreviations.');
    } else if (preferences.vocabulary === 'technical') {
        lines.push('Use precise clinical terminology appropriate for a specialist reader.');
    }
    if (preferences.prefersAnalogies) {
        lines.push('Include one brief analogy or mental model when it clarifies mechanism or decision logic.');
    }
    if (preferences.needsMoreExamples) {
        lines.push('Ground abstract points with a concrete clinical example when supported by the paper.');
    }
    if (preferences.preferredExplanationLength === 'brief') {
        lines.push('Keep each narrative field concise — prefer short sentences over exhaustive lists.');
    } else if (preferences.preferredExplanationLength === 'detailed') {
        lines.push('Provide fuller context in background, clinicalMeaning, and limitations when the paper supports it.');
    }
    if (lines.length === 0) return '';
    return [
        'LEARNER EXPLANATION PREFERENCES (from prior tutor interactions — adjust tone and structure only; never invent evidence):',
        ...lines.map((line) => `- ${line}`),
    ].join('\n');
}

function buildSynopsisPrompt(article, context = {}) {
    const year = article.pubdate ? article.pubdate.slice(0, 4) : 'unknown';
    const authors = (article.authors || []).slice(0, 3).map((a) => a.name).join(', ');
    const pubtypes = (article.pubtype || []).join(', ') || 'Not specified';
    const guidelines = Array.isArray(context.guidelines) ? context.guidelines.slice(0, 4) : [];
    const topicKnowledgeText = formatTopicKnowledge(context.topicKnowledge)
        || buildTopicKnowledgeBlock(context.topicKnowledge);
    const validStages = ['preclinical', 'early_clinical', 'finals', 'foundation_doctor'];
    const trainingStage = validStages.includes(context.trainingStage) ? context.trainingStage : null;
    const stageInstruction = trainingStage ? `\n${SYNOPSIS_STAGE_RUBRIC[trainingStage]}\n${SYNOPSIS_STAGE_STRUCTURE[trainingStage]}\n` : '';
    const feedbackText = formatSynopsisFeedbackStats(context.synopsisFeedbackStats);
    const explanationPreferencesText = formatExplanationPreferences(context.explanationPreferences);

    // Build full-text block when available (same section order as synthesis prompt)
    let fullTextBlock = '';
    if (article._fullTextIndexed && article._fullTextSections) {
        const sections = article._fullTextSections;
        const ordered = ['methods', 'results', 'discussion', 'conclusion'];
        const parts = [];
        const sectionLimits = { methods: 5000, results: 8000, discussion: 5000, conclusion: 3000 };
        for (const key of ordered) {
            const text = sections[key];
            if (text && String(text).trim().length > 20) {
                parts.push(`${key.toUpperCase()}: ${String(text).slice(0, sectionLimits[key] || 4000)}`);
            }
        }
        if (parts.length > 0) {
            fullTextBlock = `\n\nFull-text excerpts (${article._fullTextWordCount || '?'} words indexed):\n${parts.join('\n')}`;
        }
    }

    const sourceNote = fullTextBlock
        ? 'You have access to both the abstract AND full-text sections below. Prefer full-text data for numerical results, methods detail, and safety outcomes.'
        : 'ONLY use information present in the title, abstract, and metadata below. Do NOT invent, infer, or embellish anything not stated.';

    return `You are a medical research assistant producing a rapid critical-appraisal synopsis for a doctor.
Style target: a concise "The Bottom Line"-style appraisal, not a generic abstract summary.
${stageInstruction}
${sourceNote}
If a field cannot be determined, use null or [].

Article metadata:
Title: ${article.title}
Year: ${year}
Journal: ${article.journal || 'Unknown'}
Authors: ${authors || 'Unknown'}
Study type (pubtype): ${pubtypes}
DOI: ${article.doi || 'Not available'}

Abstract:
${article.abstract || '[No abstract available — extract what you can from the title alone]'}${fullTextBlock}

${guidelines.length > 0 ? `Guideline context for orientation (do not treat as this paper's findings; use it only to frame applicability and practice implications):
${buildGuidelineContextBlock(guidelines, { variant: 'synopsis' })}` : ''}

${topicKnowledgeText ? `Curated topic knowledge for orientation (do not cite as study evidence unless also supported by the article):
${topicKnowledgeText}` : ''}

${feedbackText ? `Synopsis quality feedback from previous users (use only to improve style/emphasis; do not treat it as evidence):
${feedbackText}` : ''}

${explanationPreferencesText ? `${explanationPreferencesText}\n` : ''}

Return a single JSON object with EXACTLY these fields:

{
  "takeaway": "One sentence: the most important practical finding",
  "clinicalQuestion": "The clinical question in PICO-style wording",
  "background": "1-3 short sentences explaining why this study matters clinically",
  "studyDesign": "e.g. Randomised controlled trial | Systematic review | Cohort study | Case-control | Cross-sectional | Review | Other",
  "setting": "Where and when the study was done, centres/countries if stated",
  "population": "Who was studied - age range, condition, setting, n=",
  "inclusionCriteria": ["key inclusion criterion", "second inclusion criterion"],
  "exclusionCriteria": ["key exclusion criterion", "second exclusion criterion"],
  "intervention": "What was given or done (if applicable)",
  "comparator": "What it was compared against (null if not applicable)",
  "primaryOutcome": "Primary outcome and headline result, with numbers if reported",
  "secondaryOutcomes": ["secondary outcome result", "second secondary result"],
  "safetyOutcomes": ["adverse event or safety signal", "second safety signal"],
  "outcomes": "Primary and secondary outcomes measured",
  "mainFindings": "Key numerical results with effect sizes, confidence intervals, and p-values if reported",
  "authorsConclusion": "Authors' conclusion, clearly labelled as authors' view",
  "strengths": ["methodological strength", "second strength"],
  "weaknesses": ["methodological weakness", "second weakness"],
  "clinicalMeaning": "What these findings mean for clinical practice or research - one to three cautious sentences",
  "limitations": "Key methodological weaknesses or applicability limits in 1-2 sentences",
  "bottomLine": "A direct clinical appraisal verdict: what a clinician should take from this paper",
  "practiceImplication": "What this should or should not change in practice, if supported",
  "whatNotToOverclaim": ["unsupported claim to avoid", "second overclaim to avoid"],
  "quizFocusPoints": ["concept to quiz the doctor on", "second quiz focus"],
  "trustRating": "HIGH | MODERATE | LOW | VERY_LOW",
  "trustRationale": "One sentence explaining the trust rating based on study design, sample size, and risk of bias"
}

Rules:
- Be especially careful not to turn a neutral result into a positive recommendation.
- If the study is underpowered, stopped early, highly selected, open-label, industry-funded, or has safety concerns, mention that under weaknesses/safety/practice implication if stated.
- If guideline or topic context is supplied, use it to explain clinicalMeaning/practiceImplication and conflicts with current practice, but keep all study results grounded in the article text.
- The bottomLine should be clinically useful and conservative.
- Return ONLY the JSON object. No markdown, no preamble.`;
}

/**
 * Journal club pack for a topic + small evidence bundle (doctor-facing teaching).
 */
function buildJournalClubPrompt(articles, topic, memoryContext = '') {
    const context = (articles || [])
        .slice(0, 8)
        .map((a, i) => {
            const year = a.pubdate?.split(' ')[0] || a.year || 'unknown';
            return `[${i + 1}] ${a.title}\n${year} · ${a.source || a.journal || ''}\n${(a.abstract || '').slice(0, 900)}`;
        })
        .join('\n\n');
    return `You are facilitating a hospital journal club for practising clinicians on: "${topic}".

Studies:
${context}
${memoryContext ? `\nStored teaching memory for this topic:\n${memoryContext}\n` : ''}

Return ONLY valid JSON (no markdown):
{
  "fiveMinuteBrief": "≤120 words: hook, why this matters now, what was done, bottom line [1]",
  "pico": { "population": "", "intervention": "", "comparator": "", "outcome": "" },
  "methodsCritique": "Risk of bias, equipoise, blinding, power, stopping, funding — cite [n]",
  "applicability": "Who this applies to / who it skips — cite [n]",
  "controversy": "What reasonable experts still dispute or what guidelines disagree on",
  "vivaQuestions": ["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"],
  "practiceStatement": "One sentence: conditional practice recommendation or 'not ready to change practice' with [n]"
}

Rules:
- Every clinical sentence must include [sourceIndex] citations from brackets above.
- Stored teaching memory may guide emphasis and question selection, but do not cite it as evidence unless the same point is supported by a numbered study above.
- If evidence conflicts, say so.
- vivaQuestions should be answerable from the supplied abstracts.`;
}

module.exports = { buildSynopsisPrompt, buildJournalClubPrompt };
