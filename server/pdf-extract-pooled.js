const logger = require('./config/logger');
const { PDFParse } = require('pdf-parse');
const { parsePdfSections } = require('./services/pdfSectionParser');
const { processPdf } = require('./services/grobidClient');
const { parseGrobidXml } = require('./services/grobidXmlParser');

/**
 * PDF extraction runs in the main thread.
 *
 * It previously ran in a spawned worker_thread, but pdf-parse v2 / pdfjs-dist
 * segfaults the process both when initialised in a second worker and when a
 * pdfjs-loaded worker is terminated. Running in-thread is stable (pdf-parse's
 * `destroy()` releases per-document native handles) and PDF preindexing is a
 * background, queued, best-effort task, so briefly occupying the event loop is
 * an acceptable trade for not crashing the server.
 *
 * Extraction backend priority:
 *   1. GROBID (sidecar) — best quality for multi-column, tables, references
 *   2. Legacy pdf-parse + regex section parser — fallback when GROBID is down
 */
async function extractPdfInWorker(buffer) {
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

    // ── Attempt 1: GROBID ──
    try {
        const teiXml = await processPdf(buf);
        const grobidResult = parseGrobidXml(teiXml);
        return {
            text: Object.values(grobidResult.sections).join('\n\n'),
            numpages: 0, // GROBID doesn't expose page count in TEI; downstream handles 0
            info: null,
            sections: grobidResult.sections,
            orderedKeys: grobidResult.orderedKeys,
            tables: grobidResult.tables,
            wordCount: grobidResult.wordCount,
            backend: 'grobid',
        };
    } catch (grobidErr) {
        logger.debug({ err: grobidErr }, 'GROBID unavailable; falling back to pdf-parse');
    }

    // ── Attempt 2: Legacy pdf-parse + regex parser ──
    // pdf-parse v2 exports the PDFParse class (v1 exported a callable).
    // pageJoiner '\n' keeps v1-style plain text (v2 injects page markers by default).
    const parser = new PDFParse({ data: buf });
    try {
        const data = await parser.getText({ pageJoiner: '\n' });
        const legacy = parsePdfSections(data.text);
        return {
            text: data.text,
            numpages: data.total,
            info: null,
            sections: legacy.sections,
            orderedKeys: legacy.orderedKeys,
            tables: legacy.tables,
            wordCount: legacy.wordCount,
            backend: 'legacy',
        };
    } finally {
        // Release pdfjs per-document native handles.
        await parser.destroy().catch(() => {});
    }
}

/**
 * No-op retained for API compatibility (extraction no longer uses a worker pool).
 */
async function closePool() { /* nothing to close */ }

module.exports = { extractPdfInWorker, closePool };
