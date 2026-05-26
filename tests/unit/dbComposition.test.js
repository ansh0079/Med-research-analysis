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
        ]));
        expect(typeof db.withTransaction).toBe('function');
        expect(typeof db.getTopicCrosslinks).toBe('function');
    });
});
