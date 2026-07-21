#!/usr/bin/env node
/**
 * Agent Quality Eval Script
 *
 * Measures whether agent conversations improve subsequent quiz performance
 * (learning efficacy) by correlating learning_events (agent_message ↔ mcq_answered).
 *
 * Usage:
 *   node scripts/eval-agent-quality.js [--days 30] [--format json|markdown|table]
 *
 * Outputs:
 *   - Console table with aggregated metrics
 *   - eval-results/agent-quality-{timestamp}.json (full cohort data)
 *   - eval-results/agent-quality-report.md (when --format=markdown)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
    const idx = args.indexOf(name);
    return idx !== -1 ? args[idx + 1] : fallback;
};

const DAYS = Math.min(90, Math.max(1, parseInt(flag('--days', '30'), 10) || 30));
const FORMAT = flag('--format', 'table');
const STRICT = args.includes('--strict');
const MIN_COHORT = Math.max(1, parseInt(flag('--min-cohort', process.env.AGENT_QUALITY_MIN_COHORT || '10'), 10) || 10);
const OUT_DIR = path.join(process.cwd(), 'eval-results');

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

// ============================================================
// Database helpers
// ============================================================

async function withDb(fn) {
    const db = require('../database');
    await db.connect();
    try {
        return await fn(db);
    } finally {
        // SQLite singleton doesn't need explicit close for read-only eval
    }
}

/** Dialect-safe cast: learning_events.occurred_at may be TEXT on PG restores. */
// AGENT_QUALITY_PG_CASTS_V2
function asTs(db, column) {
    return db.isPostgres ? `${column}::timestamptz` : column;
}

/** Dialect-safe timestamp offset for learning_events.occurred_at windows. */
function tsOffset(db, column, hours) {
    const sign = hours >= 0 ? '+' : '';
    if (db.isPostgres) {
        return `(${asTs(db, column)} + INTERVAL '${sign}${hours} hours')`;
    }
    return `datetime(${column}, '${sign}${hours} hours')`;
}

function nullSafeEq(db, left, right) {
    return db.isPostgres ? `${left} IS NOT DISTINCT FROM ${right}` : `${left} IS ${right}`;
}

function parsePayload(payloadJson) {
    try {
        if (payloadJson && typeof payloadJson === 'object') return payloadJson;
        return JSON.parse(payloadJson || '{}');
    } catch {
        return {};
    }
}

// ============================================================
// Cohort extraction
// ============================================================

async function extractAgentCohort(db, days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const preWindow = tsOffset(db, 'a.occurred_at', -24);
    const postWindow = tsOffset(db, 'a.occurred_at', 72);
    const claimEq = nullSafeEq(db, 'pre.claim_key', 'post.claim_key');

    // Find all agent_message events with subsequent mcq_answered events
    const rows = await db.all(
        `WITH agent_events AS (
            SELECT
                user_id,
                topic,
                normalized_topic,
                claim_key,
                occurred_at,
                payload_json
            FROM learning_events
            WHERE event_type = 'agent_message'
              AND ${asTs(db, 'occurred_at')} >= ${asTs(db, '?')}
              AND user_id IS NOT NULL
         ),
         pre_quiz AS (
            SELECT
                a.user_id,
                a.normalized_topic,
                a.claim_key,
                a.occurred_at AS agent_at,
                COUNT(*) AS pre_count,
                AVG(CASE WHEN le.payload_json LIKE '%"isCorrect":true%' THEN 1.0 ELSE 0.0 END) AS pre_accuracy
            FROM agent_events a
            JOIN learning_events le ON le.user_id = a.user_id
                AND le.normalized_topic = a.normalized_topic
                AND le.event_type = 'mcq_answered'
                AND ${asTs(db, 'le.occurred_at')} < ${asTs(db, 'a.occurred_at')}
                AND ${asTs(db, 'le.occurred_at')} >= ${preWindow}
            GROUP BY a.user_id, a.normalized_topic, a.claim_key, a.occurred_at
         ),
         post_quiz AS (
            SELECT
                a.user_id,
                a.normalized_topic,
                a.claim_key,
                a.occurred_at AS agent_at,
                COUNT(*) AS post_count,
                AVG(CASE WHEN le.payload_json LIKE '%"isCorrect":true%' THEN 1.0 ELSE 0.0 END) AS post_accuracy
            FROM agent_events a
            JOIN learning_events le ON le.user_id = a.user_id
                AND le.normalized_topic = a.normalized_topic
                AND le.event_type = 'mcq_answered'
                AND ${asTs(db, 'le.occurred_at')} > ${asTs(db, 'a.occurred_at')}
                AND ${asTs(db, 'le.occurred_at')} <= ${postWindow}
            GROUP BY a.user_id, a.normalized_topic, a.claim_key, a.occurred_at
         )
         SELECT
            pre.user_id,
            pre.normalized_topic AS topic,
            pre.claim_key,
            pre.agent_at,
            pre.pre_count,
            pre.pre_accuracy,
            post.post_count,
            post.post_accuracy
         FROM pre_quiz pre
         JOIN post_quiz post ON pre.user_id = post.user_id
            AND pre.normalized_topic = post.normalized_topic
            AND ${claimEq}
            AND pre.agent_at = post.agent_at
         WHERE pre.pre_count >= 1 AND post.post_count >= 1
         ORDER BY pre.agent_at DESC`,
        [since]
    );

    return rows.map((r) => ({
        userId: r.user_id,
        topic: r.topic,
        claimKey: r.claim_key,
        agentAt: r.agent_at,
        preCount: Number(r.pre_count),
        preAccuracy: Number(r.pre_accuracy ?? 0),
        postCount: Number(r.post_count),
        postAccuracy: Number(r.post_accuracy ?? 0),
        accuracyDelta: Number((r.post_accuracy ?? 0) - (r.pre_accuracy ?? 0)),
    }));
}

async function extractControlCohort(db, days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const postWindow = tsOffset(db, 'le1.occurred_at', 96);
    const sinceParam = asTs(db, '?');

    // Users who did quizzes pre→post in a 96h window but had NO agent_message between them
    const rows = await db.all(
        `WITH quiz_pairs AS (
            SELECT
                le1.user_id,
                le1.normalized_topic,
                le1.occurred_at AS pre_at,
                le2.occurred_at AS post_at,
                AVG(CASE WHEN le1.payload_json LIKE '%"isCorrect":true%' THEN 1.0 ELSE 0.0 END) AS pre_accuracy,
                AVG(CASE WHEN le2.payload_json LIKE '%"isCorrect":true%' THEN 1.0 ELSE 0.0 END) AS post_accuracy
            FROM learning_events le1
            JOIN learning_events le2 ON le1.user_id = le2.user_id
                AND le1.normalized_topic = le2.normalized_topic
                AND le1.event_type = 'mcq_answered'
                AND le2.event_type = 'mcq_answered'
                AND ${asTs(db, 'le2.occurred_at')} > ${asTs(db, 'le1.occurred_at')}
                AND ${asTs(db, 'le2.occurred_at')} <= ${postWindow}
            WHERE ${asTs(db, 'le1.occurred_at')} >= ${sinceParam}
              AND le1.user_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM learning_events lea
                  WHERE lea.user_id = le1.user_id
                    AND lea.normalized_topic = le1.normalized_topic
                    AND lea.event_type = 'agent_message'
                    AND ${asTs(db, 'lea.occurred_at')} > ${asTs(db, 'le1.occurred_at')}
                    AND ${asTs(db, 'lea.occurred_at')} < ${asTs(db, 'le2.occurred_at')}
              )
            GROUP BY le1.user_id, le1.normalized_topic, le1.occurred_at
         )
         SELECT
            user_id,
            normalized_topic AS topic,
            pre_accuracy,
            post_accuracy
         FROM quiz_pairs
         WHERE pre_accuracy IS NOT NULL AND post_accuracy IS NOT NULL`,
        [since]
    );

    return rows.map((r) => ({
        userId: r.user_id,
        topic: r.topic,
        preAccuracy: Number(r.pre_accuracy ?? 0),
        postAccuracy: Number(r.post_accuracy ?? 0),
        accuracyDelta: Number((r.post_accuracy ?? 0) - (r.pre_accuracy ?? 0)),
    }));
}

async function extractLearningSignalSummary(db, days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const watchedTypes = [
        'agent_message',
        'agent_turn_memory',
        'agent_session_reflection',
        'feedback_helpful',
        'feedback_confusing',
        'mcq_answered',
        'quiz_session_feedback',
        'paper_click',
        'paper_save',
        'paper_dwell',
    ];
    const placeholders = watchedTypes.map(() => '?').join(',');
    const rows = await db.all(
        `SELECT event_type, COUNT(*) AS count
         FROM learning_events
         WHERE ${asTs(db, 'occurred_at')} >= ${asTs(db, '?')}
           AND event_type IN (${placeholders})
         GROUP BY event_type
         ORDER BY event_type`,
        [since, ...watchedTypes]
    ).catch(() => []);

    const counts = Object.fromEntries(watchedTypes.map((type) => [type, 0]));
    for (const row of rows || []) counts[row.event_type] = Number(row.count || 0);
    return counts;
}

async function extractRecentProfileDeltas(db, days, limit = 10) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const rows = await db.all(
        `SELECT user_id, topic, occurred_at, payload_json
         FROM learning_events
         WHERE ${asTs(db, 'occurred_at')} >= ${asTs(db, '?')}
           AND event_type IN ('agent_turn_memory', 'agent_session_reflection')
         ORDER BY ${asTs(db, 'occurred_at')} DESC
         LIMIT ?`,
        [since, limit]
    ).catch(() => []);

    return (rows || []).map((row) => {
        const payload = parsePayload(row.payload_json);
        return {
            userId: row.user_id,
            topic: row.topic,
            occurredAt: row.occurred_at,
            focusAreas: Array.isArray(payload.focusAreas) ? payload.focusAreas.slice(0, 4) : [],
            misconceptions: Array.isArray(payload.misconceptions) ? payload.misconceptions.slice(0, 4) : [],
            breakthroughMoments: Array.isArray(payload.breakthroughMoments) ? payload.breakthroughMoments.slice(0, 4) : [],
            learningPatterns: Array.isArray(payload.learningPatterns) ? payload.learningPatterns.slice(0, 4) : [],
            nextStudyFocus: payload.nextStudyFocus || null,
            summaryChars: Number(payload.summaryChars || 0),
        };
    });
}

// ============================================================
// Metrics
// ============================================================

function computeMetrics(cohort, label) {
    if (cohort.length === 0) {
        return { label, n: 0, meanDelta: 0, medianDelta: 0, p25: 0, p75: 0, significant: false };
    }
    const deltas = cohort.map((c) => c.accuracyDelta).sort((a, b) => a - b);
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const median = deltas.length % 2 === 0
        ? (deltas[deltas.length / 2 - 1] + deltas[deltas.length / 2]) / 2
        : deltas[Math.floor(deltas.length / 2)];
    const p25 = deltas[Math.floor(deltas.length * 0.25)] ?? deltas[0];
    const p75 = deltas[Math.floor(deltas.length * 0.75)] ?? deltas[deltas.length - 1];

    // Very rough significance: if mean delta > 0 and > 1 SD from 0
    const variance = deltas.reduce((sum, d) => sum + (d - mean) ** 2, 0) / deltas.length;
    const sd = Math.sqrt(variance);
    const significant = mean > 0 && mean > sd / Math.sqrt(deltas.length);

    return { label, n: cohort.length, meanDelta: mean, medianDelta: median, p25, p75, significant };
}

function breakdownByTopic(agentCohort) {
    const byTopic = {};
    for (const row of agentCohort) {
        if (!byTopic[row.topic]) byTopic[row.topic] = [];
        byTopic[row.topic].push(row);
    }
    return Object.entries(byTopic).map(([topic, rows]) => ({
        topic,
        ...computeMetrics(rows, topic),
    })).sort((a, b) => b.meanDelta - a.meanDelta);
}

// ============================================================
// Output formatters
// ============================================================

function printTable(metrics, controlMetrics, signalSummary = {}, profileDeltas = []) {
    console.log('\n📊 Agent Quality Evaluation Results\n');
    console.log(`Agent cohort:  n=${metrics.n}  meanΔ=${(metrics.meanDelta * 100).toFixed(1)}%  medianΔ=${(metrics.medianDelta * 100).toFixed(1)}%  p25=${(metrics.p25 * 100).toFixed(1)}%  p75=${(metrics.p75 * 100).toFixed(1)}%  significant=${metrics.significant}`);
    console.log(`Control cohort: n=${controlMetrics.n}  meanΔ=${(controlMetrics.meanDelta * 100).toFixed(1)}%  medianΔ=${(controlMetrics.medianDelta * 100).toFixed(1)}%  p25=${(controlMetrics.p25 * 100).toFixed(1)}%  p75=${(controlMetrics.p75 * 100).toFixed(1)}%  significant=${controlMetrics.significant}`);
    console.log('\nLearning signal counts:');
    for (const [type, count] of Object.entries(signalSummary)) {
        console.log(`  ${type.padEnd(24)} ${count}`);
    }
    console.log(`\nRecent profile deltas: ${profileDeltas.length}`);
    for (const delta of profileDeltas.slice(0, 3)) {
        const focus = [
            ...(delta.focusAreas || []),
            ...(delta.misconceptions || []),
            ...(delta.learningPatterns || []),
        ].filter(Boolean).slice(0, 3).join('; ');
        console.log(`  ${delta.topic || 'unknown'} - ${focus || 'no compact delta fields'}`);
    }
    console.log();
}

function buildMarkdown(agentCohort, controlCohort, metrics, controlMetrics, topicBreakdown, signalSummary = {}, profileDeltas = []) {
    const ts = new Date().toISOString();
    return `# Agent Quality Evaluation Report

**Generated:** ${ts}  
**Evaluation window:** last ${DAYS} days

## Summary

| Cohort | n | Mean Δ | Median Δ | p25 | p75 | Significant? |
|--------|---|--------|----------|-----|-----|--------------|
| Agent (chat → quiz) | ${metrics.n} | ${(metrics.meanDelta * 100).toFixed(1)}% | ${(metrics.medianDelta * 100).toFixed(1)}% | ${(metrics.p25 * 100).toFixed(1)}% | ${(metrics.p75 * 100).toFixed(1)}% | ${metrics.significant ? '✅ Yes' : '❌ No'} |
| Control (quiz only) | ${controlMetrics.n} | ${(controlMetrics.meanDelta * 100).toFixed(1)}% | ${(controlMetrics.medianDelta * 100).toFixed(1)}% | ${(controlMetrics.p25 * 100).toFixed(1)}% | ${(controlMetrics.p75 * 100).toFixed(1)}% | ${controlMetrics.significant ? '✅ Yes' : '❌ No'} |

## Topic Breakdown

| Topic | n | Mean Δ | Median Δ |
|-------|---|--------|----------|
${topicBreakdown.map((t) => `| ${t.topic} | ${t.n} | ${(t.meanDelta * 100).toFixed(1)}% | ${(t.medianDelta * 100).toFixed(1)}% |`).join('\n')}

## Learning Signal Coverage

| Event type | Count |
|------------|------:|
${Object.entries(signalSummary).map(([type, count]) => `| ${type} | ${count} |`).join('\n')}

## Recent Profile Deltas

| Topic | Focus areas | Misconceptions | Breakthroughs / patterns |
|-------|-------------|----------------|--------------------------|
${profileDeltas.length
        ? profileDeltas.map((d) => `| ${d.topic || ''} | ${(d.focusAreas || []).join('; ')} | ${(d.misconceptions || []).join('; ')} | ${[...(d.breakthroughMoments || []), ...(d.learningPatterns || [])].join('; ')} |`).join('\n')
        : '| _No agent-memory profile deltas found in this evaluation window._ | | | |'}

## Interpretation

${metrics.meanDelta > controlMetrics.meanDelta
        ? `- **Agent cohort outperformed control** by ${((metrics.meanDelta - controlMetrics.meanDelta) * 100).toFixed(1)} percentage points on average.`
        : `- **Control cohort matched or outperformed agent** by ${((controlMetrics.meanDelta - metrics.meanDelta) * 100).toFixed(1)} percentage points on average.`}
- ${metrics.significant ? 'The agent effect is statistically notable (mean > SEM).' : 'The agent effect is not statistically notable (mean ≤ SEM).'}

---
*Report generated by scripts/eval-agent-quality.js*
`;
}

// ============================================================
// Main
// ============================================================

async function main() {
    console.log(`🔬 Running agent quality eval (last ${DAYS} days)...\n`);

    const { agentCohort, controlCohort, signalSummary, profileDeltas } = await withDb(async (db) => {
        const [agent, control, signals, deltas] = await Promise.all([
            extractAgentCohort(db, DAYS),
            extractControlCohort(db, DAYS),
            extractLearningSignalSummary(db, DAYS),
            extractRecentProfileDeltas(db, DAYS),
        ]);
        return {
            agentCohort: agent,
            controlCohort: control,
            signalSummary: signals,
            profileDeltas: deltas,
        };
    });

    const metrics = computeMetrics(agentCohort, 'agent');
    const controlMetrics = computeMetrics(controlCohort, 'control');
    const topicBreakdown = breakdownByTopic(agentCohort);

    printTable(metrics, controlMetrics, signalSummary, profileDeltas);

    // JSON output
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(OUT_DIR, `agent-quality-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        days: DAYS,
        metrics,
        controlMetrics,
        signalSummary,
        profileDeltas,
        topicBreakdown,
        cohort: agentCohort,
        control: controlCohort,
    }, null, 2));
    console.log(`📁 Full data written to ${jsonPath}\n`);

    // Markdown output
    if (FORMAT === 'markdown') {
        const mdPath = path.join(OUT_DIR, 'agent-quality-report.md');
        const md = buildMarkdown(agentCohort, controlCohort, metrics, controlMetrics, topicBreakdown, signalSummary, profileDeltas);
        fs.writeFileSync(mdPath, md);
        console.log(`📄 Markdown report written to ${mdPath}\n`);
    }

    // Cohort density gate (release / --strict): empty or tiny n must not silently pass.
    if (STRICT && agentCohort.length < MIN_COHORT) {
        console.error(`🚨 STRICT GATE FAILED: agent cohort n=${agentCohort.length} < min ${MIN_COHORT}`);
        process.exit(1);
    }
    if (!STRICT && agentCohort.length === 0) {
        console.log('ℹ️  No agent cohort rows — skipping efficacy gate (pass). Use --strict for release.');
        process.exit(0);
    }

    // Exit non-zero if agent cohort underperforms control by >5pp (quality gate)
    const underperformance = controlMetrics.meanDelta - metrics.meanDelta;
    if (underperformance > 0.05) {
        console.error(`🚨 QUALITY GATE FAILED: Agent underperforms control by ${(underperformance * 100).toFixed(1)}pp`);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
