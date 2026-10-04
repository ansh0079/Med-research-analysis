'use strict';

// Clinical audit of stored quiz questions (migration 111).
//
//   stage 1  an AI reviewer (Claude by default) checks every question against the evidence linked to it,
//            topic by topic, one question at a time
//   stage 2  a second, independent AI reviewer (a different model family) re-checks what stage 1 flagged
//   stage 3  a clinician reviews anything still flagged, next to its evidence
// plus a random sample that always goes to the clinician, whatever the AI reviewers said.
//
// The questions are never edited. Each stage runs within a spending budget and stops cleanly when it is
// reached; the next run carries on where it stopped. A question whose wording changes is audited again.

const crypto = require('crypto');
const { buildAuditPrompt, normaliseVerdict } = require('./auditPrompt');
const { questionHash } = require('../questionIndex/questionIndexService');

const INDEXED_TYPES = ['guideline_mcq', 'cold_start_mcq', 'paper_mcq', 'live_quiz_mcq'];
const CURATED_TYPE = 'curated_topic_mcq';
const HUMAN_DECISIONS = new Set(['approved', 'needs_revision', 'retired']);

const STAGES = {
    1: {
        provider: () => process.env.QUESTION_AUDIT_STAGE1_PROVIDER || 'claude',
        model: () => process.env.QUESTION_AUDIT_STAGE1_MODEL || 'claude-haiku-4-5-20251001',
        operation: 'question_audit_primary',
    },
    2: {
        provider: () => process.env.QUESTION_AUDIT_STAGE2_PROVIDER || 'gemini',
        model: () => process.env.QUESTION_AUDIT_STAGE2_MODEL || 'gemini-2.5-pro',
        operation: 'question_audit_secondary',
    },
};

// The question's own explanation admits its source does not say what it tests.
const WEAK_EXPLANATION = /\b(although|while) \[?\d|\bthe principle\b|applicable here|not explicitly|does not (directly|specifically|explicitly)|is not (directly )?(mentioned|stated|covered)|extrapolat/i;

const parse = (value, fallback) => {
    if (value && typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return fallback; }
};

/** Identity of a question's content: re-audit when the wording, options, key or explanation change. */
function contentHash(q = {}) {
    return crypto.createHash('sha256').update(JSON.stringify([
        String(q.question || '').trim(), q.options || null, q.correctAnswer ?? q.correct ?? null, String(q.explanation || '').trim(),
    ])).digest('hex').slice(0, 24);
}

/** Status shown in the queue, derived from what has happened to the row. */
function computeStatus(row) {
    if (row.human_decision) return `human_${row.human_decision}`;
    if (row.pre_flag_reason) return 'needs_human';
    if (!row.stage1_verdict) return 'pending';
    if (row.stage1_verdict === 'pass') return 'passed';
    if (!row.stage2_verdict) return 'awaiting_second_review';
    return row.stage2_verdict === 'pass' ? 'cleared_by_second_review' : 'needs_human';
}

/** Every question to audit, in topic order. Indexed questions use their assigned topic; curated use their own. */
async function listTargets(db) {
    const placeholders = INDEXED_TYPES.map(() => '?').join(',');
    const objects = await db.all(
        `SELECT object_key, object_type, topic, object_payload FROM teaching_objects WHERE object_type IN (${placeholders}, ?)`,
        [...INDEXED_TYPES, CURATED_TYPE],
    );
    const index = await db.all('SELECT object_key, question_index, assigned_topic_name, original_topic FROM question_topic_index', [])
        .catch(() => []);
    const topicOf = new Map(index.map((r) => [`${r.object_key}#${r.question_index}`, r.assigned_topic_name || r.original_topic]));
    const targets = [];
    for (const o of objects) {
        const payload = parse(o.object_payload, {});
        (Array.isArray(payload?.mcqs) ? payload.mcqs : []).forEach((q, i) => {
            if (!q?.question) return;
            const topic = o.object_type === CURATED_TYPE
                ? (payload.topicDisplayName || o.topic)
                : (topicOf.get(`${o.object_key}#${i}`) || o.topic);
            targets.push({ objectKey: o.object_key, questionIndex: i, objectType: o.object_type, topic: topic || '(no topic)', question: q });
        });
    }
    targets.sort((a, b) => String(a.topic).localeCompare(String(b.topic)) || a.objectKey.localeCompare(b.objectKey) || a.questionIndex - b.questionIndex);
    return targets;
}

/** Make sure every target has an audit row; a question whose content changed starts again. Returns counts. */
async function syncAuditRows(db, targets, { now = new Date().toISOString() } = {}) {
    const existing = new Map((await db.all('SELECT object_key, question_index, content_hash FROM question_audit', []))
        .map((r) => [`${r.object_key}#${r.question_index}`, r.content_hash]));
    let added = 0;
    let reset = 0;
    for (const t of targets) {
        const key = `${t.objectKey}#${t.questionIndex}`;
        const hash = contentHash(t.question);
        const weak = WEAK_EXPLANATION.test(String(t.question.explanation || '')) ? 'explanation_admits_weak_support' : null;
        if (!existing.has(key)) {
            await db.run(
                `INSERT INTO question_audit (object_key, question_index, question_hash, object_type, topic, content_hash, pre_flag_reason, status, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [t.objectKey, t.questionIndex, questionHash(t.question), t.objectType, t.topic, hash, weak, weak ? 'needs_human' : 'pending', now],
            );
            added += 1;
        } else if (existing.get(key) !== hash) {
            await db.run(
                `UPDATE question_audit SET content_hash = ?, question_hash = ?, topic = ?, pre_flag_reason = ?, evidence = NULL,
                    stage1_verdict = NULL, stage1_severity = NULL, stage1_issues = NULL, stage1_model = NULL, stage1_at = NULL,
                    stage2_verdict = NULL, stage2_severity = NULL, stage2_issues = NULL, stage2_model = NULL, stage2_at = NULL,
                    human_decision = NULL, human_notes = NULL, reviewed_by = NULL, reviewed_at = NULL, status = ?, updated_at = ?
                 WHERE object_key = ? AND question_index = ?`,
                [hash, questionHash(t.question), t.topic, weak, weak ? 'needs_human' : 'pending', now, t.objectKey, t.questionIndex],
            );
            reset += 1;
        }
    }
    return { targets: targets.length, added, reset };
}

/**
 * Mark a random sample for the clinician, spread across question types in proportion. Tops the sample up to
 * `size` and never re-draws questions already in it, so the sample is stable.
 */
async function drawRandomSample(db, { size = 150, random = Math.random } = {}) {
    const have = Number((await db.get('SELECT COUNT(*) AS n FROM question_audit WHERE in_random_sample = 1', []))?.n || 0);
    const need = Math.max(0, size - have);
    if (!need) return { added: 0, total: have };
    const pool = await db.all('SELECT object_key, question_index, object_type FROM question_audit WHERE in_random_sample = 0 AND human_decision IS NULL', []);
    const byType = new Map();
    for (const r of pool) {
        if (!byType.has(r.object_type)) byType.set(r.object_type, []);
        byType.get(r.object_type).push(r);
    }
    const picks = [];
    for (const [, rows] of byType) {
        const share = Math.max(1, Math.round((rows.length / pool.length) * need));
        for (let i = rows.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; }
        picks.push(...rows.slice(0, share));
    }
    for (const r of picks.slice(0, need)) {
        await db.run('UPDATE question_audit SET in_random_sample = 1 WHERE object_key = ? AND question_index = ?', [r.object_key, r.question_index]);
    }
    return { added: Math.min(need, picks.length), total: have + Math.min(need, picks.length) };
}

function guidelineEvidence(row) {
    return {
        kind: 'guideline',
        id: String(row.id),
        source: row.source_body || 'Guideline',
        year: row.source_year || null,
        url: row.source_url || null,
        text: String(row.recommendation_text || '').trim(),
    };
}

/**
 * What a question is checked against. Curated questions carry their own source excerpts. Indexed questions use
 * the guideline rows and papers the index linked to them; with none linked, the guideline rows the index placed
 * on the question's topic.
 */
async function buildEvidence(db, auditRow, question) {
    if (auditRow.object_type === CURATED_TYPE) {
        return (Array.isArray(question.sourceRefs) ? question.sourceRefs : []).slice(0, 4).map((s) => ({
            kind: /trial|study|cohort|meta|journal/i.test(String(s.sourceBody || '')) ? 'paper' : 'guideline',
            id: s.guidelineId || null,
            source: s.sourceBody || null,
            year: s.sourceYear || null,
            url: s.sourceUrl || null,
            text: String(s.excerpt || '').trim(),
        })).filter((e) => e.text);
    }
    const idx = await db.get(
        'SELECT evidence_guideline_ids, evidence_paper_uids, assigned_curriculum_topic_id FROM question_topic_index WHERE object_key = ? AND question_index = ?',
        [auditRow.object_key, auditRow.question_index],
    ).catch(() => null);
    const evidence = [];
    const guidelineIds = parse(idx?.evidence_guideline_ids, []);
    for (const id of guidelineIds.slice(0, 3)) {
        const g = await db.get('SELECT id, source_body, source_year, source_url, recommendation_text FROM topic_guidelines WHERE CAST(id AS TEXT) = ?', [String(id)]).catch(() => null);
        if (g?.recommendation_text) evidence.push(guidelineEvidence(g));
    }
    if (!guidelineIds.length && idx?.assigned_curriculum_topic_id) {
        const rows = await db.all(
            `SELECT g.id, g.source_body, g.source_year, g.source_url, g.recommendation_text
             FROM guideline_topic_index i JOIN topic_guidelines g ON CAST(g.id AS TEXT) = i.guideline_id
             WHERE i.assigned_curriculum_topic_id = ? ORDER BY i.topic_similarity DESC LIMIT 3`,
            [String(idx.assigned_curriculum_topic_id)],
        ).catch(() => []);
        for (const g of rows) if (g.recommendation_text) evidence.push({ ...guidelineEvidence(g), topicContext: true });
    }
    for (const uid of parse(idx?.evidence_paper_uids, []).slice(0, 3)) {
        const cached = await Promise.resolve(db.getCachedArticle?.(uid)).catch(() => null);
        let text = cached?.abstract || '';
        let title = cached?.title || '';
        if (!text) {
            const paper = await db.get("SELECT title, object_payload FROM teaching_objects WHERE object_type = 'paper' AND article_uid = ?", [uid]).catch(() => null);
            const p = parse(paper?.object_payload, {});
            title = title || paper?.title || '';
            text = [p.clinicalBottomLine, p.synopsis?.mainFindings || p.synopsis?.keyFindings, p.synopsis?.bottomLine]
                .flat().filter(Boolean).map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
        }
        if (title || text) evidence.push({ kind: 'paper', id: uid, source: title.slice(0, 200), year: cached?.year || null, url: cached?.url || null, text: text.slice(0, 1600) });
    }
    return evidence;
}

async function loadQuestion(db, objectKey, questionIndex) {
    const o = await db.get('SELECT object_payload FROM teaching_objects WHERE object_key = ?', [objectKey]).catch(() => null);
    return parse(o?.object_payload, {})?.mcqs?.[questionIndex] || null;
}

/**
 * Run one stage over the questions waiting for it, topic by topic, within `budgetUsd` of today's spend.
 * The configured AI client returns the reviewer's parsed JSON.
 */
async function runStage(db, ai, {
    stage = 1,
    budgetUsd = 5,
    limit = Infinity,
    topic = null,
    concurrency = 3,
    maxCapPctUsed = 85,
    getSpendSnapshot = () => require('../ai/globalLlmSpendGuard').getSpendSnapshot(),
    logger = console,
    now = () => new Date().toISOString(),
} = {}) {
    const config = STAGES[stage];
    if (!config) throw new Error(`Unknown audit stage ${stage}`);
    const where = stage === 1
        ? 'stage1_verdict IS NULL AND human_decision IS NULL'
        : "stage1_verdict = 'flag' AND stage2_verdict IS NULL AND human_decision IS NULL";
    const params = [];
    let sql = `SELECT * FROM question_audit WHERE ${where}`;
    if (topic) { sql += ' AND topic = ?'; params.push(topic); }
    sql += ' ORDER BY topic, object_key, question_index';
    const queue = await db.all(sql, params);
    const startSpend = Number((await getSpendSnapshot().catch(() => null))?.spentUsd || 0);
    const summary = { stage, model: config.model(), waiting: queue.length, reviewed: 0, flagged: 0, passed: 0, errors: 0, spentUsd: 0, stoppedReason: null };

    let cursor = 0;
    let stop = false;
    const worker = async () => {
        while (!stop && cursor < queue.length && summary.reviewed + summary.errors < limit) {
            const row = queue[cursor];
            cursor += 1;
            const spend = await getSpendSnapshot().catch(() => null);
            summary.spentUsd = Number(spend?.spentUsd || 0) - startSpend;
            if (spend?.killSwitch || Number(spend?.pctUsed) >= maxCapPctUsed) { summary.stoppedReason = 'daily_cap'; stop = true; break; }
            if (summary.spentUsd >= budgetUsd) { summary.stoppedReason = 'budget'; stop = true; break; }

            const question = await loadQuestion(db, row.object_key, row.question_index);
            if (!question) continue;
            const evidence = parse(row.evidence, null) || await buildEvidence(db, row, question);
            const prior = stage === 2 ? { issues: parse(row.stage1_issues, []) } : null;
            let verdict;
            try {
                const prompt = buildAuditPrompt({ topic: row.topic, question, evidence, priorReview: prior });
                const raw = stage === 1
                    ? await ai.callStructured(prompt, config.provider(), config.model(), {
                        temperature: 0, jsonMode: true, maxOutputTokens: 900,
                        usage: { operation: 'question_audit_primary', topic: row.topic },
                    })
                    : await ai.callStructured(prompt, config.provider(), config.model(), {
                        temperature: 0, jsonMode: true, maxOutputTokens: 900,
                        usage: { operation: 'question_audit_secondary', topic: row.topic },
                    });
                verdict = normaliseVerdict(raw);
            } catch (err) {
                summary.errors += 1;
                logger.warn?.({ err: err?.message, objectKey: row.object_key, stage }, 'question audit call failed');
                if (err?.name === 'LlmDailyCapExceededError') { summary.stoppedReason = 'daily_cap'; stop = true; }
                continue;
            }
            const updated = {
                ...row,
                [`stage${stage}_verdict`]: verdict.verdict,
                [`stage${stage}_severity`]: verdict.severity,
            };
            await db.run(
                `UPDATE question_audit SET evidence = ?, stage${stage}_verdict = ?, stage${stage}_severity = ?, stage${stage}_issues = ?,
                    stage${stage}_model = ?, stage${stage}_at = ?, status = ?, updated_at = ?
                 WHERE object_key = ? AND question_index = ?`,
                [JSON.stringify(evidence), verdict.verdict, verdict.severity, JSON.stringify({ ...verdict, issues: verdict.issues }),
                    config.model(), now(), computeStatus(updated), now(), row.object_key, row.question_index],
            );
            summary.reviewed += 1;
            if (verdict.verdict === 'flag') summary.flagged += 1; else summary.passed += 1;
        }
    };
    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
    if (!summary.stoppedReason) summary.stoppedReason = summary.reviewed + summary.errors >= limit ? 'limit' : 'done';
    const end = await getSpendSnapshot().catch(() => null);
    summary.spentUsd = Number((Number(end?.spentUsd || 0) - startSpend).toFixed(4));
    return summary;
}

/** Hold every question awaiting human review, plus questions a clinician retired. */
async function loadAuditHolds(db, hashes) {
    const unique = [...new Set((hashes || []).filter(Boolean))];
    const held = new Set();
    try {
        for (let i = 0; i < unique.length; i += 400) {
            const part = unique.slice(i, i + 400);
            const rows = await db.all(
                `SELECT question_hash FROM question_audit WHERE question_hash IN (${part.map(() => '?').join(',')})
                 AND ((human_decision IS NULL AND status = 'needs_human') OR human_decision = 'retired')`,
                part,
            );
            for (const r of rows) held.add(r.question_hash);
        }
    } catch {
        return new Set();
    }
    return held;
}

/** A clinician's decision. Indexed questions are also written through the existing question review. */
async function recordHumanDecision(db, { objectKey, questionIndex, decision, notes = null, userId = null, now = new Date().toISOString() }) {
    if (!HUMAN_DECISIONS.has(decision)) throw new Error('Invalid review decision');
    const row = await db.get('SELECT * FROM question_audit WHERE object_key = ? AND question_index = ?', [objectKey, questionIndex]);
    if (!row) throw new Error('Question not found in the audit');
    const updated = { ...row, human_decision: decision };
    await db.run(
        `UPDATE question_audit SET human_decision = ?, human_notes = ?, reviewed_by = ?, reviewed_at = ?, status = ?, updated_at = ?
         WHERE object_key = ? AND question_index = ?`,
        [decision, notes ? String(notes).slice(0, 2000) : null, userId, now, computeStatus(updated), now, objectKey, questionIndex],
    );
    if (row.object_type !== CURATED_TYPE) {
        const { reviewQuestionAssignment } = require('../questionIndex/questionIndexReviewService');
        await reviewQuestionAssignment(db, { objectKey, questionIndex, decision, notes, userId }).catch(() => null);
    }
    return db.get('SELECT * FROM question_audit WHERE object_key = ? AND question_index = ?', [objectKey, questionIndex]);
}

const VIEWS = {
    needs_human: "human_decision IS NULL AND status = 'needs_human'",
    sample: 'human_decision IS NULL AND in_random_sample = 1',
    awaiting_second_review: "human_decision IS NULL AND status = 'awaiting_second_review'",
    cleared: "status = 'cleared_by_second_review'",
    passed: "status = 'passed'",
    decided: 'human_decision IS NOT NULL',
};

/** The clinician's queue: each item with its question, evidence and both AI reviews. */
async function listAuditQueue(db, { view = 'needs_human', topic = '', limit = 20, offset = 0 } = {}) {
    const where = [VIEWS[view] || VIEWS.needs_human];
    const params = [];
    if (topic) { where.push('topic LIKE ?'); params.push(`%${topic}%`); }
    const rows = await db.all(
        `SELECT * FROM question_audit WHERE ${where.join(' AND ')}
         ORDER BY CASE stage2_severity WHEN 'critical' THEN 0 WHEN 'major' THEN 1 ELSE 2 END, topic, object_key, question_index
         LIMIT ? OFFSET ?`,
        [...params, Math.min(100, Math.max(1, Number(limit) || 20)), Math.max(0, Number(offset) || 0)],
    );
    const items = [];
    for (const r of rows) {
        const question = await loadQuestion(db, r.object_key, r.question_index);
        items.push({
            objectKey: r.object_key,
            questionIndex: r.question_index,
            objectType: r.object_type,
            topic: r.topic,
            status: r.status,
            inRandomSample: Boolean(r.in_random_sample),
            preFlagReason: r.pre_flag_reason,
            question,
            evidence: parse(r.evidence, null),
            stage1: r.stage1_verdict ? { verdict: r.stage1_verdict, severity: r.stage1_severity, model: r.stage1_model, ...parse(r.stage1_issues, {}) } : null,
            stage2: r.stage2_verdict ? { verdict: r.stage2_verdict, severity: r.stage2_severity, model: r.stage2_model, ...parse(r.stage2_issues, {}) } : null,
            humanDecision: r.human_decision,
            humanNotes: r.human_notes,
        });
    }
    // Questions shown before stage 1 reached them still need their evidence for the clinician.
    for (const item of items) {
        if (!item.evidence && item.question) {
            item.evidence = await buildEvidence(db, { object_key: item.objectKey, question_index: item.questionIndex, object_type: item.objectType }, item.question);
        }
    }
    return { items, counts: await auditCounts(db) };
}

async function auditCounts(db) {
    const rows = await db.all('SELECT status, COUNT(*) AS n FROM question_audit GROUP BY status', []);
    const sample = await db.get('SELECT COUNT(*) AS n FROM question_audit WHERE in_random_sample = 1 AND human_decision IS NULL', []);
    const out = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
    out.sample_waiting = Number(sample?.n || 0);
    out.total = rows.reduce((s, r) => s + Number(r.n), 0);
    return out;
}

module.exports = {
    STAGES,
    WEAK_EXPLANATION,
    contentHash,
    computeStatus,
    listTargets,
    syncAuditRows,
    drawRandomSample,
    buildEvidence,
    runStage,
    loadAuditHolds,
    recordHumanDecision,
    listAuditQueue,
    auditCounts,
};
