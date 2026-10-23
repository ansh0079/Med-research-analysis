'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../database');

const VERIFIED_JSON_PATH = path.join(__dirname, '..', 'database', 'seeds', 'verified_pubmed_pmids.json');

const STOP = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'without', 'management', 'guideline',
    'guidelines', 'study', 'trial', 'trials', 'treatment', 'clinical', 'versus', 'from',
    'after', 'before', 'adults', 'children', 'people', 'disease', 'review', 'systematic',
    'therapy', 'therapies', 'diagnosis', 'randomized', 'randomised', 'phase', 'results',
    'cohort', 'retrospective', 'prospective', 'international', 'system', 'effect',
    'effects', 'outcomes', 'outcome', 'analysis', 'using', 'based', 'associated', 'risk',
    'care', 'practice', 'update', 'updated', 'american', 'european', 'society',
    'association', 'college', 'national', 'world', 'health', 'organization', 'first',
    'line', 'second', 'early', 'late', 'high', 'dose', 'low', 'combined', 'plus', 'alone',
    'open', 'label', 'double', 'blind', 'placebo', 'controlled', 'multicenter', 'multi',
    'institutional', 'report', 'group', 'working', 'task', 'force', 'consensus',
    'statement', 'recommendations', 'recommendation', 'approach', 'approaches', 'new',
    'novel', 'current', 'modern', 'standard', 'optimal', 'initial', 'long', 'term',
    'short', 'year', 'years', 'patients', 'patient'
]);

function domainTokens(s) {
    return new Set(
        String(s || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w))
    );
}

function titlesMatch(expectedTitle, actualPubmedTitle) {
    if (!expectedTitle || !actualPubmedTitle) return false;
    const wordsA = domainTokens(expectedTitle);
    const wordsB = domainTokens(actualPubmedTitle);
    if (wordsA.size === 0 || wordsB.size === 0) return false;

    let overlap = 0;
    for (const w of wordsA) {
        if (wordsB.has(w)) overlap++;
    }
    const minSize = Math.min(wordsA.size, wordsB.size) || 1;
    const ratio = overlap / minSize;
    return (overlap >= 2 && ratio >= 0.34) || (overlap >= 1 && minSize <= 2 && ratio >= 0.5) || ratio >= 0.5;
}

function normalizeOptions(options) {
    if (Array.isArray(options)) {
        return options.map((opt, idx) => {
            const str = String(opt || '').trim();
            const prefix = ['A', 'B', 'C', 'D', 'E'][idx];
            if (/^[A-E][:.)]\s*/i.test(str)) {
                return str;
            }
            return prefix ? `${prefix}: ${str}` : str;
        });
    }
    if (options && typeof options === 'object') {
        const letters = ['A', 'B', 'C', 'D', 'E'];
        const out = [];
        for (const L of letters) {
            if (options[L] !== undefined && options[L] !== null) {
                out.push(`${L}: ${String(options[L]).trim()}`);
            }
        }
        if (out.length > 0) return out;
        return Object.entries(options).map(([k, v]) => `${k.toUpperCase()}: ${String(v).trim()}`);
    }
    return [];
}

async function run() {
    await db.connect();
    console.log('--- Step 1: Align Curricula Slug ---');
    const cur = await db.get("SELECT id, slug FROM curricula WHERE slug = 'core-clinical-topics'");
    if (cur) {
        await db.run("UPDATE curricula SET slug = 'specialty-clinical-topics' WHERE id = ?", [cur.id]);
        console.log(`Updated curriculum ${cur.id} slug to 'specialty-clinical-topics'`);
    } else {
        console.log('Curriculum slug already aligned or not found');
    }

    console.log('\n--- Step 2: Delete Empty MCQ Shell Rows ---');
    const mcqRows = await db.all("SELECT id, object_type, object_payload FROM teaching_objects WHERE object_type LIKE '%mcq%'");
    let deletedCount = 0;
    for (const r of mcqRows) {
        try {
            const p = JSON.parse(r.object_payload || '{}');
            if (!Array.isArray(p.mcqs) || p.mcqs.length === 0) {
                await db.run("DELETE FROM teaching_objects WHERE id = ?", [r.id]);
                deletedCount++;
            }
        } catch (e) {
            // invalid json, also delete
            await db.run("DELETE FROM teaching_objects WHERE id = ?", [r.id]);
            deletedCount++;
        }
    }
    console.log(`Deleted ${deletedCount} empty shell MCQ rows`);

    console.log('\n--- Step 3: Normalize MCQ Options and CorrectAnswer ---');
    const remainingMcqRows = await db.all("SELECT id, object_type, object_payload FROM teaching_objects WHERE object_type LIKE '%mcq%'");
    let updatedPayloadCount = 0;
    let questionsFixed = 0;

    for (const r of remainingMcqRows) {
        let changed = false;
        try {
            const p = JSON.parse(r.object_payload || '{}');
            if (Array.isArray(p.mcqs)) {
                for (const q of p.mcqs) {
                    if (!Array.isArray(q.options) || (q.correct && !q.correctAnswer)) {
                        q.options = normalizeOptions(q.options);
                        q.correctAnswer = q.correctAnswer || q.correct;
                        changed = true;
                        questionsFixed++;
                    }
                }
            }
            if (changed) {
                await db.run("UPDATE teaching_objects SET object_payload = ? WHERE id = ?", [JSON.stringify(p), r.id]);
                updatedPayloadCount++;
            }
        } catch (e) {
            console.error('Error updating MCQ payload for id', r.id, e.message);
        }
    }
    console.log(`Updated ${updatedPayloadCount} teaching_objects rows, normalized ${questionsFixed} questions`);

    console.log('\n--- Step 4: Backfill teaching_objects.curriculum_topic_id ---');
    const cTopics = await db.all("SELECT id, display_name FROM curriculum_topics ORDER BY LENGTH(display_name) DESC");
    const allObjects = await db.all("SELECT id, object_type, object_key, normalized_topic, topic, curriculum_topic_id FROM teaching_objects WHERE curriculum_topic_id IS NULL");
    let backfilledCount = 0;

    for (const obj of allObjects) {
        let topicId = await db.resolveCurriculumTopicId(obj.normalized_topic || obj.topic);
        if (!topicId && obj.object_key) {
            const stripped = obj.object_key.replace(/^[a-z_-]+:[0-9]*:?/, '').replace(/-/g, ' ');
            topicId = await db.resolveCurriculumTopicId(stripped);
        }
        if (!topicId) {
            const norm = (obj.normalized_topic || obj.topic || '').toLowerCase().trim();
            for (const ct of cTopics) {
                const ctName = ct.display_name.toLowerCase().trim();
                if (ctName.length >= 4 && (norm.includes(ctName) || ctName.includes(norm))) {
                    topicId = ct.id;
                    break;
                }
            }
        }
        if (topicId) {
            await db.run("UPDATE teaching_objects SET curriculum_topic_id = ? WHERE id = ?", [topicId, obj.id]);
            backfilledCount++;
        }
    }
    console.log(`Backfilled curriculum_topic_id on ${backfilledCount} of ${allObjects.length} teaching_objects`);

    console.log('\n--- Step 5: Sanitize Collided & Unverified PMIDs in topic_knowledge.source_articles ---');
    let verifiedPmids = null;
    if (fs.existsSync(VERIFIED_JSON_PATH)) {
        try {
            verifiedPmids = JSON.parse(fs.readFileSync(VERIFIED_JSON_PATH, 'utf8'));
            console.log(`Loaded ${Object.keys(verifiedPmids).length} PubMed esummary-verified PMIDs from seed dictionary`);
        } catch (e) {
            console.warn('Could not parse verified_pubmed_pmids.json:', e.message);
        }
    }

    const parseJsonArray = (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
            try {
                const parsed = JSON.parse(val);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    const tkRows = await db.all("SELECT id, topic, source_articles FROM topic_knowledge");
    const pmidTitles = new Map();
    for (const r of tkRows) {
        const articles = parseJsonArray(r.source_articles);
        for (const a of articles) {
            const pmid = String(a.pmid || a.uid || '').replace(/^(?:pmid|pubmed):?/i, '').trim();
            if (/^\d+$/.test(pmid)) {
                const normTitle = String(a.title || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
                if (!pmidTitles.has(pmid)) pmidTitles.set(pmid, new Set());
                pmidTitles.get(pmid).add(normTitle);
            }
        }
    }

    const collided = new Set();
    for (const [pmid, titles] of pmidTitles.entries()) {
        if (titles.size > 1) collided.add(pmid);
    }
    console.log(`Identified ${collided.size} collided PMIDs`);

    let tkUpdated = 0;
    let articlesSanitized = 0;
    let articlesVerified = 0;
    for (const r of tkRows) {
        let changed = false;
        try {
            const articles = parseJsonArray(r.source_articles);
            for (const a of articles) {
                const pmid = String(a.pmid || a.uid || '').replace(/^(?:pmid|pubmed):?/i, '').trim();
                if (!/^\d+$/.test(pmid)) continue;

                const isCollided = collided.has(pmid);
                const isVerifiedMatch = verifiedPmids
                    ? Boolean(verifiedPmids[pmid] && titlesMatch(a.title, verifiedPmids[pmid]))
                    : !isCollided;

                if (isCollided || !isVerifiedMatch) {
                    a.pmid = null;
                    if (a.uid && /^(?:pmid|pubmed)[-:]?/i.test(String(a.uid))) {
                        a.uid = `article:title:${encodeURIComponent(String(a.title || '').slice(0, 80))}`;
                    }
                    changed = true;
                    articlesSanitized++;
                } else {
                    articlesVerified++;
                }
            }
            if (changed) {
                await db.run("UPDATE topic_knowledge SET source_articles = ? WHERE id = ?", [JSON.stringify(articles), r.id]);
                tkUpdated++;
            }
        } catch (e) {
            console.error('Error cleaning source_articles for topic', r.topic, e.message);
        }
    }
    console.log(`Sanitized ${articlesSanitized} articles across ${tkUpdated} topic_knowledge rows (${articlesVerified} verified PubMed links retained)`);
    console.log('\nDatabase integrity fix complete!');
}

run().catch(console.error).finally(() => process.exit(0));
