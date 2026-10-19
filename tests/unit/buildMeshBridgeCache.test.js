'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const { run, SEED_LABELS } = require('../../server/scripts/buildMeshBridgeCache');

function jsonResponse(payload) {
    return {
        ok: true,
        json: () => Promise.resolve(payload),
    };
}

/** Stub NLM endpoints for a tiny fake DAG: Flu → Viral infections → Infections. */
function stubFetch(calls) {
    return async (url) => {
        calls.push(String(url));
        if (url.includes('lookup/descriptor?label=Flu')) {
            return jsonResponse([{ resource: 'http://id.nlm.nih.gov/mesh/D000012', label: 'Influenza, Human' }]);
        }
        if (url.endsWith('/mesh/D000012.json')) {
            return jsonResponse({
                label: { '@value': 'Influenza, Human' },
                treeNumber: ['http://id.nlm.nih.gov/mesh/C02.782.620.365'],
                broaderDescriptor: ['http://id.nlm.nih.gov/mesh/D014774'],
            });
        }
        if (url.endsWith('/mesh/D014774.json')) {
            return jsonResponse({ label: { '@value': 'Virus Diseases' } });
        }
        // contains-match fallback and any other label: unresolved
        return jsonResponse([]);
    };
}

describe('buildMeshBridgeCache', () => {
    test('resolves descriptor details and broader labels into a self-contained cache', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-build-'));
        const prev = process.env.MESH_BRIDGE_CACHE_PATH;
        process.env.MESH_BRIDGE_CACHE_PATH = path.join(dir, 'cache.json');
        const calls = [];
        // Only fetch the "Flu" seed; stub the label list down to keep the test fast.
        const original = SEED_LABELS.slice();
        SEED_LABELS.length = 0;
        SEED_LABELS.push('Flu');
        try {
            const out = await run({ apply: true, fetchImpl: stubFetch(calls) });
            expect(out.resolved).toBe(1);
            expect(out.unresolved).toEqual([]);
            expect(out.written).toBe(true);

            const cache = JSON.parse(fs.readFileSync(process.env.MESH_BRIDGE_CACHE_PATH, 'utf8'));
            expect(cache.version).toBe(1);
            const flu = cache.descriptors.D000012;
            expect(flu.label).toBe('Influenza, Human');
            expect(flu.treeNumbers).toEqual(['C02.782.620.365']);
            expect(flu.broader).toEqual([{ uri: 'http://id.nlm.nih.gov/mesh/D014774', label: 'Virus Diseases' }]);
            expect(cache.byTreeNumber['C02.782.620.365']).toBe('D000012');
            // lookup + details + broader label = 3 throttled calls
            expect(calls.length).toBe(3);
        } finally {
            SEED_LABELS.length = 0;
            SEED_LABELS.push(...original);
            if (prev === undefined) delete process.env.MESH_BRIDGE_CACHE_PATH;
            else process.env.MESH_BRIDGE_CACHE_PATH = prev;
        }
    }, 20000);
});
