'use strict';

/**
 * Build the MeSH descriptor cache consumed by meshPrerequisiteBridge.
 *
 * Resolves each seed label to its MeSH descriptor via the NLM lookup API,
 * fetches descriptor details (tree numbers + broader descriptors), then
 * fetches broader-descriptor labels so the cache is self-contained.
 * Throttled to respect NLM rate guidance; rerun any time to refresh.
 *
 * Usage:
 *   node server/scripts/buildMeshBridgeCache.js            # report only
 *   node server/scripts/buildMeshBridgeCache.js --apply    # write cache file
 */

const fs = require('fs');
const path = require('path');
const {
    LOOKUP_URL,
    cachePath,
    descriptorUriToId,
    fetchDescriptorDetails,
    fetchDescriptorLabel,
} = require('../services/learning/meshPrerequisiteBridge');

const THROTTLE_MS = 200;

// Seed labels: every topic used by the seeded prerequisite map (children and
// parents) plus common clinical head terms. Non-MeSH labels (risk scores like
// CHA2DS2-VASc) simply won't resolve and are skipped.
const SEED_LABELS = [
    // children
    'Sepsis', 'Shock, Septic', 'Atrial Fibrillation', 'Heart Failure',
    'Pulmonary Disease, Chronic Obstructive', 'Asthma',
    'Diabetic Ketoacidosis', 'Hyponatremia', 'Acute Kidney Injury',
    'Pneumonia', 'Anemia',
    // seeded parents
    'Shock', 'Fluid Therapy', 'Renin-Angiotensin System',
    'Lung Diseases, Obstructive', 'Acid-Base Imbalance',
    'Bronchodilator Agents', 'Insulin', 'Acid-Base Equilibrium',
    'Osmolar Concentration', 'Water-Electrolyte Balance', 'Creatinine',
    'Anti-Bacterial Agents', 'Virulence', 'Erythrocytes', 'Iron',
    'Stroke', 'Heart Diseases',
];

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function lookupDescriptor(label, fetchImpl) {
    const url = `${LOOKUP_URL}?label=${encodeURIComponent(label)}&match=exact`;
    const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const rows = await res.json();
    const hit = Array.isArray(rows) ? rows[0] : null;
    return hit?.resource ? { uri: hit.resource, label: hit.label } : null;
}

async function run({ apply = false, fetchImpl = fetch } = {}) {
    const descriptors = {};
    const byTreeNumber = {};
    const unresolved = [];

    for (const label of SEED_LABELS) {
        await sleep(THROTTLE_MS);
        let hit = null;
        try {
            hit = await lookupDescriptor(label, fetchImpl);
            // Exact match can fail on punctuation variants; try contains-match once.
            if (!hit) {
                const res = await fetchImpl(`${LOOKUP_URL}?label=${encodeURIComponent(label)}&match=contains`, { headers: { Accept: 'application/json' } });
                if (res.ok) {
                    const rows = await res.json();
                    hit = Array.isArray(rows) && rows.length ? { uri: rows[0].resource, label: rows[0].label } : null;
                }
            }
        } catch {
            hit = null;
        }
        if (!hit) {
            unresolved.push(label);
            continue;
        }
        const id = descriptorUriToId(hit.uri);
        await sleep(THROTTLE_MS);
        let details = null;
        try {
            details = await fetchDescriptorDetails(hit.uri, fetchImpl);
        } catch {
            details = null;
        }
        if (!details) {
            unresolved.push(label);
            continue;
        }
        // Fetch broader descriptor labels so the cache is self-contained.
        const broader = [];
        for (const b of details.broader) {
            await sleep(THROTTLE_MS);
            let blabel = null;
            try {
                blabel = await fetchDescriptorLabel(b.uri, fetchImpl);
            } catch {
                blabel = null;
            }
            broader.push({ uri: b.uri, label: blabel || b.id });
        }
        descriptors[id] = { label: details.label, treeNumbers: details.treeNumbers, broader };
        for (const tn of details.treeNumbers) byTreeNumber[tn] = id;
    }

    const cache = { version: 1, fetchedAt: new Date().toISOString(), descriptors, byTreeNumber };
    const outPath = cachePath();
    if (apply) {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(cache, null, 1));
    }
    return {
        resolved: Object.keys(descriptors).length,
        unresolved,
        cachePath: outPath,
        written: apply,
    };
}

if (require.main === module) {
    const apply = process.argv.includes('--apply');
    run({ apply }).then((r) => {
        console.log(JSON.stringify(r, null, 2));
        process.exit(0);
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { run, SEED_LABELS };
