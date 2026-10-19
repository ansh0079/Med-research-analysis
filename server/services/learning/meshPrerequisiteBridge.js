'use strict';

/**
 * MeSH tree bridge — turns a free-text clinical topic into prerequisite
 * concepts using the MeSH descriptor DAG (broaderDescriptor / tree ancestry).
 *
 * Design constraints:
 * - NEVER hits the network on the request path. Runtime reads only the local
 *   JSON cache built by server/scripts/buildMeshBridgeCache.js. Live lookups
 *   happen only in that script (or when MESH_BRIDGE_LIVE=true explicitly).
 * - Degrades to [] when the cache is missing — the seeded PREREQUISITE_MAP
 *   in prerequisiteRemediation.js keeps working offline.
 *
 * Cache shape (data/mesh/descriptor-cache.json):
 * {
 *   version: 1,
 *   fetchedAt: ISO string,
 *   descriptors: { D018805: { label, treeNumbers: [], broader: [{uri, label}] } },
 *   byTreeNumber: { "C01.757": "D018805", ... }
 * }
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../config/logger');

const LOOKUP_URL = 'https://id.nlm.nih.gov/mesh/lookup/descriptor';
const DEFAULT_CACHE_PATH = path.join(__dirname, '..', '..', '..', 'data', 'mesh', 'descriptor-cache.json');
const HTTP_TIMEOUT_MS = Number(process.env.MESH_BRIDGE_TIMEOUT_MS || 8000);

let _cache = null;
let _cacheLoadedAt = 0;

function cachePath() {
    return process.env.MESH_BRIDGE_CACHE_PATH || DEFAULT_CACHE_PATH;
}

function loadCache({ force = false } = {}) {
    if (!force && _cache && Date.now() - _cacheLoadedAt < 60_000) return _cache;
    try {
        const raw = fs.readFileSync(cachePath(), 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1 && parsed.descriptors) {
            _cache = parsed;
            _cacheLoadedAt = Date.now();
            return _cache;
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            logger.warn({ err }, 'mesh bridge cache unreadable');
        }
    }
    _cache = null;
    _cacheLoadedAt = Date.now();
    return null;
}

function descriptorUriToId(uri) {
    const m = String(uri || '').match(/(D\d{6})$/);
    return m ? m[1] : String(uri || '');
}

function normalizeLabel(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

/** Find a cached descriptor by exact (normalized) label. */
function findDescriptorByLabel(label, cache = loadCache()) {
    const norm = normalizeLabel(label);
    if (!norm || !cache?.descriptors) return null;
    for (const [id, d] of Object.entries(cache.descriptors)) {
        if (normalizeLabel(d.label) === norm) return { id, ...d };
    }
    // Substring fallback: cached label contained in / containing the query.
    for (const [id, d] of Object.entries(cache.descriptors)) {
        const dl = normalizeLabel(d.label);
        if (dl.length >= 5 && (norm.includes(dl) || dl.includes(norm))) return { id, ...d };
    }
    return null;
}

/** Parent tree number = drop the last dot segment (C23.550.470 → C23.550). */
function parentTreeNumbers(treeNumber) {
    const parts = String(treeNumber || '').split('.');
    if (parts.length < 2) return [];
    const parents = [];
    for (let len = parts.length - 1; len >= 1; len -= 1) {
        parents.push(parts.slice(0, len).join('.'));
    }
    return parents;
}

/**
 * Prerequisite parents for a topic, from the MeSH DAG.
 * Cache-only by default; pass fetchImpl + live:true to allow NLM lookups.
 *
 * @returns {Promise<Array<{topic, rationale, matchedKey, source}>>}
 */
async function meshPrerequisites(topic, { fetchImpl = null, live = false, maxParents = 3 } = {}) {
    const out = [];
    if (!topic) return out;

    let descriptor = findDescriptorByLabel(topic);
    if (!descriptor && live && typeof fetchImpl === 'function') {
        descriptor = await liveLookupDescriptor(topic, fetchImpl);
    }
    if (!descriptor) return out;

    // 1) broaderDescriptor labels (the real DAG edges).
    for (const b of descriptor.broader || []) {
        if (out.length >= maxParents) return out;
        const label = b.label || null;
        if (!label) continue;
        out.push({
            topic: label,
            rationale: `MeSH broader descriptor of “${descriptor.label}”.`,
            matchedKey: normalizeLabel(topic),
            source: 'mesh_broader',
        });
    }

    // 2) tree ancestry fallback: nearest ancestor with a known descriptor.
    const cache = loadCache();
    for (const tn of descriptor.treeNumbers || []) {
        if (out.length >= maxParents) return out;
        for (const parentTn of parentTreeNumbers(tn)) {
            const parentId = cache?.byTreeNumber?.[parentTn];
            if (!parentId) continue;
            const parent = cache.descriptors[parentId];
            if (!parent || normalizeLabel(parent.label) === normalizeLabel(descriptor.label)) continue;
            if (out.some((o) => normalizeLabel(o.topic) === normalizeLabel(parent.label))) continue;
            out.push({
                topic: parent.label,
                rationale: `MeSH tree ancestor (${parentTn}) of “${descriptor.label}”.`,
                matchedKey: normalizeLabel(topic),
                source: 'mesh_tree_ancestor',
            });
            break;
        }
    }
    return out;
}

/** Live NLM lookup — build-script use only. */
async function liveLookupDescriptor(label, fetchImpl) {
    const url = `${LOOKUP_URL}?label=${encodeURIComponent(label)}&match=exact`;
    const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const rows = await res.json();
    const hit = Array.isArray(rows) ? rows[0] : null;
    if (!hit?.resource) return null;
    return findDescriptorByLabel(hit.label) || { id: descriptorUriToId(hit.resource), label: hit.label, treeNumbers: [], broader: [] };
}

/** Live descriptor details — build-script use only. */
async function fetchDescriptorDetails(uri, fetchImpl) {
    const id = descriptorUriToId(uri);
    const url = `https://id.nlm.nih.gov/mesh/${id}.json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
    try {
        const res = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
        if (!res.ok) return null;
        const j = await res.json();
        const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
        const broader = asArray(j.broaderDescriptor)
            .map((u) => ({ uri: u, id: descriptorUriToId(u), label: null }));
        const treeNumbers = asArray(j.treeNumber)
            .map((u) => String(u).replace(/^.*\//, ''));
        const label = j.label?.['@value'] || j.label || id;
        return { id, label, treeNumbers, broader };
    } finally {
        clearTimeout(timer);
    }
}

/** Live label for a descriptor URI — build-script use only. */
async function fetchDescriptorLabel(uri, fetchImpl) {
    const details = await fetchDescriptorDetails(uri, fetchImpl);
    return details?.label || null;
}

module.exports = {
    LOOKUP_URL,
    cachePath,
    loadCache,
    findDescriptorByLabel,
    parentTreeNumbers,
    meshPrerequisites,
    liveLookupDescriptor,
    fetchDescriptorDetails,
    fetchDescriptorLabel,
    descriptorUriToId,
    normalizeLabel,
};
