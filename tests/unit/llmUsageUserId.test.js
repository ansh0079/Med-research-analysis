'use strict';

const applyM11LlmUsage = require('../../database/mixins/m11-llm-usage');

test('usage logging preserves UUID user IDs', async () => {
    class Base {
        normalizeTopic(value) { return value.toLowerCase(); }
        async run(sql, values) { this.recorded = { sql, values }; }
    }
    const UsageDb = applyM11LlmUsage(Base);
    const db = new UsageDb();
    const userId = 'd59c267a-f27e-49a1-9d0b-a2d6d231b5d0';
    await db.logLlmUsage({ operation: 'quiz', userId, success: true });
    expect(db.recorded.values[4]).toBe(userId);
});
