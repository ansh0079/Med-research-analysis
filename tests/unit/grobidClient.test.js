// ==========================================
// Unit Tests for GROBID HTTP Client
// ==========================================

const {
    processPdf,
    isGrobidAlive,
    getGrobidUrl,
    GrobidUnavailableError,
} = require('../../server/services/grobidClient');

describe('grobidClient', () => {
    const originalEnv = process.env.GROBID_URL;

    afterEach(() => {
        process.env.GROBID_URL = originalEnv;
        jest.restoreAllMocks();
    });

    describe('getGrobidUrl', () => {
        it('returns default when env is unset', () => {
            delete process.env.GROBID_URL;
            expect(getGrobidUrl()).toBe('http://localhost:8070');
        });

        it('returns null when env is "false"', () => {
            process.env.GROBID_URL = 'false';
            expect(getGrobidUrl()).toBeNull();
        });

        it('returns null when env is "0"', () => {
            process.env.GROBID_URL = '0';
            expect(getGrobidUrl()).toBeNull();
        });

        it('returns custom URL when set', () => {
            process.env.GROBID_URL = 'http://grobid.example.com:8070';
            expect(getGrobidUrl()).toBe('http://grobid.example.com:8070');
        });
    });

    describe('isGrobidAlive', () => {
        it('returns false when GROBID_URL is disabled', async () => {
            process.env.GROBID_URL = 'false';
            const alive = await isGrobidAlive();
            expect(alive).toBe(false);
        });

        it('returns true on HTTP 200', async () => {
            process.env.GROBID_URL = 'http://localhost:8070';
            global.fetch = jest.fn().mockResolvedValue({ status: 200 });
            const alive = await isGrobidAlive();
            expect(alive).toBe(true);
            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8070/api/isalive',
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('returns false on network error', async () => {
            process.env.GROBID_URL = 'http://localhost:8070';
            global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
            const alive = await isGrobidAlive();
            expect(alive).toBe(false);
        });
    });

    describe('processPdf', () => {
        it('throws GrobidUnavailableError when disabled', async () => {
            process.env.GROBID_URL = 'false';
            await expect(processPdf(Buffer.from('pdf'))).rejects.toThrow(GrobidUnavailableError);
        });

        it('throws GrobidUnavailableError on timeout', async () => {
            process.env.GROBID_URL = 'http://localhost:8070';
            global.fetch = jest.fn().mockImplementation(() =>
                new Promise((_resolve, reject) => {
                    setTimeout(() => reject(new Error('AbortError')), 10);
                })
            );
            await expect(
                processPdf(Buffer.from('pdf'), { timeoutMs: 5 })
            ).rejects.toThrow(GrobidUnavailableError);
        });

        it('throws GrobidUnavailableError on non-2xx status', async () => {
            process.env.GROBID_URL = 'http://localhost:8070';
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 503,
                text: async () => 'Service Unavailable',
            });
            await expect(processPdf(Buffer.from('pdf'))).rejects.toThrow(
                'GROBID returned HTTP 503'
            );
        });

        it('returns TEI XML on success', async () => {
            process.env.GROBID_URL = 'http://localhost:8070';
            const xml = '<?xml version="1.0"?><TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Test</title></titleStmt></fileDesc></teiHeader><text><body><div><p>This is a long enough TEI document to pass the minimum length validation of one hundred characters.</p></div></body></text></TEI>';
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: async () => xml,
            });
            const result = await processPdf(Buffer.from('pdf'));
            expect(result).toBe(xml);
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/processFulltextDocument'),
                expect.objectContaining({ method: 'POST' })
            );
        });

        it('uses overridden URL from options', async () => {
            process.env.GROBID_URL = 'http://localhost:8070';
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: async () => '<?xml version="1.0"?><TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Test</title></titleStmt></fileDesc></teiHeader><text><body><div><p>This is a long enough TEI document to pass the minimum length validation of one hundred characters.</p></div></body></text></TEI>',
            });
            await processPdf(Buffer.from('pdf'), { grobidUrl: 'http://other:8070' });
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('http://other:8070'),
                expect.anything()
            );
        });
    });
});
