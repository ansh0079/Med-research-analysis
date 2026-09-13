#!/usr/bin/env node
'use strict';

const path = require('path');
const root = process.env.SIGNALMD_APP_ROOT || path.resolve(__dirname, '..');
require(path.join(root, 'config')).loadEnv();
const db = require(path.join(root, 'database'));

async function main() {
    await db.connect();
    try {
        const documents = await db.all(`SELECT full_text_source, COUNT(*) AS documents,
            SUM(CASE WHEN full_text IS NOT NULL AND LENGTH(full_text) > 0 THEN 1 ELSE 0 END) AS with_text,
            SUM(CASE WHEN synopsis_json IS NOT NULL THEN 1 ELSE 0 END) AS with_synopsis
            FROM guideline_documents GROUP BY full_text_source`);
        const jobs = await db.all(`SELECT status, COUNT(*) AS jobs FROM ai_generation_jobs GROUP BY status`);
        const queued = await db.all(`SELECT job_type, COUNT(*) AS jobs, MIN(updated_at) AS oldest,
            MAX(updated_at) AS newest FROM ai_generation_jobs WHERE status = 'queued' GROUP BY job_type`);
        const events = await db.all(`SELECT metadata FROM analytics WHERE event_type = 'search' ORDER BY created_at DESC LIMIT 500`);
        const stages = {};
        for (const event of events) {
            let meta;
            try { meta = typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata; } catch { continue; }
            if (meta?.resultSetCacheHit) continue;
            for (const [stage, value] of Object.entries(meta?.timings || {})) {
                if (value != null && Number.isFinite(Number(value))) (stages[stage] ||= []).push(Number(value));
            }
        }
        const recentStageTimings = Object.fromEntries(Object.entries(stages).map(([stage, values]) => {
            values.sort((a, b) => a - b);
            return [stage, { samples: values.length, p50Ms: values[Math.ceil(values.length * 0.5) - 1], p95Ms: values[Math.ceil(values.length * 0.95) - 1] }];
        }));
        const { collectSearchQualityDashboard } = require(path.join(root, 'server/services/searchQualityDashboardService'));
        const dashboard = await collectSearchQualityDashboard(db, { days: 7 });
        console.log(JSON.stringify({ generatedAt: new Date().toISOString(), documents, jobs, queued, recentStageTimings,
            search: dashboard.summary, performance: dashboard.performance || null,
            learning: dashboard.learning || null }, null, 2));
    } finally { await db.close(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
