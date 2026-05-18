const { spawnSync } = require('child_process');
const path = require('path');
const db = require('../../database');
const { checkDbContract, discoverRouteDbMethods } = require('../../server/services/dbContract');

describe('Route/controller DB contract', () => {
    test('all DB methods used by routes, controllers, and middleware exist', () => {
        const contract = checkDbContract(db);

        expect(contract.ok).toBe(true);
        expect(contract.missing).toEqual([]);
        expect(contract.requiredMethodCount).toBeGreaterThan(50);
    });

    test('contract scanner sees high-value learning and review methods', () => {
        const methods = discoverRouteDbMethods();

        expect(methods).toEqual(expect.arrayContaining([
            'getTopicKnowledge',
            'createPortfolioReflection',
            'listPortfolioReflections',
            'updatePortfolioReflection',
            'getAiGenerationJobByKey',
        ]));
    });

    test('route and controller files do not use typeof db capability guards', () => {
        const result = spawnSync(process.execPath, ['tools/check-db-guards.js'], {
            cwd: path.join(__dirname, '..', '..'),
            encoding: 'utf8',
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('No route/controller typeof db guards found.');
    });
});
