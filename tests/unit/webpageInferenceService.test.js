const {
    buildWebpageInferencePrompt,
    inferWebpageContent,
    normalizeInference,
    normalizePagePayload,
} = require('../../server/services/webpageInferenceService');

describe('webpageInferenceService', () => {
    test('normalizePagePayload sanitizes captured webpage fields', () => {
        const page = normalizePagePayload({
            url: ' https://example.org/ards ',
            title: ' ARDS guideline ',
            text: ' Patients with ARDS should receive lung protective ventilation. ',
            headings: ['  Summary  ', 'Summary'],
            keywords: ['ARDS', 'ventilation'],
            safetySignals: { hasForms: true, hasPasswordField: false, hasPaymentField: false, externalLinkCount: 4 },
        });

        expect(page.title).toBe('ARDS guideline');
        expect(page.headings).toEqual(['Summary']);
        expect(page.safetySignals.hasForms).toBe(true);
        expect(page.safetySignals.externalLinkCount).toBe(4);
    });

    test('normalizeInference degrades malformed LLM fields safely', () => {
        const inference = normalizeInference({
            pageType: 'made_up',
            clinicalTopic: 'Pulmonary embolism',
            confidence: 2,
            evidenceLevel: 'excellent',
            safetyAssessment: { riskLevel: 'high', concerns: ['Commercial claim'] },
            suggestedActions: ['search_evidence', 'unsafe_action'],
        }, { keywords: ['embolism'] });

        expect(inference.pageType).toBe('unknown');
        expect(inference.confidence).toBe(1);
        expect(inference.evidenceLevel).toBe('unclear');
        expect(inference.safetyAssessment.riskLevel).toBe('high');
        expect(inference.suggestedActions).toEqual(['search_evidence']);
    });

    test('inferWebpageContent calls structured AI and returns normalized inference', async () => {
        const ai = {
            callStructured: jest.fn().mockResolvedValue({
                pageType: 'guideline',
                clinicalTopic: 'ARDS ventilation',
                confidence: 0.82,
                plainLanguageSummary: 'This page discusses ventilation recommendations for ARDS.',
                evidenceLevel: 'moderate',
                pico: { population: 'Adults with ARDS', intervention: 'Ventilation', comparison: null, outcomes: ['mortality'] },
                keyClaims: ['Use lung protective ventilation.'],
                safetyAssessment: { riskLevel: 'low', concerns: [] },
                searchQuery: 'ARDS lung protective ventilation guideline',
                suggestedActions: ['search_evidence', 'generate_mcqs'],
            }),
        };

        const result = await inferWebpageContent({
            ai,
            provider: 'gemini',
            model: 'gemini-model',
            page: {
                url: 'https://example.org',
                title: 'ARDS ventilation',
                text: 'Adults with ARDS should receive lung protective ventilation based on guideline recommendations and outcomes.',
            },
        });

        expect(ai.callStructured).toHaveBeenCalledWith(
            expect.stringContaining('Signal MD'),
            'gemini',
            'gemini-model',
            expect.objectContaining({ jsonMode: true })
        );
        expect(result.inference.pageType).toBe('guideline');
        expect(result.inference.clinicalTopic).toBe('ARDS ventilation');
    });

    test('buildWebpageInferencePrompt includes safety markers', () => {
        const prompt = buildWebpageInferencePrompt(normalizePagePayload({
            title: 'Checkout',
            text: 'Medical product checkout page with payment form.',
            safetySignals: { hasPasswordField: true, hasPaymentField: true, hasForms: true, externalLinkCount: 2 },
        }));

        expect(prompt).toContain('password=true');
        expect(prompt).toContain('payment=true');
    });
});
