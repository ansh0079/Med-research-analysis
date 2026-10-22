'use strict';

const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('./topicSynonyms');
const { normalizeTopic } = require('./topicKey');

const CLINICAL_ANCHOR_TERMS = [
    'disease', 'disorder', 'syndrome', 'rhinitis', 'asthma', 'hepatitis', 'leukemia', 'leukaemia',
    'lymphoma', 'cancer', 'carcinoma', 'anaemia', 'anemia', 'infection', 'vasculitis', 'nephropathy',
    'retinopathy', 'neuropathy', 'failure', 'stenosis', 'hypertension', 'embolism', 'colitis',
    'pneumonia', 'arthritis', 'gout', 'pancreatitis', 'shock', 'myeloma', 'sclerosis', 'encephalopathy',
    'tachycardia', 'infarction', 'fibrillation', 'thrombosis', 'stroke', 'bacteremia', 'bacteraemia',
    'meningitis', 'effusion', 'abscess', 'polyps', 'strictures', 'withdrawal', 'intoxication',
    'poisoning', 'toxicity', 'colic', 'bleed', 'bleeding', 'hemorrhage', 'haemorrhage', 'injury',
    'dissection', 'regurgitation', 'spasm', 'ulcer', 'ulcers', 'edema', 'oedema', 'cirrhosis',
    'acidosis', 'alkalosis', 'proteinosis', 'sarcoma', 'adenoma', 'adenocarcinoma'
];

const QUALIFIERS = [
    'treatment', 'management', 'therapy', 'therapies', 'diagnosis', 'diagnostic',
    'guideline', 'guidelines', 'screening', 'prevention', 'prophylaxis',
    'pharmacotherapy', 'reversal', 'indications', 'outcomes', 'criteria',
    'immunosuppression', 'anticoagulation', 'monitoring', 'classification',
    'stabilization', 'revascularization', 'biologic therapy', 'biologics',
    'systemic therapy', 'adjuvant therapy', 'radiation therapy'
];

/**
 * Extract comprehensive, high-yield clinical search aliases from a topic title and optional knowledge payload.
 * Handles compound educational titles with colons, parenthetical acronyms, treatment suffixes, and synonym groups.
 *
 * @param {string} displayTopic
 * @param {Object} [knowledge]
 * @returns {string[]} Sorted array of unique normalized alias strings
 */
function extractClinicalAliasesList(displayTopic, knowledge = {}) {
    const set = new Set();
    const raw = String(displayTopic || '').trim();
    if (!raw) return [];

    function addKey(text) {
        if (!text) return;
        const norm = normalizeTopic(text);
        if (norm && norm.length >= 2 && norm.length <= 120) {
            set.add(norm);
            const canon = resolveCanonicalNormalized(text, normalizeTopic);
            if (canon) set.add(canon);
            expandNormalizedTopicKeys(norm, normalizeTopic).forEach((k) => set.add(k));
        }
    }

    // 1. Raw topic itself + canonical expansion
    addKey(raw);

    // 2. Colon splitting (e.g. "Amyotrophic Lateral Sclerosis (ALS): El Escorial criteria, riluzole...")
    let mainPart = raw;
    if (raw.includes(':')) {
        const parts = raw.split(':');
        mainPart = parts[0].trim();
        addKey(mainPart);

        const rest = raw.slice(raw.indexOf(':') + 1);
        const subParts = rest.split(/[,;]/);
        for (const sub of subParts) {
            const s = sub.trim();
            if (s.length >= 3 && s.length <= 60) {
                addKey(s);
            }
        }
    }

    // 3. Parentheses extraction (e.g. "(ALS)", "(POTS)", "(IIH)", "(DLB)")
    const parenMatches = raw.match(/\((.*?)\)/g);
    if (parenMatches) {
        for (const pm of parenMatches) {
            const inner = pm.slice(1, -1).trim();
            if (inner.length >= 2 && inner.length <= 20) {
                addKey(inner);
            }
        }
        const stripped = raw.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();
        if (stripped && stripped !== raw) {
            addKey(stripped);
            if (stripped.includes(':')) {
                addKey(stripped.split(':')[0].trim());
            }
        }
    }

    // 4. Trailing or embedded uppercase acronyms (e.g. "Diabetic ketoacidosis DKA")
    const words = mainPart.split(/\s+/);
    for (const w of words) {
        const cleanW = w.replace(/[^A-Za-z]/g, '');
        if (cleanW.length >= 2 && cleanW.length <= 6 && cleanW === cleanW.toUpperCase() && !['AND', 'FOR', 'WITH', 'THE', 'IN', 'OF'].includes(cleanW)) {
            addKey(cleanW);
        }
    }
    const noTrailingUpper = mainPart.replace(/\b[A-Z]{2,6}\b/g, '').replace(/\s+/g, ' ').trim();
    if (noTrailingUpper && noTrailingUpper.length >= 4 && noTrailingUpper !== mainPart) {
        addKey(noTrailingUpper);
    }

    // 5. Clinical anchor words (e.g. "alcohol use disorder naltrexone and acamprosate" -> "alcohol use disorder")
    const lowerMain = mainPart.toLowerCase();
    for (const anchor of CLINICAL_ANCHOR_TERMS) {
        const idx = lowerMain.indexOf(anchor);
        if (idx !== -1) {
            const endIdx = idx + anchor.length;
            const prefix = mainPart.slice(0, endIdx).trim();
            if (prefix.length >= 4 && prefix.length < mainPart.length) {
                addKey(prefix);
                const remainder = mainPart.slice(endIdx).trim();
                if (remainder.length >= 4) {
                    addKey(remainder);
                }
            }
        }
    }

    // 6. Action / qualifier removal (e.g. "Alcohol withdrawal benzodiazepine treatment" -> "Alcohol withdrawal")
    const normRaw = normalizeTopic(mainPart);
    for (const q of QUALIFIERS) {
        const needle = ` ${q}`;
        const idx = normRaw.indexOf(needle);
        if (idx > 3) {
            const prefix = normRaw.slice(0, idx).trim();
            if (prefix.length >= 4) {
                addKey(prefix);
            }
        }
    }

    // 7. Conjunction splitting
    for (const sep of [' for ', ' in ', ' with ', ' and ']) {
        if (normRaw.includes(sep)) {
            const parts = normRaw.split(sep);
            for (const p of parts) {
                const cleanP = p.trim();
                if (cleanP.length >= 4 && cleanP.length <= 60) addKey(cleanP);
            }
        }
    }

    // 8. Explicit keywords or aliases from knowledge payload
    const kw = knowledge && typeof knowledge === 'object' ? (knowledge.keywords || knowledge.aliases) : null;
    if (Array.isArray(kw)) {
        for (const item of kw) {
            if (typeof item === 'string' && item.trim()) {
                addKey(item.trim());
            }
        }
    }

    return [...set].filter(Boolean).slice(0, 100);
}

function buildTopicKnowledgeAliasesJson(displayTopic, knowledge = {}) {
    return JSON.stringify(extractClinicalAliasesList(displayTopic, knowledge));
}

module.exports = {
    extractClinicalAliasesList,
    buildTopicKnowledgeAliasesJson
};
