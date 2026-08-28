#!/usr/bin/env node
/**
 * Decompose stored recommendations into structured fields.
 *
 * Why:
 *   93% of the 86,843 recommendations are unstructured prose — population,
 *   intervention, cautions, strength and certainty are filled on ~6-7% of rows.
 *   Everything downstream that needs to REASON rather than merely retrieve is
 *   blocked on that. Comorbid conflict detection currently runs as regex over free
 *   text, which is how it once paired paediatric oral-fluid advice against a
 *   hypertonic saline bolus and reported a fluid-strategy conflict.
 *
 *   Two recommendations genuinely collide only when they direct different things
 *   about the SAME intervention in the SAME population. And a recommendation is
 *   only usable for a patient when that patient is not in its exclusions. Neither
 *   question is answerable against prose.
 *
 * What it extracts, per recommendation:
 *   population     who it applies to
 *   intervention   the thing being directed (the conflict axis)
 *   direction      recommend | recommend_against | consider | no_recommendation
 *   exclusions     who it explicitly does NOT cover
 *   trigger        the condition under which it changes ("once perfusion restored")
 *   strength / certainty  where the source states them
 *
 * Extraction is conservative by construction: the model is told to return null
 * rather than infer. A fabricated exclusion is worse than a missing one, because
 * an invented exclusion silently suppresses applicable guidance.
 *
 * Env:
 *   STRUCT_DRY_RUN=1     print, do not write
 *   STRUCT_LIMIT=200     rows per run (default 200)
 *   STRUCT_BATCH=8       recommendations per model call (default 8)
 *   STRUCT_TIER=guideline  which evidence tier to process (default guideline)
 *   STRUCT_TOPIC=...     restrict to one normalized_topic
 */

'use strict';

const db = require('../database');
const { createAiService } = require('../server/services/ai/aiService');
const { getProviderCandidates } = require('../server/utils/aiProvider');
const { serverConfig } = require('../config');

const DRY_RUN = process.env.STRUCT_DRY_RUN === '1';
const LIMIT = Math.max(1, Number(process.env.STRUCT_LIMIT || 200));
const BATCH = Math.min(20, Math.max(1, Number(process.env.STRUCT_BATCH || 8)));
const TIER = process.env.STRUCT_TIER || 'guideline';
const TOPIC = process.env.STRUCT_TOPIC || null;

const DIRECTIONS = new Set(['recommend', 'recommend_against', 'consider', 'no_recommendation']);

const PROMPT = `You are decomposing clinical practice recommendations into structured fields so a
system can determine (a) whether two recommendations conflict, and (b) whether a
recommendation applies to a specific patient.

For EACH numbered recommendation, output exactly one JSON object on its own line:

{"n":1,"population":"...","intervention":"...","direction":"recommend","exclusions":"...","trigger":"...","strength":"strong","certainty":"moderate"}

Field rules:
- population: the patients this applies to, as stated. null if not stated.
- intervention: the single thing being directed — the drug, procedure, target or
  strategy. Keep it short and canonical ("intravenous fluid resuscitation",
  "red cell transfusion", "prone positioning"). This is used to detect whether two
  recommendations concern the same axis, so prefer the general form over the
  specific brand or dose.
- direction: exactly one of recommend | recommend_against | consider |
  no_recommendation.
- exclusions: populations the recommendation explicitly does NOT cover, or in whom
  it is contraindicated. null unless the text actually says so.
- trigger: the stated condition under which this changes or stops applying
  ("once perfusion is restored", "if bleeding"). null if not stated.
- strength: strong | conditional | good_practice | null — only if stated.
- certainty: high | moderate | low | very_low | null — only if stated.

CRITICAL: Use null when the text does not state something. Do NOT infer, and do
NOT generalise from clinical knowledge. An invented exclusion silently suppresses
guidance that actually applies to a patient, which is worse than leaving it blank.

Output only JSON lines, one per recommendation, no other text.

You MUST output exactly one line for EVERY numbered recommendation, including ones
you find unclear — in that case emit the object with null fields rather than
omitting the line. A missing line loses the recommendation entirely.

RECOMMENDATIONS:
`;

function parseResponse(raw, batchSize) {
    const out = new Map();
    for (const line of String(raw || '').split('\n')) {
        const t = line.trim();
        if (!t.startsWith('{')) continue;
        let obj;
        try { obj = JSON.parse(t); } catch { continue; }
        const n = Number(obj.n);
        if (!Number.isInteger(n) || n < 1 || n > batchSize) continue;

        const clean = (v, max = 300) => {
            if (v === null || v === undefined) return null;
            const s = String(v).trim();
            if (!s || /^(null|none|n\/a|not stated|unspecified)$/i.test(s)) return null;
            return s.slice(0, max);
        };
        const dir = String(obj.direction || '').trim().toLowerCase();

        out.set(n, {
            population: clean(obj.population),
            intervention: clean(obj.intervention, 200),
            direction: DIRECTIONS.has(dir) ? dir : null,
            exclusions: clean(obj.exclusions),
            trigger: clean(obj.trigger),
            strength: clean(obj.strength, 40),
            certainty: clean(obj.certainty, 40),
        });
    }
    return out;
}

async function callModel(aiService, prompt, label) {
    const candidates = getProviderCandidates({}, serverConfig);
    const errors = [];
    for (const { provider, model } of candidates) {
        try {
            return await aiService.callText(prompt, provider, model, {
                maxOutputTokens: 2048,
                timeoutMs: 90000,
            });
        } catch (err) {
            errors.push(`${provider}: ${err.message}`);
        }
    }
    throw new Error(`all providers failed for ${label}: ${errors.join('; ')}`);
}

async function main() {
    await db.connect();
    const aiService = createAiService({ serverConfig });

    const params = [TIER];
    let topicClause = '';
    if (TOPIC) { topicClause = ' AND normalized_topic = ?'; params.push(TOPIC); }
    params.push(LIMIT);

    // Pull full_text from document store when available so extraction runs on
    // the actual guideline body, not the already-truncated recommendation sentence.
    const rows = await db.all(
        `SELECT g.id, g.topic, g.recommendation_text,
                d.full_text, d.full_text_source, d.word_count
         FROM topic_guidelines g
         LEFT JOIN guideline_documents d ON d.id = g.document_id
         WHERE g.structured_at IS NULL
           AND g.evidence_tier = ?
           AND g.recommendation_text IS NOT NULL
           AND length(g.recommendation_text) >= 25
           ${topicClause}
         ORDER BY g.source_year DESC NULLS LAST, g.id
         LIMIT ?`,
        params
    );

    console.log(`[Structure] ${rows.length} unstructured rows${DRY_RUN ? ' (DRY RUN)' : ''}`);
    if (!rows.length) { process.exit(0); }

    let structured = 0, failed = 0;
    const filled = { population: 0, intervention: 0, direction: 0, exclusions: 0, trigger: 0 };

    for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);

        // When all rows in a batch share the same document (common: many recs from
        // one guideline), pass the full text once as context before the numbered
        // recommendations. Otherwise fall back to the stored recommendation sentence.
        const docIds = new Set(batch.map(r => r.document_id).filter(Boolean));
        let docContext = '';
        if (docIds.size === 1 && batch[0].full_text) {
            const words = batch[0].word_count || Math.round(batch[0].full_text.length / 5);
            docContext = `\n\n## Source document (${words} words)\nUse this to resolve population, exclusions and triggers not explicit in the extracted sentence:\n${batch[0].full_text.slice(0, 24000)}\n\n`;
        }

        const listing = batch
            .map((r, j) => `${j + 1}. [topic: ${r.topic}] ${r.recommendation_text}`)
            .join('\n\n');

        let parsed;
        try {
            const raw = await callModel(aiService, PROMPT + docContext + listing, `batch ${i / BATCH + 1}`);
            parsed = parseResponse(raw, batch.length);
            if (process.env.STRUCT_DEBUG === '1' && parsed.size < batch.length) {
                console.log(`  [debug] parsed ${parsed.size}/${batch.length}; raw response follows:`);
                console.log(String(raw).slice(0, 1800));
            }
        } catch (err) {
            failed += batch.length;
            console.log(`  batch ${i / BATCH + 1}: ERROR ${err.message}`);
            continue;
        }

        // The model drops items it finds unclear even when told not to. Retry the
        // missing ones singly rather than losing those recommendations — a dropped
        // line is indistinguishable from "nothing to extract", and the row would be
        // marked structured with every field empty.
        const missing = batch.map((_, j) => j + 1).filter((n) => !parsed.has(n));
        for (const n of missing) {
            const single = `1. [topic: ${batch[n - 1].topic}] ${batch[n - 1].recommendation_text}`;
            try {
                const raw = await callModel(aiService, PROMPT + single, `retry #${batch[n - 1].id}`);
                const one = parseResponse(raw, 1).get(1);
                if (one) parsed.set(n, one);
            } catch { /* leave unparsed; counted as failed below */ }
        }

        for (const [j, row] of batch.entries()) {
            const s = parsed.get(j + 1);
            if (!s) { failed += 1; continue; }

            for (const k of Object.keys(filled)) if (s[k]) filled[k] += 1;

            if (DRY_RUN) {
                console.log(`  #${row.id} ${String(row.topic).slice(0, 34)}`);
                console.log(`     intervention: ${s.intervention || '—'}  direction: ${s.direction || '—'}`);
                console.log(`     population:   ${(s.population || '—').slice(0, 80)}`);
                if (s.exclusions) console.log(`     exclusions:   ${s.exclusions.slice(0, 80)}`);
                if (s.trigger) console.log(`     trigger:      ${s.trigger.slice(0, 80)}`);
            } else {
                await db.run(
                    `UPDATE topic_guidelines SET
                        population = COALESCE(?, population),
                        intervention = COALESCE(?, intervention),
                        cautions = COALESCE(?, cautions),
                        recommendation_strength = COALESCE(?, recommendation_strength),
                        recommendation_certainty = COALESCE(?, recommendation_certainty),
                        rec_direction = ?, rec_exclusions = ?, rec_trigger = ?,
                        structured_at = ?
                     WHERE id = ?`,
                    [
                        s.population, s.intervention, s.exclusions,
                        s.strength, s.certainty,
                        s.direction, s.exclusions, s.trigger,
                        new Date().toISOString(), row.id,
                    ]
                ).catch((e) => { failed += 1; console.log(`  #${row.id} write failed: ${e.message}`); });
            }
            structured += 1;
        }
        if ((i / BATCH) % 5 === 0) console.log(`  ...${structured}/${rows.length}`);
    }

    const pct = (n) => `${n} (${Math.round(100 * n / Math.max(1, structured))}%)`;
    console.log(`\n[Structure] Done: ${structured} structured, ${failed} failed.`);
    console.log(`  intervention ${pct(filled.intervention)}  direction ${pct(filled.direction)}`);
    console.log(`  population   ${pct(filled.population)}  exclusions ${pct(filled.exclusions)}  trigger ${pct(filled.trigger)}`);
    process.exit(0);
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
