'use strict';

const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');
const logger = require('../config/logger');
const { refreshGuidelineFullText } = require('../services/guideline/guidelineFullTextRefresh');

async function main() {
    await db.connect();
    const stats = await refreshGuidelineFullText(db, {
        limit: Number(process.env.LIMIT || 500),
        pauseMs: Number(process.env.PAUSE_MS || 400),
        log: logger,
    });
    console.log(JSON.stringify(stats, null, 2));
    await db.close();
}

main().catch((err) => {
    console.error('guideline full-text refresh failed:', err.message);
    process.exit(1);
});
