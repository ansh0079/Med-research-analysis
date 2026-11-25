'use strict';

/**
 * Parse verbatim-anchored records from Common257_records_629_agent{1,2,3}
 * and stage them into topic_mentor_drafts as status = 'needs_review' ONLY where
 * the existing draft is unanchored (0 evidence_anchors on teaching_points) and
 * has no human review_decision yet. Never publishes anything.
 *
 * Usage:
 *   node scripts/load_629_anchored_drafts.js           (dry-run)
 *   node scripts/load_629_anchored_drafts.js --apply   (backs up DB + writes needs_review drafts)
 */

const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../config');
loadEnv();

const APPLY = process.argv.includes('--apply');
const BATCH_TAG = 'common257-629-agents123-2026-11-25';
const AGENT_DIRS = [
    'C:\\Users\\ansh0\\Downloads\\Common257_records_629_agent1',
    'C:\\Users\\ansh0\\Downloads\\Common257_records_629_agent2',
    'C:\\Users\\ansh0\\Downloads\\Common257_records_629_agent3',
];

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const normTopic = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function parseRecordFile(fp) {
    const text = fs.readFileSync(fp, 'utf8');
    if (/\bfit_error\b/i.test(text) && !text.includes('## All recommendations')) {
        return { skippedReason: 'fit_error' };
    }
    const docMatch = text.match(/(?:document id|stored document id|doc_id[:\s=]+)\s*(\d+)/i);
    const docId = docMatch ? Number(docMatch[1]) : null;

    const topicsMatch = text.match(/\*\*Topics this record serves:\*\*\s*(.+)/i);
    const topicsRaw = topicsMatch ? topicsMatch[1].trim() : '';
    const topics = topicsRaw.split(/[;|]/).map((s) => s.trim()).filter(Boolean);

    const synMatch = text.match(/##\s*Synopsis\s*\(gist\)\s*\n+([\s\S]*?)(?=\n##\s|$)/i);
    const synopsis = synMatch ? norm(synMatch[1]) : '';

    // Parse numbered recommendations + *Anchor:* "..."
    const recBlocks = text.split(/\n(?=\d+\.\s+)/);
    const points = [];
    for (const block of recBlocks) {
        const mRec = block.match(/^\d+\.\s+([\s\S]*?)\n\s*\*Anchor:\*\s*"([^"]+)"/);
        if (!mRec) continue;
        const claim = norm(mRec[1]);
        const quote = norm(mRec[2]);
        if (claim && quote.length >= 30) {
            points.push({ claim, quote });
        }
    }
    return { docId, topics, synopsis, points, file: path.basename(fp) };
}

async function main() {
    const db = require('../database');
    await db.connect();

    const docs = new Map();
    for (const r of await db.all('SELECT id, pmid, pmcid, title, full_text, full_text_source FROM guideline_documents')) {
        if (r.full_text && norm(r.full_text).length >= 500) {
            docs.set(Number(r.id), { ...r, normText: norm(r.full_text) });
        }
    }

    const drafts = await db.all('SELECT id, topic_id, topic, status, review_decision, source_batch, page_json FROM topic_mentor_drafts');
    const draftByNorm = new Map();
    for (const d of drafts) {
        let pj = {};
        try { pj = JSON.parse(d.page_json || '{}'); } catch {}
        const pts = Array.isArray(pj.teaching_points) ? pj.teaching_points : [];
        const hasAnchors = pts.some((p) => p && (p.evidence_anchors?.length || p.evidenceAnchors?.length || p.supports?.length));
        draftByNorm.set(normTopic(d.topic), { ...d, hasAnchors });
    }

    const stats = { filesScanned: 0, fitError: 0, noPoints: 0, docNotInDb: 0, anchorsFailed: 0, alreadyAnchoredOrReviewed: 0, noExistingDraft: 0, readyToReplace: 0, applied: 0 };
    const now = new Date().toISOString();

    if (APPLY) {
        const stamp = now.replace(/[:.]/g, '-');
        const dbPath = path.resolve(process.cwd(), db.dbPath || './database/app.db');
        const backupDir = path.join(path.dirname(dbPath), 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const backupPath = path.join(backupDir, `app-before-629-load-${stamp}.db`);
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, backupPath);
            console.log(`Backup created: ${backupPath}`);
        }
    }

    for (const dir of AGENT_DIRS) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !/HAND_BACK/i.test(f)).sort();
        for (const fn of files) {
            stats.filesScanned++;
            const parsed = parseRecordFile(path.join(dir, fn));
            if (parsed.skippedReason === 'fit_error') { stats.fitError++; continue; }
            if (!parsed.points.length || !parsed.topics.length) { stats.noPoints++; continue; }
            const doc = parsed.docId ? docs.get(parsed.docId) : null;
            if (!doc) { stats.docNotInDb++; continue; }

            const verifiedPoints = [];
            const key = doc.pmid || `DOC${doc.id}`;
            for (const pt of parsed.points) {
                if (doc.normText.includes(pt.quote)) {
                    verifiedPoints.push({
                        claim: pt.claim,
                        cites: [key],
                        claim_type: 'paraphrase',
                        evidence_anchors: [{
                            pmid: key,
                            uid: `doc:${doc.id}`,
                            quote: pt.quote,
                            documentId: doc.id,
                            ...(doc.pmcid ? { pmcid: doc.pmcid } : {}),
                        }],
                    });
                }
            }
            if (verifiedPoints.length < 3) { stats.anchorsFailed++; continue; }

            for (const topicName of parsed.topics) {
                const existing = draftByNorm.get(normTopic(topicName));
                if (!existing) { stats.noExistingDraft++; continue; }
                if (existing.review_decision || existing.hasAnchors) { stats.alreadyAnchoredOrReviewed++; continue; }
                stats.readyToReplace++;

                if (APPLY) {
                    const page = {
                        mentor_intro: parsed.synopsis || verifiedPoints[0].claim,
                        teaching_points: verifiedPoints,
                        sources: [{ pmid: key, title: doc.title || key }],
                        evidence_check: { points_kept: verifiedPoints.length, built_from: parsed.file, doc_id: doc.id },
                    };
                    await db.run(
                        `UPDATE topic_mentor_drafts
                         SET status = 'needs_review', page_json = ?, source_batch = ?, updated_at = ?
                         WHERE id = ? AND review_decision IS NULL`,
                        [JSON.stringify(page), BATCH_TAG, now, existing.id]
                    );
                    stats.applied++;
                }
            }
        }
    }

    console.log(JSON.stringify({ apply: APPLY, ...stats }, null, 2));
    await db.close?.();
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
