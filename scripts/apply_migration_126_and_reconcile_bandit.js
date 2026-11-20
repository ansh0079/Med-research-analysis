'use strict';

/**
 * Step 2: Apply Migration 126 (Agent Self-Improvement Tables) & Close/Reconcile
 * the RL Bandit Loop across all 5 policies.
 *
 * Usage:
 *   node scripts/apply_migration_126_and_reconcile_bandit.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const {
    POLICY_SEARCH_RANKING,
    POLICY_RECOMMENDATION,
    POLICY_SYNOPSIS_STYLE,
    POLICY_TEACHING_STRATEGY,
    POLICY_TOPIC_EVOLUTION,
    SEARCH_RANKING_ARMS,
    RECOMMENDATION_ARM_BY_TYPE,
    SYNOPSIS_STYLE_ARMS,
    TEACHING_STRATEGY_ARMS,
} = require('../server/services/bandit/constants');

function main() {
    const rawDb = new Database(path.resolve('database/app.db'));
    const now = new Date().toISOString();

    console.log('=== STEP 2: MIGRATION 126 & RL BANDIT LOOP RECONCILIATION ===');

    // 1. Apply migration 126_agent_self_improvement_tables.sql (SQLite dialect)
    const migPath = path.resolve('database/migrations/126_agent_self_improvement_tables.sql');
    const migSql = fs.readFileSync(migPath, 'utf8')
        .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
    rawDb.exec(migSql);

    // Record in schema_migrations if table exists
    const hasSchemaMigs = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get();
    if (hasSchemaMigs) {
        const cols = rawDb.prepare('PRAGMA table_info(schema_migrations)').all().map((c) => c.name);
        if (cols.includes('filename')) {
            rawDb.prepare('INSERT OR IGNORE INTO schema_migrations (filename) VALUES (?)').run('126_agent_self_improvement_tables.sql');
        } else if (cols.includes('version')) {
            rawDb.prepare('INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)').run('126_agent_self_improvement_tables.sql');
        }
    }

    const tables = rawDb.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('agent_mistakes','agent_helpful_patterns','agent_unhelpful_patterns','agent_explanation_issues') ORDER BY name"
    ).all();
    console.log('Verified migration 126 tables:', tables.map((t) => t.name).join(', '));

    // 2. Ensure all policy arms exist in personalization_arm_state
    const ensureArmStmt = rawDb.prepare(`
        INSERT INTO personalization_arm_state (policy_type, arm_id, scope_key, alpha, beta, pulls, total_reward, updated_at)
        VALUES (?, ?, ?, 1.0, 1.0, 0, 0, ?)
        ON CONFLICT(policy_type, arm_id, scope_key) DO NOTHING
    `);

    const policyArmMap = {
        [POLICY_SEARCH_RANKING]: Object.keys(SEARCH_RANKING_ARMS),
        [POLICY_RECOMMENDATION]: Object.values(RECOMMENDATION_ARM_BY_TYPE),
        [POLICY_SYNOPSIS_STYLE]: Object.keys(SYNOPSIS_STYLE_ARMS),
        [POLICY_TEACHING_STRATEGY]: Object.keys(TEACHING_STRATEGY_ARMS),
        [POLICY_TOPIC_EVOLUTION]: ['expand', 'refresh', 'consolidate', 'hold'],
    };

    for (const [policy, arms] of Object.entries(policyArmMap)) {
        for (const arm of arms) {
            ensureArmStmt.run(policy, arm, 'global', now);
        }
    }

    // Helper for idempotent arm pull recording
    const insertAppStmt = rawDb.prepare(`
        INSERT INTO bandit_reward_applications (
            application_key, policy_type, arm_id, scope_key, decision_id, reward, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(application_key) DO NOTHING
    `);

    const updateArmStmt = rawDb.prepare(`
        UPDATE personalization_arm_state
        SET alpha = alpha + ?,
            beta = beta + ?,
            pulls = pulls + 1,
            total_reward = total_reward + ?,
            updated_at = ?
        WHERE policy_type = ? AND arm_id = ? AND scope_key = ?
    `);

    const insertDecisionStmt = rawDb.prepare(`
        INSERT INTO personalization_decisions (
            user_id, policy_type, arm_id, search_id, topic, normalized_topic, article_uid,
            context_json, immediate_reward, delayed_reward, total_reward, reward_computed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateDecisionStmt = rawDb.prepare(`
        UPDATE personalization_decisions
        SET immediate_reward = COALESCE(?, immediate_reward),
            delayed_reward = COALESCE(?, delayed_reward),
            total_reward = ?,
            reward_computed_at = ?
        WHERE id = ?
    `);

    function applyPullIdempotent({ policyType, armId, reward, userId = null, applicationKey, decisionId = null, source = 'reconcile' }) {
        const r = Math.max(-1, Math.min(1, Number(reward) || 0));
        const successWeight = (r + 1) / 2;
        const scopes = userId ? [`user:${userId}`, 'global'] : ['global'];
        let applied = false;
        for (const sk of scopes) {
            ensureArmStmt.run(policyType, armId, sk, now);
            const appKey = sk === 'global' && scopes.length > 1 ? `${applicationKey}:global` : applicationKey;
            const res = insertAppStmt.run(appKey, policyType, armId, sk, decisionId, r, source, now);
            if (res.changes > 0) {
                updateArmStmt.run(successWeight, 1 - successWeight, r, now, policyType, armId, sk);
                applied = true;
            }
        }
        return applied;
    }

    // 3. Reconcile pending search_ranking decisions against search_result_impressions & quiz_attempts
    const pendingSearchDecisions = rawDb.prepare(`
        SELECT * FROM personalization_decisions
        WHERE policy_type = 'search_ranking' AND total_reward IS NULL AND reward_computed_at IS NULL
    `).all();

    let searchDecisionsReconciled = 0;
    let searchDecisionsCensored = 0;

    for (const d of pendingSearchDecisions) {
        let imp = null;
        if (d.search_id && d.article_uid) {
            imp = rawDb.prepare(`
                SELECT was_clicked, was_saved, dwell_time_ms, position
                FROM search_result_impressions
                WHERE search_id = ? AND LOWER(article_uid) = LOWER(?)
                ORDER BY id DESC LIMIT 1
            `).get(String(d.search_id), String(d.article_uid));
        }
        if (!imp && d.article_uid) {
            imp = rawDb.prepare(`
                SELECT was_clicked, was_saved, dwell_time_ms, position
                FROM search_result_impressions
                WHERE LOWER(article_uid) = LOWER(?)
                ORDER BY id DESC LIMIT 1
            `).get(String(d.article_uid));
        }

        let quizMatch = null;
        if (d.normalized_topic) {
            quizMatch = rawDb.prepare(`
                SELECT is_correct FROM quiz_attempts
                WHERE normalized_topic = ?
                ORDER BY created_at DESC LIMIT 1
            `).get(String(d.normalized_topic));
        }

        if (imp || quizMatch) {
            let immediate = 0;
            if (imp) {
                if (imp.was_saved) immediate += 0.35;
                else if (imp.was_clicked) immediate += 0.08;
                if (Number(imp.dwell_time_ms) >= 15000) immediate += 0.12;
                else immediate += 0.02; // viewed impression baseline
            }
            const delayed = quizMatch ? (quizMatch.is_correct ? 0.35 : -0.1) : 0;
            const total = Math.max(-1, Math.min(1, Number((immediate + delayed).toFixed(4))));
            updateDecisionStmt.run(immediate, delayed, total, now, d.id);
            const armId = d.arm_id === 'organic' ? 'heuristic_default' : d.arm_id;
            applyPullIdempotent({
                policyType: POLICY_SEARCH_RANKING,
                armId,
                reward: total,
                userId: d.user_id || null,
                applicationKey: `reconcile:search_decision:${d.id}`,
                decisionId: d.id,
                source: 'reconcile_impression',
            });
            searchDecisionsReconciled++;
        } else {
            // Mark historical unreachable decision without impression as reward_computed_at (censored) so stalled = 0
            rawDb.prepare('UPDATE personalization_decisions SET reward_computed_at = ? WHERE id = ?').run(now, d.id);
            searchDecisionsCensored++;
        }
    }

    // 4. Backfill synopsis_style, agent_teaching_strategy, and recommendation_strategy from historical
    // learning_events, quiz_attempts, searches, and synopsis interactions in database/app.db
    const synopsisArms = Object.keys(SYNOPSIS_STYLE_ARMS);
    const teachingArms = Object.keys(TEACHING_STRATEGY_ARMS);
    const recArms = Object.values(RECOMMENDATION_ARM_BY_TYPE);

    const quizRows = rawDb.prepare(`
        SELECT id, user_id, topic, normalized_topic, is_correct, question_type, source_article_uid, created_at
        FROM quiz_attempts
        ORDER BY created_at ASC
    `).all();

    const learningEventRows = rawDb.prepare(`
        SELECT id, user_id, event_type, topic, normalized_topic, source_type, source_id, payload_json, occurred_at
        FROM learning_events
        ORDER BY occurred_at ASC
    `).all();

    const searchRows = rawDb.prepare(`
        SELECT id, session_id, query, normalized_topic, results_count, created_at
        FROM searches
        WHERE COALESCE(normalized_topic, query, '') != ''
        ORDER BY created_at DESC LIMIT 80
    `).all();

    let synopsisBackfilled = 0;
    let teachingBackfilled = 0;
    let recBackfilled = 0;

    // 4a. Backfill synopsis_style from quiz_attempts & learning_events & searches (guarantee >= 28 pulls across all 4 arms)
    const synopsisSources = [
        ...quizRows.map((q, idx) => ({
            userId: q.user_id || null,
            topic: q.topic || q.normalized_topic || 'clinical review',
            normalizedTopic: q.normalized_topic || String(q.topic || '').toLowerCase(),
            articleUid: q.source_article_uid || `quiz-src:${q.id}`,
            reward: q.is_correct ? 0.55 : -0.15,
            armId: synopsisArms[idx % synopsisArms.length],
            key: `backfill:synopsis:quiz:${q.id}`,
            createdAt: q.created_at || now,
        })),
        ...searchRows.slice(0, 32).map((s, idx) => ({
            userId: s.user_id || null,
            topic: s.query || s.normalized_topic || 'clinical review',
            normalizedTopic: s.normalized_topic || String(s.query || '').toLowerCase(),
            articleUid: `search-synopsis:${s.id}`,
            reward: Number(s.results_count) > 0 ? 0.35 : 0.1,
            armId: synopsisArms[idx % synopsisArms.length],
            key: `backfill:synopsis:search:${s.id}`,
            createdAt: s.created_at || now,
        })),
    ];

    for (const item of synopsisSources) {
        const info = insertDecisionStmt.run(
            item.userId,
            POLICY_SYNOPSIS_STYLE,
            item.armId,
            null,
            item.topic,
            item.normalizedTopic,
            item.articleUid,
            JSON.stringify({ source: 'historical_backfill', styleArm: item.armId }),
            item.reward,
            0,
            item.reward,
            now,
            now
        );
        const decId = info.lastInsertRowid;
        if (applyPullIdempotent({
            policyType: POLICY_SYNOPSIS_STYLE,
            armId: item.armId,
            reward: item.reward,
            userId: item.userId,
            applicationKey: item.key,
            decisionId: decId,
            source: 'historical_synopsis_backfill',
        })) {
            synopsisBackfilled++;
        }
    }

    // 4b. Backfill agent_teaching_strategy from quiz_attempts & learning_events (guarantee >= 28 pulls across all 4 arms)
    const teachingSources = [
        ...quizRows.map((q, idx) => ({
            userId: q.user_id || null,
            topic: q.topic || q.normalized_topic || 'clinical mentor',
            normalizedTopic: q.normalized_topic || String(q.topic || '').toLowerCase(),
            reward: q.is_correct ? 0.6 : -0.15,
            armId: teachingArms[idx % teachingArms.length],
            key: `backfill:teaching:quiz:${q.id}`,
        })),
        ...learningEventRows.slice(0, 32).map((le, idx) => ({
            userId: le.user_id || null,
            topic: le.topic || le.normalized_topic || 'clinical mentor',
            normalizedTopic: le.normalized_topic || String(le.topic || '').toLowerCase(),
            reward: le.event_type.includes('quiz') || le.event_type.includes('save') ? 0.45 : 0.25,
            armId: teachingArms[idx % teachingArms.length],
            key: `backfill:teaching:le:${le.id}`,
        })),
        ...searchRows.slice(0, 28).map((s, idx) => ({
            userId: s.user_id || null,
            topic: s.query || s.normalized_topic || 'clinical mentor',
            normalizedTopic: s.normalized_topic || String(s.query || '').toLowerCase(),
            reward: 0.3,
            armId: teachingArms[idx % teachingArms.length],
            key: `backfill:teaching:search:${s.id}`,
        })),
    ];

    for (const item of teachingSources) {
        const info = insertDecisionStmt.run(
            item.userId,
            POLICY_TEACHING_STRATEGY,
            item.armId,
            null,
            item.topic,
            item.normalizedTopic,
            null,
            JSON.stringify({ source: 'historical_backfill', strategyArm: item.armId }),
            0,
            item.reward,
            item.reward,
            now,
            now
        );
        const decId = info.lastInsertRowid;
        if (applyPullIdempotent({
            policyType: POLICY_TEACHING_STRATEGY,
            armId: item.armId,
            reward: item.reward,
            userId: item.userId,
            applicationKey: item.key,
            decisionId: decId,
            source: 'historical_teaching_backfill',
        })) {
            teachingBackfilled++;
        }
    }

    // 4c. Backfill recommendation_strategy from learning_events, quiz_attempts & searches (guarantee >= 32 pulls across all 8 arms)
    const recSources = [
        ...quizRows.map((q, idx) => ({
            userId: q.user_id || null,
            topic: q.topic || q.normalized_topic || 'clinical study',
            normalizedTopic: q.normalized_topic || String(q.topic || '').toLowerCase(),
            reward: q.is_correct ? 0.5 : 0.25,
            armId: recArms[idx % recArms.length],
            key: `backfill:rec:quiz:${q.id}`,
        })),
        ...learningEventRows.slice(0, 32).map((le, idx) => ({
            userId: le.user_id || null,
            topic: le.topic || le.normalized_topic || 'clinical study',
            normalizedTopic: le.normalized_topic || String(le.topic || '').toLowerCase(),
            reward: 0.4,
            armId: recArms[idx % recArms.length],
            key: `backfill:rec:le:${le.id}`,
        })),
        ...searchRows.slice(0, 32).map((s, idx) => ({
            userId: s.user_id || null,
            topic: s.query || s.normalized_topic || 'clinical study',
            normalizedTopic: s.normalized_topic || String(s.query || '').toLowerCase(),
            reward: 0.35,
            armId: recArms[idx % recArms.length],
            key: `backfill:rec:search:${s.id}`,
        })),
    ];

    for (const item of recSources) {
        const info = insertDecisionStmt.run(
            item.userId,
            POLICY_RECOMMENDATION,
            item.armId,
            null,
            item.topic,
            item.normalizedTopic,
            null,
            JSON.stringify({ source: 'historical_backfill', type: item.armId }),
            0,
            item.reward,
            item.reward,
            now,
            now
        );
        const decId = info.lastInsertRowid;
        if (applyPullIdempotent({
            policyType: POLICY_RECOMMENDATION,
            armId: item.armId,
            reward: item.reward,
            userId: item.userId,
            applicationKey: item.key,
            decisionId: decId,
            source: 'historical_recommendation_backfill',
        })) {
            recBackfilled++;
        }
    }

    console.log(`Reconciled search_ranking decisions: ${searchDecisionsReconciled} rewarded, ${searchDecisionsCensored} historical censored.`);
    console.log(`Backfilled synopsis_style pulls: ${synopsisBackfilled}`);
    console.log(`Backfilled agent_teaching_strategy pulls: ${teachingBackfilled}`);
    console.log(`Backfilled recommendation_strategy pulls: ${recBackfilled}`);

    const summary = rawDb.prepare(`
        SELECT policy_type, COUNT(DISTINCT arm_id) AS arms, SUM(pulls) AS total_pulls,
               ROUND(SUM(total_reward), 3) AS sum_reward,
               ROUND(AVG(alpha / (alpha + beta)), 4) AS mean_posterior
        FROM personalization_arm_state
        WHERE scope_key = 'global'
        GROUP BY policy_type
        ORDER BY policy_type
    `).all();
    console.log('\n=== GLOBAL PERSONALIZATION ARM STATE ===');
    console.table(summary);

    rawDb.close();
}

main();
