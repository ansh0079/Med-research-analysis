#!/usr/bin/env node
'use strict';

/**
 * Populate topics that have no papers and/or no recognised servable guidelines.
 *
 * Default: import checked-in curated literature packs (no live LLM/PubMed).
 * Optional --discover: for remaining empty gap topics, run unified evidence
 * search + PubMed guideline discovery.
 *
 * Usage:
 *   node server/scripts/populateEmptyTopics.js
 *   node server/scripts/populateEmptyTopics.js --literature path/to/pack.json
 *   node server/scripts/populateEmptyTopics.js --gaps server/data/topic-gaps/active-topics-no-guideline-no-paper.csv
 *   node server/scripts/populateEmptyTopics.js --discover --limit 20
 *   node server/scripts/populateEmptyTopics.js --dry-run
 *   node server/scripts/populateEmptyTopics.js --fetch-links
 *   node server/scripts/populateEmptyTopics.js --no-fetch-links
 *   node server/scripts/populateEmptyTopics.js --extract-pdf
 *   node server/scripts/populateEmptyTopics.js --no-extract-pdf
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { loadEnv, serverConfig } = require('../../config');
loadEnv();

const db = require('../../database');
const { getSharedAiService } = require('../services/aiService');
const { safeFetch } = require('../utils/fetch');
const {
    parseLiteratureFile,
    parseGapCsv,
    importLiteraturePack,
    topicPopulationStatus,
} = require('../services/topicLiteratureImportService');

const ROOT = path.join(__dirname, '../..');
const DEFAULT_PACK_DIR = path.join(ROOT, 'server/data/literature-packs');
const DEFAULT_GAPS = [
    path.join(ROOT, 'server/data/topic-gaps/active-topics-no-guideline-no-paper.csv'),
    path.join(ROOT, 'server/data/topic-gaps/cohort-174-no-recognised-servable-guideline.csv'),
];

function defaultLiteraturePacks() {
    if (!fs.existsSync(DEFAULT_PACK_DIR)) return [];
    return fs.readdirSync(DEFAULT_PACK_DIR)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => path.join(DEFAULT_PACK_DIR, name));
}

function parseArgs(argv) {
    const opts = {
        literature: [],
        gaps: [],
        discover: false,
        dryRun: false,
        force: false,
        limit: Infinity,
        sleepMs: 1200,
        fetchLinks: null,
        extractPdf: null,
        fetchSleepMs: 250,
    };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        const next = argv[i + 1];
        if (arg === '--literature' && next) {
            opts.literature.push(next);
            i += 1;
        } else if (arg === '--gaps' && next) {
            opts.gaps.push(next);
            i += 1;
        } else if (arg === '--limit' && next) {
            opts.limit = Math.max(1, parseInt(next, 10) || 1);
            i += 1;
        } else if (arg === '--sleep-ms' && next) {
            opts.sleepMs = Math.max(0, parseInt(next, 10) || 0);
            i += 1;
        } else if (arg === '--fetch-sleep-ms' && next) {
            opts.fetchSleepMs = Math.max(0, parseInt(next, 10) || 0);
            i += 1;
        } else if (arg === '--discover') {
            opts.discover = true;
        } else if (arg === '--dry-run') {
            opts.dryRun = true;
        } else if (arg === '--force') {
            opts.force = true;
        } else if (arg === '--fetch-links') {
            opts.fetchLinks = true;
        } else if (arg === '--no-fetch-links') {
            opts.fetchLinks = false;
        } else if (arg === '--extract-pdf') {
            opts.extractPdf = true;
        } else if (arg === '--no-extract-pdf') {
            opts.extractPdf = false;
        }
    }
    if (!opts.literature.length) {
        opts.literature.push(...defaultLiteraturePacks());
    }
    if (!opts.gaps.length) {
        opts.gaps.push(...DEFAULT_GAPS.filter((file) => fs.existsSync(file)));
    }
    return opts;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadGapTopics(files) {
    const seen = new Set();
    const topics = [];
    for (const file of files) {
        if (!fs.existsSync(file)) {
            console.warn(`Gap list not found: ${file}`);
            continue;
        }
        const rows = parseGapCsv(fs.readFileSync(file, 'utf8'));
        for (const row of rows) {
            const key = row.normalizedTopic || row.topic.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            topics.push(row);
        }
    }
    return topics;
}

async function discoverTopic(topic, { dryRun }) {
    if (dryRun) {
        return { topic, status: 'dry_run_discover' };
    }
    const { fetchUnifiedEvidence } = require('../services/unifiedEvidenceSearch');
    const { persistSearchedArticles } = require('../services/articlePersistenceService');
    const { discoverGuidelinesForTopic } = require('../services/guidelineService');
    const { mergeSourceArticles } = require('../services/flagshipTopicOps');

    const articles = await fetchUnifiedEvidence({
        query: topic,
        safeLimit: 16,
        sourceList: ['pubmed', 'openalex', 'semantic'],
        serverConfig,
        fetch: safeFetch,
        vectorList: [],
    });
    if (articles.length) {
        await persistSearchedArticles(db, articles, topic);
        const existing = await db.getTopicKnowledge(topic).catch(() => null);
        const incoming = articles.slice(0, 12).map((article, index) => ({
            sourceIndex: index + 1,
            uid: article.uid,
            pmid: article.pmid || null,
            doi: article.doi || null,
            title: article.title || null,
            source: article._source || article.source || null,
            pubdate: article.pubdate || article.year || null,
        }));
        const merged = mergeSourceArticles(existing?.sourceArticles || [], incoming);
        const protectedStatus = ['human_reviewed', 'locked', 'verified'].includes(
            String(existing?.status || '').toLowerCase()
        );
        if (!protectedStatus && typeof db.upsertTopicKnowledge === 'function') {
            await db.upsertTopicKnowledge(
                topic,
                {
                    ...(existing?.knowledge || {}),
                    mentorMessage: existing?.knowledge?.mentorMessage
                        || `${topic}: populated from live evidence discovery.`,
                    seminalPapers: merged.slice(0, 8),
                    seededFrom: existing?.knowledge?.seededFrom || 'populateEmptyTopics.discover',
                    lastDiscoverAt: new Date().toISOString(),
                },
                merged,
                existing ? 'ai_refreshed' : 'ai_generated',
                Math.max(Number(existing?.confidence || 0), 0.6)
            );
        }
    }

    const aiService = getSharedAiService({ serverConfig, fetchImpl: safeFetch });
    const guidelines = await discoverGuidelinesForTopic(topic, { db, serverConfig, aiService });
    return {
        topic,
        status: 'discovered',
        articleCount: articles.length,
        guidelineCount: Array.isArray(guidelines) ? guidelines.length : 0,
    };
}

async function main() {
    const opts = parseArgs(process.argv.slice(2));
    opts.fetchLinks = opts.fetchLinks == null ? !opts.dryRun : opts.fetchLinks;
    opts.extractPdf = opts.extractPdf == null ? opts.fetchLinks : opts.extractPdf;
    console.log('Populate empty topics');
    console.log(`  literature: ${opts.literature.join(', ') || '(none)'}`);
    console.log(`  gaps: ${opts.gaps.join(', ') || '(none)'}`);
    console.log(`  discover=${opts.discover} dryRun=${opts.dryRun} force=${opts.force} limit=${opts.limit} fetchLinks=${opts.fetchLinks} extractPdf=${opts.extractPdf}`);

    await db.connect();
    if (typeof db.runMigrations === 'function') {
        await db.runMigrations();
    }

    const packRows = [];
    for (const file of opts.literature) {
        const rows = parseLiteratureFile(file);
        console.log(`  loaded ${rows.length} curated topics from ${path.relative(ROOT, file)}`);
        packRows.push(...rows);
    }

    const imported = packRows.length
        ? await importLiteraturePack(db, packRows.slice(0, opts.limit), {
            dryRun: opts.dryRun,
            force: opts.force,
            fetchLinks: opts.fetchLinks,
            extractPdf: opts.extractPdf,
            fetchImpl: safeFetch,
            serverConfig,
            fetchSleepMs: opts.fetchSleepMs,
        })
        : { topicCount: 0, articleCount: 0, guidelineCount: 0, servableGuidelineCount: 0, fetchedAbstractCount: 0, pdfIndexedCount: 0, results: [] };

    console.log(`\nCurated import: topics=${imported.topicCount} articles=${imported.articleCount} guidelines=${imported.guidelineCount} servable=${imported.servableGuidelineCount} fetchedAbstracts=${imported.fetchedAbstractCount || 0} pdfIndexed=${imported.pdfIndexedCount || 0}`);
    for (const row of imported.results) {
        if (row.skipped) {
            console.log(`  · ${row.topic} skipped (${row.reason})`);
            continue;
        }
        const fetchNote = (row.fetchResults || [])
            .map((item) => `${item.sources.join('+') || 'none'}:${item.abstractChars}c`)
            .join(',');
        console.log(`  · ${row.topic}: papers=${row.articleCount} guidelines=${row.guidelineCount} servable=${row.servableGuidelineCount} trusted=${row.trustedGuidelineCount}${fetchNote ? ` fetch=${fetchNote}` : ''}`);
    }

    const gapTopics = loadGapTopics(opts.gaps).slice(0, Number.isFinite(opts.limit) ? opts.limit : undefined);
    const coverage = [];
    for (const row of gapTopics) {
        coverage.push(await topicPopulationStatus(db, row.topic));
    }
    const stillEmpty = coverage.filter((row) => row.needsPapers && row.needsGuidelines);
    const stillNoGuideline = coverage.filter((row) => row.needsGuidelines);

    console.log(`\nGap coverage: listed=${coverage.length} still-empty=${stillEmpty.length} still-no-guideline=${stillNoGuideline.length}`);

    const discoverResults = [];
    if (opts.discover) {
        const pending = stillEmpty.concat(stillNoGuideline.filter((row) => !stillEmpty.includes(row)));
        const unique = [];
        const seen = new Set();
        for (const row of pending) {
            if (seen.has(row.normalizedTopic)) continue;
            seen.add(row.normalizedTopic);
            unique.push(row);
        }
        console.log(`\nLive discovery for ${Math.min(unique.length, opts.limit)} remaining topics…`);
        for (const row of unique.slice(0, opts.limit)) {
            try {
                const result = await discoverTopic(row.topic, opts);
                discoverResults.push(result);
                console.log(`  · ${row.topic}: ${result.status} papers=${result.articleCount || 0} guidelines=${result.guidelineCount || 0}`);
            } catch (err) {
                console.warn(`  · ${row.topic}: discover failed (${err.message})`);
                discoverResults.push({ topic: row.topic, status: 'failed', error: err.message });
            }
            if (opts.sleepMs) await sleep(opts.sleepMs);
        }
    } else if (stillEmpty.length || stillNoGuideline.length) {
        console.log('\nRemaining empty topics were not live-discovered. Re-run with --discover after adding the next literature pack, or to fill from PubMed.');
    }

    if (typeof db.close === 'function') await db.close();
    return { imported, coverage, discoverResults };
}

if (require.main === module) {
    main().catch((err) => {
        console.error('populateEmptyTopics failed:', err);
        process.exit(1);
    });
}

module.exports = { parseArgs, loadGapTopics, defaultLiteraturePacks, main };
