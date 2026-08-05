const db = require('../../database');
const { MIXIN_LAYERS, validateMixinCollisions } = require('../../database/compose');

function allPrototypeMethods(klass) {
    const names = new Set();
    for (let proto = klass.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
        for (const name of Object.getOwnPropertyNames(proto)) {
            if (name !== 'constructor' && typeof proto[name] === 'function') {
                names.add(name);
            }
        }
    }
    return names;
}

describe('database composition', () => {
    test('all mixin layers compose without unapproved method collisions', () => {
        expect(() => validateMixinCollisions()).not.toThrow();
        expect(MIXIN_LAYERS).toContain('m15-topic-crosslinks');
        expect(MIXIN_LAYERS).toEqual(expect.arrayContaining([
            'm02a-guidelines',
            'm02d-adaptive-topic-memory',
            'm05a-curriculum-seed',
            'm05c-agent-conversations',
            'm08d-teaching-objects',
            'm08e-teaching-claims-mastery',
            'm08f-teaching-quality-bkt',
        ]));
        expect(MIXIN_LAYERS).not.toContain('m02-guidelines-learning-quiz-adaptive');
        expect(MIXIN_LAYERS).not.toContain('m05-curriculum-agent-case-mastery');
    });

    test('composed Database exposes core and domain methods through the public singleton', () => {
        const methods = allPrototypeMethods(db.Database);

        expect([...methods]).toEqual(expect.arrayContaining([
            'connect',
            'runMigrations',
            'withTransaction',
            'logSearch',
            'getTopicKnowledge',
            'createReviewProject',
            'createAiGenerationJob',
            'logLlmUsage',
            'createUser',
            'upsertTopicCrosslink',
            'getTopicCrosslinks',
            'exportUserData',
            'deleteUserAccount',
        ]));
        expect(typeof db.withTransaction).toBe('function');
        expect(typeof db.getTopicCrosslinks).toBe('function');
    });
});
