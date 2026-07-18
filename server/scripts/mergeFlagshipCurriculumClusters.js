/**
 * Merge near-duplicate curriculum_topics under each flagship concept.
 * Reassigns guidelines / teaching objects / claims onto the winner normalized_topic,
 * then deletes loser curriculum rows.
 *
 *   node server/scripts/mergeFlagshipCurriculumClusters.js --dry-run
 *   node server/scripts/mergeFlagshipCurriculumClusters.js --priority=high --limit=5
 *   node server/scripts/mergeFlagshipCurriculumClusters.js --fuzzy
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { loadEnv } = require('../../config');
loadEnv();

const db = require('../../database');
const {
    loadFlagshipConfig,
    curriculumMatchesFlagship,
    pickClusterWinner,
    defaultNormalize,
} = require('../services/flagshipTopicOps');

function argValue(flag) {
    const argv = process.argv.slice(2);
    const hit = argv.find((a) => a.startsWith(`${flag}=`));
    if (hit) return hit.slice(flag.length + 1);
    const idx = argv.indexOf(flag);
    if (idx >= 0) return argv[idx + 1];
    return null;
}

async function contentCounts(normalizeFn, displayName) {
    const norm = normalizeFn(displayName);
    const [g, t, c] = await Promise.all([
        db.get(
            `SELECT COUNT(*) AS count FROM topic_guidelines
             WHERE normalized_topic = ? AND status != 'stale' AND superseded_by_id IS NULL`,
            [norm]
        ).catch(() => ({ count: 0 })),
        db.get(
            `SELECT COUNT(*) AS count FROM teaching_objects WHERE normalized_topic = ?`,
            [norm]
        ).catch(() => ({ count: 0 })),
        db.get(
            `SELECT COUNT(*) AS count FROM teaching_object_claims WHERE normalized_topic = ?`,
            [norm]
        ).catch(() => ({ count: 0 })),
    ]);
    const knowledge = await db.getTopicKnowledge(displayName).catch(() => null);
    let sourceArticles = 0;
    try {
        const sa = knowledge?.sourceArticles || knowledge?.source_articles;
        const parsed = typeof sa === 'string' ? JSON.parse(sa) : sa;
        sourceArticles = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
        sourceArticles = 0;
    }
    return {
        guidelineCount: Number(g?.count || 0),
        teachingCount: Number(t?.count || 0),
        claimCount: Number(c?.count || 0),
        hasKnowledge: Boolean(knowledge),
        sourceArticles,
    };
}

async function reassignNormalizedTopic(fromNorm, toNorm, dry) {
    if (!fromNorm || !toNorm || fromNorm === toNorm) return { guidelines: 0, teaching: 0, claims: 0 };
    const tables = [
        ['topic_guidelines', 'guidelines'],
        ['teaching_objects', 'teaching'],
        ['teaching_object_claims', 'claims'],
    ];
    const counts = {};
    for (const [table, key] of tables) {
        const row = await db.get(
            `SELECT COUNT(*) AS count FROM ${table} WHERE normalized_topic = ?`,
            [fromNorm]
        ).catch(() => ({ count: 0 }));
        counts[key] = Number(row?.count || 0);
        if (!dry && counts[key] > 0) {
            await db.run(
                `UPDATE ${table} SET normalized_topic = ? WHERE normalized_topic = ?`,
                [toNorm, fromNorm]
            );
        }
    }
    return counts;
}

async function main() {
    const dry = process.argv.includes('--dry-run');
    const fuzzy = process.argv.includes('--fuzzy');
    const priority = argValue('--priority');
    const limit = Number(argValue('--limit') || 0) || null;
    const topicFilter = argValue('--topic');

    await db.connect();
    await db.runMigrations();

    const normalizeFn = (t) => (typeof db.normalizeTopic === 'function' ? db.normalizeTopic(t) : defaultNormalize(t));
    const config = loadFlagshipConfig();
    let flagships = config.topics || [];
    if (priority) flagships = flagships.filter((t) => String(t.priority || '') === priority);
    if (topicFilter) {
        const needle = normalizeFn(topicFilter);
        flagships = flagships.filter((t) => normalizeFn(t.topic).includes(needle) || needle.includes(normalizeFn(t.topic)));
    }
    if (limit) flagships = flagships.slice(0, limit);

    const curriculumRows = await db.all(
        `SELECT t.id, t.display_name, t.suggested_query, t.priority, t.seed_status, t.block_id
         FROM curriculum_topics t
         ORDER BY t.id ASC`
    ).catch(() => []);

    console.log(`Flagship curriculum cluster merge${dry ? ' (DRY RUN)' : ''}`);
    console.log(`Flagships in scope: ${flagships.length} · curriculum rows: ${curriculumRows.length} · fuzzy=${fuzzy}`);

    let clustersMerged = 0;
    let rowsDropped = 0;

    for (const flagship of flagships) {
        const matched = [];
        for (const row of curriculumRows) {
            const verdict = curriculumMatchesFlagship(row.display_name, flagship, { normalizeFn, fuzzy });
            if (!verdict.match) continue;
            const counts = await contentCounts(normalizeFn, row.display_name);
            matched.push({
                ...row,
                ...counts,
                matchReason: verdict.reason,
                matchScore: verdict.score,
            });
        }

        if (matched.length === 0) {
            console.log(`[skip] "${flagship.topic}" — no curriculum matches`);
            continue;
        }

        const winner = pickClusterWinner(matched, flagship, normalizeFn);
        const losers = matched.filter((r) => r.id !== winner.id);
        const winnerNorm = normalizeFn(winner.display_name);
        const targetNorm = normalizeFn(flagship.topic);

        console.log(
            `[cluster] "${flagship.topic}" keep id=${winner.id} "${winner.display_name}" `
            + `(g=${winner.guidelineCount} t=${winner.teachingCount} c=${winner.claimCount}) `
            + `drop=${losers.length}`
        );
        for (const loser of losers) {
            console.log(`         drop id=${loser.id} "${loser.display_name}" (${loser.matchReason})`);
        }

        if (losers.length === 0 && winnerNorm === targetNorm) continue;

        if (!dry) {
            // Prefer canonical flagship display name when free or already the winner.
            const nameConflict = curriculumRows.find(
                (r) => r.id !== winner.id && normalizeFn(r.display_name) === targetNorm
            );
            if (!nameConflict && winnerNorm !== targetNorm) {
                await db.run(
                    `UPDATE curriculum_topics SET display_name = ? WHERE id = ?`,
                    [flagship.topic, winner.id]
                );
                winner.display_name = flagship.topic;
            }

            const finalNorm = normalizeFn(winner.display_name);
            if (winnerNorm !== finalNorm) {
                await reassignNormalizedTopic(winnerNorm, finalNorm, false);
            }

            for (const loser of losers) {
                const fromNorm = normalizeFn(loser.display_name);
                const moved = await reassignNormalizedTopic(fromNorm, finalNorm, false);
                console.log(
                    `         reassigned from "${loser.display_name}": `
                    + `g=${moved.guidelines} t=${moved.teaching} c=${moved.claims}`
                );
                await db.run(`DELETE FROM curriculum_topics WHERE id = ?`, [loser.id]);
                rowsDropped += 1;
            }
        } else {
            for (const loser of losers) {
                const moved = await reassignNormalizedTopic(
                    normalizeFn(loser.display_name),
                    targetNorm,
                    true
                );
                console.log(
                    `         would reassign from "${loser.display_name}": `
                    + `g=${moved.guidelines} t=${moved.teaching} c=${moved.claims}`
                );
                rowsDropped += 1;
            }
        }

        if (losers.length > 0) clustersMerged += 1;
    }

    console.log(`\nDone. Clusters touched: ${clustersMerged}. Curriculum rows ${dry ? 'would drop' : 'dropped'}: ${rowsDropped}.`);
    await db.close();
}

main().catch(async (err) => {
    console.error(err);
    try { await db.close(); } catch { /* ignore */ }
    process.exit(1);
});
