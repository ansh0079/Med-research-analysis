'use strict';
/** One-off: build the owner's self-run labeling worksheet from live prod search. */
const fs = require('fs');
const path = require('path');

const BASE = 'https://signalmd.co';
const OUT = path.join(__dirname, '..', 'labeler-handoff', 'submissions', 'owner-run-worksheet.json');

(async () => {
    const worksheet = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tests/fixtures/heldout/scenarios/worksheet.json'), 'utf8'));
    const scenarios = worksheet.scenarios;
    const out = {
        labelledBy: 'ansh0-owner-selfrun',
        note: 'Self-run to exercise the labeling loop. Ingest with --reviewer-role tuner: these verdicts are recorded but must NOT graduate into the held-out set.',
        judgments: [],
    };
    let fetched = 0;
    for (const s of scenarios) {
        let articles = [];
        for (let attempt = 1; attempt <= 4 && !articles.length; attempt += 1) {
            try {
                const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(s.query)}`, { signal: AbortSignal.timeout(30000) });
                const text = await res.text();
                // Prod can rate-limit bursts; an HTML error page is not JSON.
                if (!res.ok || !text.trimStart().startsWith('{')) {
                    await new Promise((r) => setTimeout(r, 5000 * attempt));
                    continue;
                }
                articles = (JSON.parse(text).articles || []).slice(0, 5);
            } catch {
                await new Promise((r) => setTimeout(r, 5000 * attempt));
            }
        }
        if (!articles.length) console.error(`no candidates for ${s.id} (${s.query})`);
        for (const a of articles) {
            out.judgments.push({
                scenarioId: s.id,
                query: s.query,
                intendedSense: s.intendedSense,
                candidateUid: a.uid,
                articleTitle: a.title,
                _servedMeta: { source: a.source, pubdate: a.pubdate, rank: articles.indexOf(a) + 1 },
                labelledAt: '',
                relevance: '',
                applicability: '',
                evidenceType: '',
                support: '',
                edition: '',
                reason: '',
            });
        }
        fetched += 1;
        if (fetched % 10 === 0) console.log(`${fetched}/${scenarios.length}`);
        await new Promise((r) => setTimeout(r, 400));
    }
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
    console.log(`wrote ${OUT} with ${out.judgments.length} candidates across ${scenarios.length} scenarios`);
})();
