#!/usr/bin/env node
/**
 * Search specificity sweep — the pre-labels baseline.
 *
 * Grades every result of a fixed query set with the project's own matching
 * functions (originalConditionTerms / articleMatchesConditionTerm / isOffTopic),
 * so the eventual independently-labelled held-out evaluation can be compared
 * against something recorded before labels existed.
 *
 * Grades per result:
 *   title_match     a condition term (or its synonym) appears in the TITLE
 *   passing_mention eligibility passes, but only the abstract names the condition
 *   gate_failure    isOffTopic would reject it — a bypass route let it through
 *
 * Trial-acronym landmark titles grade as passing_mention; that is a known
 * limitation of a lexical grader and is why the held-out set still matters.
 *
 * Usage: node benchmarks/searchSpecificitySweep.mjs [--base https://signalmd.co] [--out eval-results/specificity-baseline-<date>.json]
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const {
    originalConditionTerms, articleMatchesConditionTerm,
} = require('../../server/utils/conditionQuery');
const { isOffTopic } = require('../../server/services/evidenceBouquet/queryRelevance');

const args = process.argv.slice(2);
function argValue(name, fallback) {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const BASE = argValue('base', 'https://signalmd.co').replace(/\/+$/, '');

const QUERIES = [
    // The three contamination smokes from the deploy runbook (abbreviation ambiguity).
    { q: 'ACS management', smoke: true, note: 'must not return American Cancer Society / compartment syndrome' },
    { q: 'AKI diagnosis', smoke: true, note: 'abbreviation; must stay renal' },
    { q: 'PE diagnosis', smoke: true, note: 'abbreviation; must stay pulmonary embolism' },
    // The 2026-10-01 specificity cases.
    { q: 'diagnosis and management of alcoholic hepatitis', note: 'negation case: NAFLD must not appear high' },
    { q: 'hepatitis b treatment', note: 'serotype: HBV only, not hepatitis A/C/D or alcoholic' },
    { q: 'hepatitis c treatment', note: 'serotype: HCV only' },
    { q: 'nonalcoholic fatty liver disease management', note: 'reverse negation: must stay NAFLD/NASH' },
    { q: 'iron deficiency anaemia', note: 'multi-word condition' },
    { q: 'hepatorenal syndrome terlipressin', note: 'condition + drug' },
    { q: 'sepsis management', note: 'broad single condition' },
    { q: 'copd exacerbation treatment', note: 'abbreviation + task' },
    { q: 'atrial fibrillation anticoagulation', note: 'condition + intervention class' },
    { q: 'stemi management', note: 'abbreviation' },
];

function grade(article, query, conditionTerms) {
    const title = String(article?.title || '').toLowerCase();
    if (isOffTopic(article, query, { queryMeshTerms: [] })) return 'gate_failure';
    const titleHit = conditionTerms.some(
        (t) => articleMatchesConditionTerm(title, t, { companionTerms: conditionTerms }),
    );
    return titleHit ? 'title_match' : 'passing_mention';
}

(async () => {
    const report = {
        base: BASE,
        recordedAt: new Date().toISOString(),
        grader: 'lexical: originalConditionTerms + articleMatchesConditionTerm (title) + isOffTopic (gate)',
        queries: [],
    };
    for (const { q, smoke, note } of QUERIES) {
        const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}`);
        const json = await res.json().catch(() => ({}));
        const articles = json.articles || json.results || [];
        const conditionTerms = originalConditionTerms(q);
        const graded = articles.map((a, i) => ({
            rank: i + 1,
            title: String(a.title || '').slice(0, 160),
            grade: grade(a, q, conditionTerms),
        }));
        const top10 = graded.slice(0, 10);
        const entry = {
            query: q,
            smoke: Boolean(smoke),
            note,
            conditionTerms,
            total: graded.length,
            top10TitleMatch: top10.filter((g) => g.grade === 'title_match').length,
            top10PassingMention: top10.filter((g) => g.grade === 'passing_mention').length,
            top10GateFailures: top10.filter((g) => g.grade === 'gate_failure').length,
            allGateFailures: graded.filter((g) => g.grade === 'gate_failure').length,
            results: graded,
        };
        report.queries.push(entry);
        console.log(
            `${q.padEnd(46)} top10 title-match ${entry.top10TitleMatch}/10`
            + ` | passing ${entry.top10PassingMention} | gate-fail ${entry.top10GateFailures}`
            + ` (all20 gate-fail ${entry.allGateFailures})`,
        );
    }
    const totals = report.queries.reduce((acc, e) => ({
        top10TitleMatch: acc.top10TitleMatch + e.top10TitleMatch,
        top10PassingMention: acc.top10PassingMention + e.top10PassingMention,
        top10GateFailures: acc.top10GateFailures + e.top10GateFailures,
    }), { top10TitleMatch: 0, top10PassingMention: 0, top10GateFailures: 0 });
    report.totals = { queries: report.queries.length, ...totals };
    console.log(`\nTOTAL  title-match ${totals.top10TitleMatch}/${report.queries.length * 10}`
        + ` | passing ${totals.top10PassingMention} | gate-fail ${totals.top10GateFailures}`);

    const out = argValue('out', path.join('eval-results', `specificity-baseline-${new Date().toISOString().slice(0, 10)}.json`));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`\nWrote ${out}`);
})().catch((err) => { console.error(err); process.exit(1); });
