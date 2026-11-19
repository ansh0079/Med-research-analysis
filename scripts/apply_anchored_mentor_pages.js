'use strict';

/**
 * Replace published mentor pages with versions whose teaching points carry exact-quote evidence anchors.
 *
 *   node scripts/apply_anchored_mentor_pages.js --file pages.jsonl [--min-points 3] [--backup out.jsonl] [--apply]
 *
 * Input: JSON lines { topic_id, topic, page }, where every teaching point has evidence_anchors
 * [{ pmid, quote, documentId }]. Each point is re-checked with the app's own clearance service
 * (mentorEvidenceClearanceService: quote must be in the stored full text, source type accepted);
 * points that fail are dropped. A page is written only if it still has --min-points verified points
 * and the whole page then clears; it is then republished through publishDraft, which copies it into
 * topic_knowledge as 'evidence_verified'. With --backup the current page_json is written to a file.
 * Dry run unless --apply.
 */

const fs = require('fs');
const { loadEnv } = require('../config');
loadEnv();
const { evaluateMentorEvidenceClearance } = require('../server/services/mentorEvidenceClearanceService');
const { publishDraft } = require('../server/services/topicMentorDrafts');

const args = process.argv.slice(2);
const arg = (name, fallback = null) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const FILE = arg('--file');
const BACKUP = arg('--backup');
const MIN_POINTS = Number(arg('--min-points', 3));
const APPLY = args.includes('--apply');

async function main() {
    if (!FILE) throw new Error('--file <pages.jsonl> is required');
    const items = fs.readFileSync(FILE, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
    const db = require('../database');
    await db.connect();
    const counts = { pages: items.length, written: 0, tooFewPoints: 0, notCleared: 0, missingPage: 0, pointsKept: 0, pointsDropped: 0 };
    const failures = {};
    const backup = BACKUP ? fs.createWriteStream(BACKUP) : null;
    const now = new Date().toISOString();
    for (const item of items) {
        const row = await db.get(
            "SELECT id, page_json, published_at FROM topic_mentor_drafts WHERE topic_id = ? AND status = 'published' ORDER BY id LIMIT 1",
            [String(item.topic_id)],
        );
        if (!row) { counts.missingPage++; continue; }
        const page = item.page || {};
        const kept = [];
        for (const point of page.teaching_points || []) {
            const check = await evaluateMentorEvidenceClearance(db, { ...page, teaching_points: [point] });
            if (check.cleared) kept.push(point);
            else for (const f of check.failures) failures[f.code] = (failures[f.code] || 0) + 1;
        }
        counts.pointsKept += kept.length;
        counts.pointsDropped += (page.teaching_points || []).length - kept.length;
        if (kept.length < MIN_POINTS) { counts.tooFewPoints++; continue; }
        const used = new Set(kept.flatMap((p) => p.evidence_anchors.map((a) => String(a.pmid))));
        const next = {
            ...page,
            teaching_points: kept,
            sources: (page.sources || []).filter((s) => used.has(String(s.pmid))),
            evidence_check: { ...(page.evidence_check || {}), points_kept: kept.length },
        };
        const whole = await evaluateMentorEvidenceClearance(db, next);
        if (!whole.cleared) { counts.notCleared++; continue; }
        counts.written++;
        if (backup) backup.write(`${JSON.stringify({ id: row.id, topic_id: item.topic_id, page_json: row.page_json })}\n`);
        if (APPLY) {
            // Republish through the app's own path: publishDraft re-runs clearance and copies the page into
            // topic_knowledge (what learners read) as 'evidence_verified'. It refuses rows already published,
            // so published_at is cleared first and restored if publishing fails.
            await db.run(
                'UPDATE topic_mentor_drafts SET page_json = ?, reviewer_notes = ?, published_at = NULL, updated_at = ? WHERE id = ?',
                [JSON.stringify(next), `Anchored ${now.slice(0, 10)}: kept ${kept.length} of ${next.evidence_check.points_before ?? '?'} points with exact quotes from stored full text.`, now, row.id],
            );
            try {
                await publishDraft(db, { topicId: String(item.topic_id), now });
            } catch (err) {
                await db.run('UPDATE topic_mentor_drafts SET page_json = ?, published_at = ?, updated_at = ? WHERE id = ?',
                    [row.page_json, row.published_at, now, row.id]);
                counts.written--;
                counts.publishFailed = (counts.publishFailed || 0) + 1;
                console.error(`publish failed for ${item.topic_id}: ${err.message}`);
            }
        }
    }
    if (backup) backup.end();
    console.log(JSON.stringify({ apply: APPLY, ...counts, failureCodes: failures }, null, 2));
    await db.close?.();
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
