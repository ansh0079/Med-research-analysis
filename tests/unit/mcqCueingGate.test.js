'use strict';

const { validateMcqBatch } = require('../../server/services/quizGeneration/mcqValidation');

const logger = { warn: jest.fn(), info: jest.fn(), error: jest.fn() };

const balanced = (letter) => ({
    correctAnswer: letter,
    question: 'A 62-year-old presents with breathlessness. What is the next step?',
    options: [
        'A: Start a beta-blocker after confirming euvolaemia on examination',
        'B: Start an ACE inhibitor after checking renal function and potassium',
        'C: Start a loop diuretic after documenting orthopnoea and oedema',
        'D: Start spironolactone after confirming potassium below 5.0 mmol/L',
    ],
});

const cued = (letter = 'B') => ({
    correctAnswer: letter,
    question: 'A 34-year-old pregnant woman has suspected PE. Which algorithm applies?',
    options: [
        'A: Standard YEARS algorithm',
        'B: Pregnancy-adapted YEARS algorithm, which is validated in pregnancy and'
            + ' avoids unnecessary imaging while remaining safe and effective',
        'C: Immediate CT angiography',
        'D: V/Q scintigraphy first',
    ],
});

function reviewer(acceptAll = true) {
    return {
        validateBatch: jest.fn(async ({ questions }) => ({
            reviewed: questions.length,
            rejections: [],
            validIndices: new Set(questions.map((_, i) => (acceptAll ? i + 1 : -1))),
            modelsUsed: ['test'],
        })),
        recordValidationResult: jest.fn(),
    };
}

const run = (raw, mcqValidator) => validateMcqBatch({
    mcqValidator, logger, topic: 'heart failure', normalizedTopic: 'heart failure',
    raw, provider: 'test', model: 'test', articles: [], guidelines: [],
});

beforeEach(() => jest.clearAllMocks());

describe('MCQ cueing gate', () => {
    it('drops a question whose key is the longest option', async () => {
        const result = await run([balanced('A'), cued()], reviewer());
        expect(result.validatedRaw).toHaveLength(1);
        expect(result.validatedRaw[0].correctAnswer).toBe('A');
        expect(result.validationSummary.cuedRejected).toBe(1);
    });

    it('MCQ_CUE_HANDLING=flag keeps a correct cued item and marks it for review instead of dropping it', async () => {
        process.env.MCQ_CUE_HANDLING = 'flag';
        try {
            const result = await run([balanced('A'), cued()], reviewer());
            expect(result.validatedRaw).toHaveLength(2);
            expect(result.validatedRaw.find((q) => q.correctAnswer === 'B').reviewSignals).toEqual(['key_is_longest_option']);
            expect(result.validatedRaw.find((q) => q.correctAnswer === 'A').reviewSignals).toBeUndefined();
            expect(result.validationSummary).toMatchObject({ cuedRejected: 0, cueSignals: 1 });
        } finally {
            delete process.env.MCQ_CUE_HANDLING;
        }
    });

    it('never sends a cued question to the clinical reviewer', async () => {
        // The reviewer reads for clinical correctness and a cued question is
        // clinically correct, so it cannot catch this.
        const mcqValidator = reviewer();
        await run([balanced('A'), cued()], mcqValidator);
        const sent = mcqValidator.validateBatch.mock.calls[0][0].questions;
        expect(sent).toHaveLength(1);
        expect(sent[0].correctAnswer).toBe('A');
    });

    it('keeps a balanced batch untouched', async () => {
        const result = await run([balanced('A'), balanced('C')], reviewer());
        expect(result.validatedRaw).toHaveLength(2);
        expect(result.validationSummary.cuedRejected).toBe(0);
    });

    it('keeps one item rather than returning an empty batch', async () => {
        // An empty batch turns a quality defect into an outage.
        const result = await run([cued('B'), cued('B')], reviewer());
        expect(result.validatedRaw).toHaveLength(1);
        expect(result.error).toBeUndefined();
    });

    it('reports the cued count even when the reviewer is unavailable', async () => {
        const broken = {
            validateBatch: jest.fn(async () => { throw new Error('reviewer down'); }),
            recordValidationResult: jest.fn(),
        };
        const result = await run([balanced('A'), cued()], broken);
        expect(result.validationSummary.cuedRejected).toBe(1);
    });
});
