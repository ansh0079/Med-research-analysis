'use strict';

/**
 * MCQ stem deduplication shared by importers and generators.
 *
 * Uses the same stopword-normalized stem identity as the question-bank audit
 * (scratch/full_live_db_audit.js), so "duplicate" here always means
 * "the audit would flag this as NEEDS_RETIRE::duplicate_stem".
 */

const STEM_STOPWORDS = new Set([
    'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but', 'his', 'from', 'they', 'say', 'her', 'she',
    'will', 'one', 'all', 'would', 'there', 'their', 'what', 'out', 'about', 'who', 'get', 'which', 'when', 'make', 'can',
    'like', 'time', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see',
    'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
    'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
    'patient', 'presents', 'years', 'year', 'old', 'history', 'examination', 'reveals', 'following', 'which', 'most',
    'likely', 'appropriate', 'management', 'diagnosis', 'treatment', 'initial', 'step', 'findings', 'shows', 'shown',
    'associated', 'presenting', 'assessed', 'considered', 'regarding', 'statement', 'best', 'correct', 'clinical',
]);

function normalizeMcqStem(question) {
    return String(question || '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STEM_STOPWORDS.has(w))
        .join(' ');
}

/**
 * Drop questions whose normalized stem already exists in `seen`
 * (or appear twice inside `mcqs` itself). First occurrence is kept.
 *
 * @param {Array} mcqs question objects with a `question`/`stem` field
 * @param {Set<string>} seen normalized stems already claimed (mutated)
 * @returns {{ kept: Array, removed: Array<{question: object, reason: string}> }}
 */
function dedupeMcqList(mcqs, seen = new Set()) {
    const kept = [];
    const removed = [];
    for (const m of mcqs || []) {
        const norm = normalizeMcqStem(m.question || m.stem || '');
        if (norm.length >= 8 && seen.has(norm)) {
            removed.push({ question: m, reason: 'duplicate_stem' });
            continue;
        }
        if (norm.length >= 8) seen.add(norm);
        kept.push(m);
    }
    return { kept, removed };
}

module.exports = { normalizeMcqStem, dedupeMcqList, STEM_STOPWORDS };
