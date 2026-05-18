const { Worker } = require('worker_threads');
const path = require('path');

const WORKER = path.join(__dirname, 'pdf-thread-worker.js');

/**
 * Parse PDF in a short-lived worker thread, then force-terminate the worker
 * so Jest / process teardown does not keep pdfjs native handles open.
 */
function extractPdfInWorker(buffer) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(WORKER, { workerData: buffer });
        const t = setTimeout(() => {
            try {
                worker.terminate();
            } catch { /* empty */ }
            reject(new Error('PDF extraction timed out'));
        }, 120000);

        worker.on('message', (msg) => {
            clearTimeout(t);
            try {
                worker.terminate();
            } catch { /* empty */ }
            if (msg && msg.ok) {
                resolve({ text: msg.text, numpages: msg.numpages, info: msg.info });
            } else {
                reject(new Error((msg && msg.error) || 'PDF worker failed'));
            }
        });
        worker.on('error', (err) => {
            clearTimeout(t);
            try {
                worker.terminate();
            } catch { /* empty */ }
            reject(err);
        });
        worker.on('exit', (code) => {
            if (code !== 0) {
                clearTimeout(t);
            }
        });
    });
}

/**
 * Stub for test cleanup compatibility.
 */
async function closePool() { /* Workers are short-lived and terminated per call */ }

module.exports = { extractPdfInWorker, closePool };
