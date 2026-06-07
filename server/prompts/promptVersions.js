'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PROMPT_FILES = {
    synopsis: 'synopsis.js',
    synthesis: 'synthesis.js',
    quiz: 'quiz.js',
    knowledge: 'knowledge.js',
    analysis: 'analysis.js',
    case: 'case.js',
    teaching: 'teaching.js',
    pubmed_reformulation: '../services/unifiedEvidenceSearch.js',
    pico_decomposition: '../services/unifiedEvidenceSearch.js',
    pico_extraction: 'analysis.js',
};

const versionCache = new Map();

/**
 * SHA-256 hash (12 hex chars) of a prompt template source file.
 * Cache keys include this so template edits invalidate stale LLM output.
 */
function getPromptVersion(promptKey) {
    if (versionCache.has(promptKey)) return versionCache.get(promptKey);
    const rel = PROMPT_FILES[promptKey];
    if (!rel) {
        const fallback = crypto.createHash('sha256').update(String(promptKey)).digest('hex').slice(0, 12);
        versionCache.set(promptKey, fallback);
        return fallback;
    }
    const filePath = path.resolve(__dirname, rel);
    const content = fs.readFileSync(filePath, 'utf8');
    const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
    versionCache.set(promptKey, hash);
    return hash;
}

function clearPromptVersionCache() {
    versionCache.clear();
}

module.exports = { getPromptVersion, clearPromptVersionCache, PROMPT_FILES };
