'use strict';

const applyTeachingObjectMixin = require('../../database/mixins/m08d-teaching-objects');

class Base {
    normalizeTopic(value) {
        return String(value || '').toLowerCase().trim();
    }
}

const Db = applyTeachingObjectMixin(Base);

describe('topic alias trust boundary', () => {
    test('does not resolve legacy low-confidence orphan reconciliation aliases', async () => {
        const db = new Db();
        db.get = jest.fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

        await expect(db.resolveCurriculumTopicId('HRS treatment')).resolves.toBeNull();
        expect(db.get.mock.calls[0][0]).toContain("resolution = 'orphan_reconciliation'");
        expect(db.get.mock.calls[0][0]).toContain('confidence < 0.95');
    });

    test('continues to use a trusted alias returned by the database', async () => {
        const db = new Db();
        db.get = jest.fn().mockResolvedValueOnce({ curriculum_topic_id: 17 });

        await expect(db.resolveCurriculumTopicId('HFrEF')).resolves.toBe(17);
        expect(db.get).toHaveBeenCalledTimes(1);
    });

    test('allows an exact higher-confidence reconciliation to replace a legacy mapping', async () => {
        const db = new Db();
        db.run = jest.fn().mockResolvedValue(true);

        await expect(db.recordTopicAlias(
            'HRS treatment', 22, 'orphan_reconciliation_exact', 0.95,
        )).resolves.toBe(true);
        expect(db.run.mock.calls[0][0]).toContain('ON CONFLICT (alias_norm) DO UPDATE SET');
        expect(db.run.mock.calls[0][0]).toContain("topic_aliases.resolution = 'orphan_reconciliation'");
        expect(db.run.mock.calls[0][1].slice(1)).toEqual(['hrs treatment', 22, 'orphan_reconciliation_exact', 0.95]);
    });
});
