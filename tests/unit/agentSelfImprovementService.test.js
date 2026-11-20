'use strict';

const Sqlite = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const {
    analyzeConversationQuality,
    getAgentMistakesForContext,
    getUserExplanationPreferences,
} = require('../../server/services/agentSelfImprovementService');

function makeDb() {
    const sqlite = new Sqlite(':memory:');
    const mig126 = fs.readFileSync(
        path.join(__dirname, '../../database/migrations/126_agent_self_improvement_tables.sql'),
        'utf8'
    ).replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
    sqlite.exec(mig126);
    sqlite.exec(`
        CREATE TABLE personalization_arm_state (
            policy_type TEXT NOT NULL,
            arm_id TEXT NOT NULL,
            scope_key TEXT NOT NULL DEFAULT 'global',
            alpha REAL NOT NULL DEFAULT 1.0,
            beta REAL NOT NULL DEFAULT 1.0,
            pulls INTEGER NOT NULL DEFAULT 0,
            total_reward REAL NOT NULL DEFAULT 0,
            updated_at TEXT,
            PRIMARY KEY (policy_type, arm_id, scope_key)
        );
        CREATE TABLE bandit_reward_applications (
            application_key TEXT PRIMARY KEY,
            policy_type TEXT NOT NULL,
            arm_id TEXT NOT NULL,
            scope_key TEXT NOT NULL,
            decision_id INTEGER,
            reward REAL NOT NULL,
            source TEXT,
            created_at TEXT
        );
    `);

    const threads = new Map();
    const db = {
        normalizeTopic: (t) => String(t || '').toLowerCase().trim(),
        async run(sql, params = []) {
            const res = sqlite.prepare(sql).run(...params);
            return { changes: res.changes };
        },
        async get(sql, params = []) {
            return sqlite.prepare(sql).get(...params);
        },
        async all(sql, params = []) {
            return sqlite.prepare(sql).all(...params);
        },
        async getAgentConversation(threadId) {
            return threads.get(threadId) || null;
        },
        async recordPersonalizationArmPull(policyType, armId, reward, scopeKey = 'global') {
            const r = Math.max(-1, Math.min(1, Number(reward) || 0));
            const sw = (r + 1) / 2;
            sqlite.prepare(`
                INSERT INTO personalization_arm_state (policy_type, arm_id, scope_key, alpha, beta, pulls, total_reward)
                VALUES (?, ?, ?, 1.0, 1.0, 0, 0)
                ON CONFLICT(policy_type, arm_id, scope_key) DO NOTHING
            `).run(policyType, armId, scopeKey);
            sqlite.prepare(`
                UPDATE personalization_arm_state
                SET alpha = alpha + ?, beta = beta + ?, pulls = pulls + 1, total_reward = total_reward + ?
                WHERE policy_type = ? AND arm_id = ? AND scope_key = ?
            `).run(sw, 1 - sw, r, policyType, armId, scopeKey);
            return { applied: true };
        },
        async recordPersonalizationArmPullIdempotent({ policyType, armId, reward, scopeKey = 'global', applicationKey, decisionId = null, source = null }) {
            const ins = sqlite.prepare(`
                INSERT INTO bandit_reward_applications (application_key, policy_type, arm_id, scope_key, decision_id, reward, source)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(application_key) DO NOTHING
            `).run(applicationKey, policyType, armId, scopeKey, decisionId, reward, source);
            if (!ins.changes) return { applied: false };
            await this.recordPersonalizationArmPull(policyType, armId, reward, scopeKey);
            return { applied: true };
        },
        setThread(id, thread) {
            threads.set(id, thread);
        },
        sqlite,
    };
    return db;
}

describe('agentSelfImprovementService with Migration 126 & RL Bandit Attribution', () => {
    test('records user corrections into agent_mistakes and penalizes the active teaching strategy arm', async () => {
        const db = makeDb();
        try {
            db.setThread('t-1', {
                userId: 'u-1',
                topic: 'Sepsis',
                metadata: { teachingStrategyArm: 'socratic', userFeedback: { rating: 'unhelpful', reason: 'too technical jargon' } },
                messages: [
                    { role: 'user', content: 'What is the fluid bolus target in sepsis?' },
                    { role: 'assistant', content: 'Give 5mL/kg colloid over 6 hours.' },
                    { role: 'user', content: 'Actually that is wrong, Surviving Sepsis recommends 30 mL/kg crystalloid within 3 hours.' },
                    { role: 'user', content: 'Wait, what do you mean by the second part? Can you explain and clarify?' },
                    { role: 'user', content: 'I still do not understand, this is confusing.' },
                ],
            });

            const res = await analyzeConversationQuality(db, 't-1');
            expect(res).toMatchObject({
                analyzed: true,
                corrections: 1,
                learnedMistakes: 1,
                helpfulnessRating: 'unhelpful',
                clarificationRequests: 2,
                rewardedArmId: 'socratic',
            });
            expect(res.teachingStrategyReward).toBeLessThan(0);

            const mistakes = await getAgentMistakesForContext(db, 'u-1', 'Sepsis');
            expect(mistakes).toHaveLength(1);
            expect(mistakes[0].avoidClaim).toContain('5mL/kg colloid');

            const armRow = db.sqlite.prepare(
                "SELECT * FROM personalization_arm_state WHERE policy_type = 'agent_teaching_strategy' AND arm_id = 'socratic' AND scope_key = 'global'"
            ).get();
            expect(armRow).toBeDefined();
            expect(armRow.pulls).toBe(1);
            expect(armRow.total_reward).toBeCloseTo(res.teachingStrategyReward, 4);
        } finally {
            db.sqlite.close();
        }
    });

    test('records helpful conversations and rewards the active teaching strategy arm', async () => {
        const db = makeDb();
        try {
            db.setThread('t-2', {
                userId: 'u-2',
                topic: 'Heart Failure',
                metadata: { teachingStrategyArm: 'worked_example', userFeedback: { rating: 'helpful' } },
                messages: [
                    { role: 'user', content: 'How do we initiate GDMT in HFrEF?' },
                    { role: 'assistant', content: 'Start the four pillars (ARNI/ACEi, beta-blocker, MRA, SGLT2i) with rapid sequence titration.' },
                ],
            });

            const res = await analyzeConversationQuality(db, 't-2');
            expect(res).toMatchObject({
                analyzed: true,
                corrections: 0,
                helpfulnessRating: 'helpful',
                rewardedArmId: 'worked_example',
                teachingStrategyReward: 0.45,
            });

            const prefs = await getUserExplanationPreferences(db, 'u-2');
            expect(prefs).toMatchObject({
                vocabulary: 'clinical',
                preferredExplanationLength: 'moderate',
            });
        } finally {
            db.sqlite.close();
        }
    });
});
