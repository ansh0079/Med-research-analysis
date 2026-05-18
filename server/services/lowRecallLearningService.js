const NLM_MESH_LOOKUP = 'https://id.nlm.nih.gov/mesh/lookup/term';

function cleanAlias(value) {
    const text = String(value || '')
        .replace(/\s+/g, ' ')
        .replace(/[()[\]{}]/g, ' ')
        .trim();
    if (text.length < 3 || text.length > 120) return '';
    if (/^https?:\/\//i.test(text)) return '';
    return text;
}

function aliasesFromMeshItems(items = []) {
    const out = new Set();
    for (const item of Array.isArray(items) ? items : []) {
        const label = cleanAlias(item.label || item.name);
        if (label) out.add(label);
        const note = cleanAlias(item.note);
        if (note && note.length <= 80 && !/[.;:]/.test(note)) out.add(note);
    }
    return [...out].slice(0, 12);
}

async function lookupMeshAliases(query, fetchImpl, { limit = 8 } = {}) {
    if (!query || typeof fetchImpl !== 'function') return [];
    const url = `${NLM_MESH_LOOKUP}?label=${encodeURIComponent(String(query).trim())}&match=contains&limit=${Math.min(Math.max(Number(limit) || 8, 1), 20)}`;
    const response = await fetchImpl(url, { timeout: 8000, headers: { Accept: 'application/json' } });
    if (!response?.ok) return [];
    const data = await response.json();
    return aliasesFromMeshItems(data);
}

async function captureLowRecallSearch({
    db,
    fetchImpl,
    query,
    resultCount,
    sources = [],
    threshold = 5,
    logger,
}) {
    if (!db || !query || Number(resultCount || 0) >= threshold) {
        return null;
    }

    let aliases = [];
    try {
        aliases = await lookupMeshAliases(query, fetchImpl, { limit: 8 });
    } catch (err) {
        logger?.debug?.({ err, query }, 'lowRecallLearning: MeSH lookup failed');
    }

    if (typeof db.recordLowRecallSearch === 'function') {
        await db.recordLowRecallSearch({
            query,
            resultCount,
            sources,
            expandedAliases: aliases,
        }).catch((err) => logger?.debug?.({ err, query }, 'lowRecallLearning: record failed'));
    }

    if (aliases.length > 0 && typeof db.mergeTopicKnowledgeAliases === 'function') {
        await db.mergeTopicKnowledgeAliases(query, aliases, {
            createIfMissing: true,
            reason: 'low_recall_mesh',
        }).catch((err) => logger?.debug?.({ err, query }, 'lowRecallLearning: alias merge failed'));
    }

    return {
        query,
        resultCount: Number(resultCount || 0),
        aliases,
        aliasCount: aliases.length,
    };
}

module.exports = {
    aliasesFromMeshItems,
    captureLowRecallSearch,
    cleanAlias,
    lookupMeshAliases,
};
