/**
 * Worker entry: run PDF extraction + section parsing in an isolated thread so the
 * main thread can terminate the worker and release native resources immediately.
 *
 * Extraction backend priority:
 *   1. GROBID (sidecar) — best quality for multi-column, tables, references
 *   2. Legacy pdf-parse + regex section parser — fallback when GROBID is down
 */
const { parentPort, workerData } = require('worker_threads');

async function run() {
    const pdf = require('pdf-parse');
    const { parsePdfSections } = require('./services/pdfSectionParser');
    const { processPdf } = require('./services/grobidClient');
    const { parseGrobidXml } = require('./services/grobidXmlParser');

    const buf = Buffer.isBuffer(workerData) ? workerData : Buffer.from(workerData);

    let text = '';
    let numpages = 0;
    let info = null;
    let sections = {};
    let orderedKeys = [];
    let tables = [];
    let wordCount = 0;
    let backend = 'legacy';

    // ── Attempt 1: GROBID ──
    try {
        const teiXml = await processPdf(buf);
        const grobidResult = parseGrobidXml(teiXml);
        sections = grobidResult.sections;
        orderedKeys = grobidResult.orderedKeys;
        tables = grobidResult.tables;
        wordCount = grobidResult.wordCount;
        backend = 'grobid';
        // Reconstruct flat text for consumers that still need raw text
        text = Object.values(sections).join('\n\n');
        // GROBID doesn't expose page count in TEI; downstream already handles 0
        numpages = 0;
        info = null;
    } catch (grobidErr) {
        // ── Attempt 2: Legacy pdf-parse + regex parser ──
        const data = await pdf(buf);
        text = data.text;
        numpages = data.numpages;
        info = data.info || null;
        const legacy = parsePdfSections(data.text);
        sections = legacy.sections;
        orderedKeys = legacy.orderedKeys;
        tables = legacy.tables;
        wordCount = legacy.wordCount;
        backend = 'legacy';
    }

    parentPort.postMessage({
        ok: true,
        text,
        numpages,
        info,
        sections,
        orderedKeys,
        tables,
        wordCount,
        backend,
    });

    if (global.gc) global.gc();
}

run().catch((err) => {
    parentPort.postMessage({ ok: false, error: err && err.message ? err.message : String(err) });
});
