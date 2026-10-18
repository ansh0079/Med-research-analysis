'use strict';

// Pick out, from the stored full text of a guideline, review or meta-analysis, every sentence that states
// something a clinician should do. The model sees numbered sentences and returns only numbers, so every
// stored recommendation is the paper's own wording; nothing can be paraphrased or invented. Any number
// that is not a real sentence is discarded.

const { splitSentences } = require('../agentHelpers/recommendationExtractor');

const PROMPT_VERSION = 'v1-index-only';
const BATCH_CHARS = 14000;
const MAX_SENTENCE_CHARS = 700;
const MIN_SENTENCE_CHARS = 30;

// Cut the reference list: anything after a long run of citation-looking text adds no recommendations.
function trimBackMatter(sentences) {
    for (let i = Math.floor(sentences.length * 0.6); i < sentences.length; i++) {
        const window = sentences.slice(i, i + 6).join(' ');
        const cites = (window.match(/\b(?:19|20)\d{2}\b[;:,.]?\s*\d+\s*[:(]\s*\d+/g) || []).length;
        if (cites >= 4) return sentences.slice(0, i);
    }
    return sentences;
}

function numberedBatches(sentences) {
    const batches = [];
    let cur = [];
    let size = 0;
    sentences.forEach((s, i) => {
        if (s.length < MIN_SENTENCE_CHARS || s.length > MAX_SENTENCE_CHARS) return;
        const line = `[${i}] ${s}`;
        if (size + line.length > BATCH_CHARS && cur.length) { batches.push(cur); cur = []; size = 0; }
        cur.push({ i, line });
        size += line.length + 1;
    });
    if (cur.length) batches.push(cur);
    return batches;
}

function buildPrompt(kind, title, batch) {
    return `You are selecting recommendations from the text of a ${kind}${title ? ` titled "${String(title).slice(0, 160)}"` : ''}.
Below are numbered sentences. Return the numbers of every sentence that states a clinical recommendation or an actionable conclusion: what clinicians should or should not do to diagnose, treat, monitor, prevent, refer or counsel, including conclusions that clearly imply a practice choice (for example "X reduced mortality and is a reasonable option for Y").

Do NOT select: background, definitions, methods, statistics without an action, descriptions of other studies, limitations, or calls for future research.
Select sentences exactly as numbered; do not rewrite anything. If a sentence is only part of a recommendation, still select it.

Return ONLY a JSON array of numbers, for example [12, 14, 40]. Return [] if none qualify.

${batch.map((b) => b.line).join('\n')}`;
}

function parseIndices(raw, allowed) {
    const m = String(raw || '').match(/\[[\s\S]*?\]/);
    if (!m) return [];
    let arr;
    try { arr = JSON.parse(m[0]); } catch { return []; }
    return [...new Set((Array.isArray(arr) ? arr : []).map((x) => Number(x)).filter((n) => Number.isInteger(n) && allowed.has(n)))];
}

// callModel(prompt) -> string. Returns [{ index, sentence }] in document order, deduplicated.
async function extractDocumentRecommendations({ fullText, kind = 'document', title = '', callModel, maxBatches = 12 }) {
    const sentences = trimBackMatter(splitSentences(fullText));
    const batches = numberedBatches(sentences).slice(0, maxBatches);
    const picked = new Set();
    for (const batch of batches) {
        const allowed = new Set(batch.map((b) => b.i));
        const raw = await callModel(buildPrompt(kind, title, batch));
        for (const n of parseIndices(raw, allowed)) picked.add(n);
    }
    const seen = new Set();
    const out = [];
    for (const i of [...picked].sort((a, b) => a - b)) {
        const key = sentences[i].toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 140);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ index: i, sentence: sentences[i] });
    }
    return { items: out, batches: batches.length, sentences: sentences.length };
}

module.exports = { PROMPT_VERSION, trimBackMatter, numberedBatches, buildPrompt, parseIndices, extractDocumentRecommendations };
