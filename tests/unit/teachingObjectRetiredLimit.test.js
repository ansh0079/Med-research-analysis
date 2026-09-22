'use strict';

const Sqlite = require('better-sqlite3');
const TeachingObjectMixin = require('../../database/mixins/m08d-teaching-objects');

test('retired teaching objects are excluded before the topic limit is applied', async () => {
    const sqlite = new Sqlite(':memory:');
    try {
        sqlite.exec(`CREATE TABLE teaching_objects (
            object_key TEXT, normalized_topic TEXT, object_type TEXT,
            review_state TEXT, lineage_status TEXT, updated_at TEXT, object_payload TEXT
        );
        INSERT INTO teaching_objects VALUES ('usable', 'heart failure', 'paper', 'unreviewed', 'linked', '2026-01-01', '{}');
        INSERT INTO teaching_objects VALUES ('retired', 'heart failure', 'paper', 'unreviewed', 'legacy_retired', '2026-02-01', '{}');`);
        const Reader = TeachingObjectMixin(class {});
        const reader = new Reader();
        reader.normalizeTopic = (topic) => topic;
        reader.all = async (sql, params) => sqlite.prepare(sql).all(...params);
        expect((await reader.listTeachingObjectsForTopic('heart failure', { limit: 1 })).map((row) => row.objectKey))
            .toEqual(['retired']);
        expect((await reader.listTeachingObjectsForTopic('heart failure', { limit: 1, excludeRetired: true })).map((row) => row.objectKey))
            .toEqual(['usable']);
    } finally {
        sqlite.close();
    }
});
