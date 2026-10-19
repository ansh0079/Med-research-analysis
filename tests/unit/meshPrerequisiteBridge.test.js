'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
    findDescriptorByLabel,
    parentTreeNumbers,
    meshPrerequisites,
    descriptorUriToId,
    normalizeLabel,
} = require('../../server/services/learning/meshPrerequisiteBridge');

describe('meshPrerequisiteBridge', () => {
    test('parentTreeNumbers trims each trailing segment', () => {
        expect(parentTreeNumbers('C23.550.470')).toEqual(['C23.550', 'C23']);
        expect(parentTreeNumbers('C23')).toEqual([]);
        expect(parentTreeNumbers('')).toEqual([]);
    });

    test('descriptorUriToId extracts the D-number', () => {
        expect(descriptorUriToId('http://id.nlm.nih.gov/mesh/D018805')).toBe('D018805');
        expect(descriptorUriToId('D018805')).toBe('D018805');
        expect(descriptorUriToId('')).toBe('');
    });

    test('normalizeLabel lowercases and strips punctuation', () => {
        expect(normalizeLabel('Shock, Septic')).toBe('shock septic');
    });

    describe('with fixture cache', () => {
        let cacheDir;
        beforeAll(() => {
            cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-cache-'));
            process.env.MESH_BRIDGE_CACHE_PATH = path.join(cacheDir, 'cache.json');
            // Reset the lazy cache by requiring fresh — loadCache caches for 60s,
            // so point the env var BEFORE first use in these tests.
            const fixture = {
                version: 1,
                fetchedAt: new Date().toISOString(),
                descriptors: {
                    D018805: {
                        label: 'Sepsis',
                        treeNumbers: ['C01.757', 'C23.550.470.790.500'],
                        broader: [
                            { uri: 'http://id.nlm.nih.gov/mesh/D018746', label: 'Systemic Inflammatory Response Syndrome' },
                            { uri: 'http://id.nlm.nih.gov/mesh/D007239', label: 'Infections' },
                        ],
                    },
                    D018746: {
                        label: 'Systemic Inflammatory Response Syndrome',
                        treeNumbers: ['C23.550.470.790'],
                        broader: [{ uri: 'http://id.nlm.nih.gov/mesh/D009154', label: 'Inflammation' }],
                    },
                    D007239: {
                        label: 'Infections',
                        treeNumbers: ['C01.500'],
                        broader: [{ uri: 'http://id.nlm.nih.gov/mesh/D012008', label: 'Pathologic Processes' }],
                    },
                    D012769: {
                        label: 'Shock',
                        treeNumbers: ['C23.550.835'],
                        broader: [{ uri: 'http://id.nlm.nih.gov/mesh/D012008', label: 'Pathologic Processes' }],
                    },
                },
                byTreeNumber: {
                    'C01.757': 'D018805',
                    'C23.550.470.790.500': 'D018805',
                    'C23.550.470.790': 'D018746',
                    'C01.500': 'D007239',
                    'C23.550.835': 'D012769',
                },
            };
            fs.writeFileSync(process.env.MESH_BRIDGE_CACHE_PATH, JSON.stringify(fixture));
            // Force reload with new path.
            const bridge = require('../../server/services/learning/meshPrerequisiteBridge');
            bridge.loadCache({ force: true });
        });

        afterAll(() => {
            delete process.env.MESH_BRIDGE_CACHE_PATH;
        });

        test('findDescriptorByLabel matches normalized labels', () => {
            const d = findDescriptorByLabel('sepsis');
            expect(d.id).toBe('D018805');
            // substring fallback
            expect(findDescriptorByLabel('septic shock syndrome workup').id).toBeTruthy();
        });

        test('meshPrerequisites returns broader descriptor labels', async () => {
            const parents = await meshPrerequisites('Sepsis');
            expect(parents.map((p) => p.topic)).toContain('Systemic Inflammatory Response Syndrome');
            expect(parents.map((p) => p.topic)).toContain('Infections');
            expect(parents.every((p) => p.source === 'mesh_broader')).toBe(true);
        });

        test('meshPrerequisites respects maxParents cap', async () => {
            const parents = await meshPrerequisites('Sepsis', { maxParents: 1 });
            expect(parents).toHaveLength(1);
        });

        test('unknown topic returns empty array (offline-safe)', async () => {
            expect(await meshPrerequisites('completely unknown xyzzy topic')).toEqual([]);
        });

        test('no network is used when cache-only (no fetchImpl passed)', async () => {
            const parents = await meshPrerequisites('Sepsis');
            expect(parents.length).toBeGreaterThan(0);
        });
    });
});
