// Landmark alias/PMID rules live in JSON configs (validated + editable without
// touching fetch/RRF code). See server/config/clinicalQueryAliasRules.json and
// clinicalQueryAliasSeeds.json. Older trials often omit their own acronym in
// title/abstract — pinned PMIDs bypass esearch relevance ranking.
const {
    loadClinicalQueryAliasRules,
    loadClinicalQueryAliasSeeds,
    loadAllClinicalQueryAliasRules,
} = require('../clinicalQueryAliasSeeds');

const CLINICAL_QUERY_ALIAS_RULES = loadClinicalQueryAliasRules();
const DATA_DRIVEN_ALIAS_RULES = loadClinicalQueryAliasSeeds();
const ALL_CLINICAL_QUERY_ALIAS_RULES = loadAllClinicalQueryAliasRules();

function clinicalQueryAliases(query) {
    const text = String(query || '');
    const out = new Set();
    for (const rule of ALL_CLINICAL_QUERY_ALIAS_RULES) {
        if (rule.all.every((pattern) => pattern.test(text))) {
            rule.aliases.forEach((alias) => out.add(alias));
        }
    }
    return [...out].slice(0, 8);
}

function clinicalQueryPinnedPmids(query) {
    const text = String(query || '');
    const out = new Set();
    for (const rule of ALL_CLINICAL_QUERY_ALIAS_RULES) {
        if (Array.isArray(rule.pmids) && rule.all.every((pattern) => pattern.test(text))) {
            rule.pmids.forEach((pmid) => out.add(pmid));
        }
    }
    return [...out].slice(0, 6);
}

function pubmedTextAlias(alias) {
    const clean = String(alias || '').replace(/"/g, '').trim();
    if (!clean) return null;
    return /\s/.test(clean) ? `"${clean}"` : `"${clean}"[Title/Abstract]`;
}

function buildPubMedSearchQuery(baseQuery, meshExpansions = [], aliases = []) {
    const terms = [String(baseQuery || '').trim()].filter(Boolean);
    terms.push(...meshExpansions.map((term) => `"${String(term).replace(/"/g, '').trim()}"[MeSH Terms]`).filter(Boolean));
    terms.push(...aliases.map(pubmedTextAlias).filter(Boolean));
    if (terms.length <= 1) return terms[0] || '';
    return `(${terms.join(' OR ')})`;
}

module.exports = {
    CLINICAL_QUERY_ALIAS_RULES,
    DATA_DRIVEN_ALIAS_RULES,
    ALL_CLINICAL_QUERY_ALIAS_RULES,
    clinicalQueryAliases,
    clinicalQueryPinnedPmids,
    pubmedTextAlias,
    buildPubMedSearchQuery,
};
