#!/usr/bin/env node
'use strict';

const { collectQualityMetrics } = require('../server/services/qualityMetricsService');

async function main() {
    const days = Math.min(90, Math.max(7, parseInt(process.argv[2], 10) || 30));
    const db = require('../database');
    await db.connect();
    const metrics = await collectQualityMetrics(db, days);
    console.log(JSON.stringify(metrics, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
