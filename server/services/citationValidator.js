function extractCitationRefs(text) {
    const refs = [];
    const value = String(text || '');
    const citationPattern = /\[([^\]]+)\]/g;
    let match;
    while ((match = citationPattern.exec(value)) !== null) {
        const parts = String(match[1] || '').split(/[,\s;]+/).filter(Boolean);
        for (const part of parts) {
            const cleaned = part.trim();
            const guideline = cleaned.match(/^G(\d+)$/i);
            if (guideline) {
                refs.push({ kind: 'guideline', index: Number(guideline[1]) });
                continue;
            }
            const source = cleaned.match(/^(\d+)$/);
            if (source) refs.push({ kind: 'source', index: Number(source[1]) });
        }
    }
    return refs;
}

function validateCitationRefs(text, { sourceCount = 0, guidelineCount = 0, requireCitation = true } = {}) {
    const refs = extractCitationRefs(text);
    const errors = [];
    if (requireCitation && refs.length === 0) {
        errors.push('missing_citation');
    }
    for (const ref of refs) {
        if (ref.kind === 'source' && (ref.index < 1 || ref.index > sourceCount)) {
            errors.push(`invalid_source_${ref.index}`);
        }
        if (ref.kind === 'guideline' && (ref.index < 1 || ref.index > guidelineCount)) {
            errors.push(`invalid_guideline_${ref.index}`);
        }
    }
    return { ok: errors.length === 0, refs, errors };
}

function getPathValue(obj, path) {
    return String(path || '').split('.').reduce((acc, key) => {
        if (acc == null) return undefined;
        return acc[key];
    }, obj);
}

function validateMedicalOutputCitations(output, {
    sourceCount = 0,
    guidelineCount = 0,
    requiredPaths = [],
    requiredListPaths = [],
} = {}) {
    const issues = [];

    for (const path of requiredPaths) {
        const value = getPathValue(output, path);
        if (!value) continue;
        const result = validateCitationRefs(value, { sourceCount, guidelineCount, requireCitation: true });
        if (!result.ok) issues.push({ path, value, errors: result.errors });
    }

    for (const path of requiredListPaths) {
        const list = getPathValue(output, path);
        if (!Array.isArray(list)) continue;
        list.forEach((value, index) => {
            if (!value) return;
            const result = validateCitationRefs(value, { sourceCount, guidelineCount, requireCitation: true });
            if (!result.ok) issues.push({ path: `${path}.${index}`, value, errors: result.errors });
        });
    }

    return {
        ok: issues.length === 0,
        issueCount: issues.length,
        issues,
    };
}

function filterCitedStringList(list, options = {}) {
    if (!Array.isArray(list)) return [];
    return list.filter((item) => validateCitationRefs(item, options).ok);
}

function validateSourceIndices(indices, sourceCount = 0) {
    if (!Array.isArray(indices)) return [];
    return indices
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= sourceCount);
}

module.exports = {
    extractCitationRefs,
    validateCitationRefs,
    validateMedicalOutputCitations,
    filterCitedStringList,
    validateSourceIndices,
};
