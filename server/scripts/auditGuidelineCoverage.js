'use strict';

// A reproducible cohort audit: count recommendations using the serving gate,
// not just whether an organisation name is recognised.
const fs = require('fs');
const { loadEnv } = require('../../config');
loadEnv();
const db = require('../../database');
const { isIssuingBodyValue } = require('../utils/guidelineAttribution');
const { isServableGuideline } = require('../utils/guidelineQuality');

async function main() {
    const file = process.argv[2];
    if (!file) throw new Error('Usage: node auditGuidelineCoverage.js <topics.txt>');
    const topics = [...new Set(fs.readFileSync(file, 'utf8').split(/\r?\n/).map((s) => db.normalizeTopic(s)).filter(Boolean))];
    if (!topics.length) throw new Error('Topic file is empty');
    await db.connect();
    try {
        const rows = await db.all(`SELECT normalized_topic, source_body, recommendation_text, superseded_by_id FROM topic_guidelines WHERE normalized_topic IN (${topics.map(() => '?').join(',')})`, topics);
        const recognised = rows.filter((r) => isIssuingBodyValue(r.source_body));
        const servable = recognised.filter((r) => r.superseded_by_id == null && isServableGuideline(r));
        const covered = new Set(servable.map((r) => r.normalized_topic));
        console.log(JSON.stringify({
            scope: 'exact normalized cohort topics; no related-topic fallback',
            checkedAt: new Date().toISOString(), topics: topics.length,
            totalRows: rows.length, recognisedBodyRows: recognised.length,
            uncuratedRows: rows.length - recognised.length, servableRows: servable.length,
            recognisedBodyTopics: new Set(recognised.map((r) => r.normalized_topic)).size,
            servableTopics: covered.size, zeroServableTopics: topics.length - covered.size,
            remainingTopics: topics.filter((t) => !covered.has(t)),
        }, null, 2));
    } finally { await db.close(); }
}
main().catch((err) => { console.error(err.message); process.exitCode = 1; });
