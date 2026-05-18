/**
 * Worker entry: run pdf-parse + section parsing in an isolated thread so the
 * main thread can terminate the worker and release native resources immediately.
 */
const { parentPort, workerData } = require('worker_threads');

async function run() {
    const pdf = require('pdf-parse');
    const { parsePdfSections } = require('./services/pdfSectionParser');

    const buf = Buffer.isBuffer(workerData) ? workerData : Buffer.from(workerData);
    const data = await pdf(buf);

    const { sections, orderedKeys, tables, wordCount } = parsePdfSections(data.text);

    parentPort.postMessage({
        ok: true,
        text: data.text,
        numpages: data.numpages,
        info: data.info || null,
        sections,
        orderedKeys,
        tables,
        wordCount,
    });

    if (global.gc) global.gc();
}

run().catch((err) => {
    parentPort.postMessage({ ok: false, error: err && err.message ? err.message : String(err) });
});
