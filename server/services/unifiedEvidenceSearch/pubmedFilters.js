const SPECIFICITY_PUB_TYPE_FILTERS = {
    strict: ['Randomized Controlled Trial', 'Systematic Review', 'Meta-Analysis', 'Practice Guideline', 'Clinical Trial'],
    moderate: [],
    broad: [],
};

function publicationTypeClause(label) {
    const text = String(label || '').trim();
    if (!text) return null;
    if (text.includes('[')) return text;
    return `"${text}"[Publication Type]`;
}

function appendPubMedPublicationFilters(pubmedQuery, specificity, parsedStudyTypes = [], parsedYearFilters = []) {
    const clauses = [String(pubmedQuery || '').trim()].filter(Boolean);
    const typeFilters = [
        ...(SPECIFICITY_PUB_TYPE_FILTERS[specificity] || []),
        ...(Array.isArray(parsedStudyTypes) ? parsedStudyTypes : []),
    ]
        .map(publicationTypeClause)
        .filter(Boolean);

    if (typeFilters.length > 0) {
        clauses.push(`(${typeFilters.join(' OR ')})`);
    }
    const yearFilters = (Array.isArray(parsedYearFilters) ? parsedYearFilters : [])
        .map((filter) => String(filter || '').trim())
        .filter((filter) => /^\d{4}:\d{4}\[PDAT\]$/i.test(filter));
    clauses.push(...yearFilters);
    if (specificity === 'strict') {
        clauses.push('(english[lang])');
        clauses.push('(humans[MeSH Terms])');
    }
    return clauses.join(' AND ');
}

module.exports = {
    SPECIFICITY_PUB_TYPE_FILTERS,
    publicationTypeClause,
    appendPubMedPublicationFilters,
};
