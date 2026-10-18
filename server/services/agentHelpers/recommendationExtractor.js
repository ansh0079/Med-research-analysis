'use strict';

// Pulls recommendation-style sentences out of a stored full text, verbatim. No model is involved, so
// nothing is paraphrased or invented. Stored full text is one flat run of words with no headings, so
// this works on sentences and cue phrases rather than on sections.

const CUES = [
    /\b(?:we|the (?:authors?|panel|committee|task force|working group|guideline|guidelines|experts?))\s+(?:strongly\s+|conditionally\s+|also\s+|therefore\s+)?(?:recommend|suggest|advise|propose)/i,
    /\b(?:is|are|was|were)\s+(?:strongly\s+|generally\s+|currently\s+)?(?:recommended|suggested|advised|indicated|contraindicated)\b/i,
    /\brecommendations?\s*\d*\s*[:.)]/i,
    /\b(?:should|must)\s+(?:be\s+)?(?:offered|given|considered|used|avoided|started|initiated|discontinued|screened|tested|monitored|referred|treated|performed|undergo|receive|not)\b/i,
    /\b(?:in conclusion|we conclude|conclusions?)\b[:,]?/i,
];

// Sentences that look like cues but state research agendas, caveats or study design.
const NOISE = /\b(?:future (?:studies|research|trials|work)|further (?:studies|research|trials|investigation)|more (?:research|studies|trials)|should be interpreted|limitations? of|this (?:study|review|meta-analysis) (?:was|were|has|had|did|aimed)|were (?:included|excluded|searched|screened|extracted)|we searched|informed consent|conflicts? of interest|funding|author contributions)\b/i;

// Front/back matter that is never a recommendation, even when it sits next to a conclusions marker.
const BOILERPLATE = /(?:\bkeywords?\s*:|\b(?:acknowledg(?:e)?ments?|display-pdf|status released|anthropic|chatgpt|large language model|data availability|supplementary (?:material|data)|leave-one-out|loo estimates|author contributions|institutional review board)\b)/i;

function splitSentences(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+(?=[A-Z0-9(])/)
        .map((s) => s.trim());
}

// Papers that state conclusions rather than formal recommendations: quote the few sentences that follow these markers.
const SECTION_MARKER = /^(?:conclusions?|conclusion and recommendations?|clinical implications?|implications for practice|practice points?|key points?|key messages?|recommendations?)\b[:\s-]*/i;

function extractRecommendationSentences(fullText, { max = 40, minChars = 45, maxChars = 420, afterMarker = 3 } = {}) {
    const seen = new Set();
    const out = [];
    const sentences = splitSentences(fullText);
    const picked = new Set();
    sentences.forEach((s, i) => {
        if (!SECTION_MARKER.test(s)) return;
        for (let k = 0; k < afterMarker && i + k < sentences.length; k++) picked.add(i + k);
    });
    for (let i = 0; i < sentences.length; i++) {
        const s = sentences[i];
        if (s.length < minChars || s.length > maxChars) continue;
        if (!picked.has(i) && !CUES.some((re) => re.test(s))) continue;
        if (BOILERPLATE.test(s)) continue;
        if (NOISE.test(s) && !picked.has(i)) continue;
        const key = s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 120);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(s);
        if (out.length >= max) break;
    }
    return out;
}

module.exports = { extractRecommendationSentences, splitSentences };
