/**
 * Build a prompt that extracts a fully structured synopsis from a single article.
 * Returns JSON matching the ArticleSynopsis schema.
 * Temperature should be 0.15 — pure factual extraction, no invention.
 *
 * @param {{ title: string; abstract?: string; pubtype?: string[]; pubdate?: string; journal?: string; authors?: {name:string}[]; doi?: string }} article
 */
function buildSynopsisPrompt(article) {
    const year = article.pubdate ? article.pubdate.slice(0, 4) : 'unknown';
    const authors = (article.authors || []).slice(0, 3).map((a) => a.name).join(', ');
    const pubtypes = (article.pubtype || []).join(', ') || 'Not specified';

    // Build full-text block when available (same section order as synthesis prompt)
    let fullTextBlock = '';
    if (article._fullTextIndexed && article._fullTextSections) {
        const sections = article._fullTextSections;
        const ordered = ['methods', 'results', 'discussion', 'conclusion'];
        const parts = [];
        for (const key of ordered) {
            const text = sections[key];
            if (text && String(text).trim().length > 20) {
                parts.push(`${key.toUpperCase()}: ${String(text).slice(0, 1400)}`);
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
