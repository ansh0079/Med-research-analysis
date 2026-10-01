const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('../../database', () => ({
    connect: jest.fn(async () => {}),
    close: jest.fn(async () => {}),
    run: jest.fn(async () => ({ changes: 1 })),
}));

const db = require('../../database');
const { loadFiles, main } = require('../../scripts/heldout-ingest-judgements');

test('reviewer-role value is an option value, not a filename', () => {
    expect(loadFiles(['reviewer.json', '--write', '--reviewer-role', 'tuner'])).toEqual(['reviewer.json']);
});

test('invalid labels fail the dry run without ingesting anything', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signalmd-labels-'));
    const file = path.join(dir, 'invalid.json');
    const originalArgv = process.argv;
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        fs.writeFileSync(file, JSON.stringify({
            labelledBy: 'reviewer',
            judgments: [{ query: 'ACS treatment', candidateUid: 'pubmed-1', relevance: '' }],
        }));
        process.argv = ['node', 'heldout-ingest-judgements.js', file];
        expect(await main()).toBe(1);
        expect(db.run).not.toHaveBeenCalled();
    } finally {
        process.argv = originalArgv;
        errorLog.mockRestore();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
