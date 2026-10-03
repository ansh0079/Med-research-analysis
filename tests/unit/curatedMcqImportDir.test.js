'use strict';

/**
 * The curated-MCQ importer reads its batches from a directory you can point it at. In production
 * /app/data is a persistent volume that hides the batches baked into the image, so the importer found
 * nothing ("No curated MCQ batches found") until the workflow mounted them from the server's checkout.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { run } = require('../../server/scripts/importCuratedTopicMcqs');

const repoBatch = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/curated-topic-mcqs/batch-01.json'), 'utf8'));

function tmpDirWith(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'curated-'));
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), JSON.stringify(content));
    return dir;
}

describe('curated MCQ importer directory', () => {
    let log;
    beforeEach(() => { log = jest.spyOn(console, 'log').mockImplementation(() => {}); });
    afterEach(() => log.mockRestore());

    test('a dry run reads the batches from the directory it is given and writes nothing', async () => {
        const dir = tmpDirWith({ 'batch-01.json': { ...repoBatch, topics: repoBatch.topics.slice(0, 2) } });
        const result = await run({ apply: false, dir });
        expect(result.files).toBe(1);
        expect(result.topics).toBe(2);
        expect(result.questions).toBe(repoBatch.topics.slice(0, 2).reduce((n, t) => n + t.mcqs.length, 0));
        expect(result.written).toBe(0);
    });

    test('only batch-N.json files are read', async () => {
        const dir = tmpDirWith({ 'batch-01.json': { ...repoBatch, topics: repoBatch.topics.slice(0, 1) }, 'notes.json': { topics: [] }, 'batch-extra.json': { topics: [] } });
        expect((await run({ dir })).files).toBe(1);
    });

    test('a missing or empty directory reports nothing found, rather than failing', async () => {
        expect(await run({ dir: path.join(os.tmpdir(), 'no-such-curated-dir') })).toMatchObject({ files: 0, questions: 0 });
        expect(await run({ dir: tmpDirWith({}) })).toMatchObject({ files: 0 });
    });

    test('the repository\'s own batches all validate, so the import would accept every topic', async () => {
        const result = await run({ dir: path.join(__dirname, '../../data/curated-topic-mcqs') });
        expect(result.files).toBe(7);
        expect(result.topics).toBe(67);
        expect(result.questions).toBe(1190);
    });
});
