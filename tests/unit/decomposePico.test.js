const callStructured = jest.fn();

jest.mock('../../server/services/aiService', () => ({
    ...jest.requireActual('../../server/services/aiService'),
    createAiService: jest.fn(() => ({ callStructured })),
    getSharedAiService: jest.fn(() => ({ callStructured })),
}));

const { decomposePico } = require('../../server/services/unifiedEvidenceSearch');

describe('decomposePico provider routing', () => {
    beforeEach(() => {
        callStructured.mockReset();
        callStructured.mockResolvedValue({
            population: 'adults', intervention: 'aspirin', comparison: 'placebo', outcome: 'mortality', confidence: 0.9,
        });
    });

    test('runs PICO decomposition when only an Anthropic (Claude) key is configured', async () => {
        const serverConfig = { keys: { anthropic: 'sk-test' } };
        const result = await decomposePico('aspirin vs placebo for mortality in adults', serverConfig, fetch);

        expect(result).not.toBeNull();
        expect(result.population).toBe('adults');
        expect(callStructured).toHaveBeenCalledTimes(1);
        expect(callStructured.mock.calls[0][1]).toBe('claude');
    });

    test('still runs PICO decomposition with a Gemini key (existing behavior)', async () => {
        const serverConfig = { keys: { gemini: 'gm-test' } };
        const result = await decomposePico('aspirin vs placebo for mortality in adults', serverConfig, fetch);

        expect(result).not.toBeNull();
        expect(callStructured.mock.calls[0][1]).toBe('gemini');
    });

    test('returns null when no provider keys are configured at all', async () => {
        const serverConfig = { keys: {} };
        const result = await decomposePico('aspirin vs placebo for mortality in adults', serverConfig, fetch);

        expect(result).toBeNull();
        expect(callStructured).not.toHaveBeenCalled();
    });
});
