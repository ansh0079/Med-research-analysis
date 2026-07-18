'use strict';

const { parseStructuredOutput } = require('../utils/parseJson');
const {
    validateContract,
    ArticleSynopsisSchema,
    ConflictExtractionSchema,
    PicoProfileSchema,
    ConsensusSynopsisSchema,
} = require('../../shared/contracts');
const { z } = require('zod');

const QuizQuestionsSchema = z.object({
    questions: z.array(z.object({}).passthrough()).min(1),
});

const TopicKnowledgeSchema = z.object({
    mentorMessage: z.string().min(1),
    teachingPoints: z.array(z.unknown()).optional(),
    seminalPapers: z.array(z.unknown()).optional(),
    mcqAngles: z.array(z.string()).optional(),
}).passthrough();

const FullSynthesisSchema = z.object({
    consensus: z.string().optional(),
    overallAnswer: z.string().optional(),
    clinicalBottomLine: z.string().optional(),
    evidenceGrade: z.string().optional(),
}).passthrough().refine(
    (data) => Boolean(data.consensus || data.overallAnswer || data.clinicalBottomLine),
    { message: 'synthesis must include consensus, overallAnswer, or clinicalBottomLine' }
);

const EVIDENCE_TO_STRENGTH = {
    HIGH: 'strong',
    MODERATE: 'moderate',
    LOW: 'limited',
    VERY_LOW: 'limited',
};

const OUTPUT_PROFILES = {
    paper_synopsis: {
        schema: ArticleSynopsisSchema,
        normalize: (raw) => {
            const data = typeof raw === 'object' && raw !== null ? raw : parseStructuredOutput(String(raw || ''));
            if (!data.trustRating || !['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'].includes(data.trustRating)) {
                data.trustRating = 'MODERATE';
            }
            // AI occasionally returns array for string fields — coerce to joined string
            const STRING_FIELDS = [
                'takeaway', 'clinicalQuestion', 'studyDesign', 'population', 'intervention',
                'comparator', 'mainFindings', 'clinicalMeaning', 'limitations', 'bottomLine',
                'trustRationale',
            ];
            for (const field of STRING_FIELDS) {
                if (Array.isArray(data[field])) {
                    data[field] = data[field].filter(Boolean).join('. ');
                }
            }
            // whatNotToOverclaim / quizFocusPoints are string[] in the contract; coerce scalars.
            for (const listField of ['whatNotToOverclaim', 'quizFocusPoints']) {
                if (typeof data[listField] === 'string') {
                    const trimmed = data[listField].trim();
                    data[listField] = trimmed ? [trimmed] : [];
                } else if (Array.isArray(data[listField])) {
                    data[listField] = data[listField].map((item) => String(item || '').trim()).filter(Boolean);
                }
            }
            return data;
        },
        degrade: () => ({
            takeaway: null,
            trustRating: 'MODERATE',
            _validationDegraded: true,
        }),
    },
    consensus_synopsis: {
        schema: ConsensusSynopsisSchema,
        normalize: (raw) => {
            const data = typeof raw === 'object' && raw !== null ? raw : parseStructuredOutput(String(raw || ''));
            if (!data.strength && data.evidenceStrength) {
                data.strength = EVIDENCE_TO_STRENGTH[data.evidenceStrength] || 'limited';
            }
            if (!data.statement && data.clinicalBottomLine) {
                data.statement = String(data.clinicalBottomLine);
            }
            return data;
        },
        degrade: () => ({ statement: '', strength: 'limited', _validationDegraded: true }),
    },
    conflict_extraction: {
        schema: ConflictExtractionSchema,
        normalize: (raw) => (typeof raw === 'object' && raw !== null ? raw : parseStructuredOutput(String(raw || ''))),
        degrade: () => ({ conflictMatrix: [], _validationDegraded: true }),
    },
    pico_extraction: {
        schema: PicoProfileSchema,
        normalize: (raw) => {
            const data = typeof raw === 'object' && raw !== null ? raw : parseStructuredOutput(String(raw || ''));
            data.outcomes = Array.isArray(data.outcomes) ? data.outcomes.map(String) : [];
            data.missingFields = Array.isArray(data.missingFields) ? data.missingFields.map(String) : [];
            data.sampleSize = Number.isFinite(Number(data.sampleSize)) ? Number(data.sampleSize) : 0;
            data.confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0));
            return data;
        },
        degrade: () => ({
            population: '',
            intervention: '',
            comparison: '',
            confidence: 0,
            _validationDegraded: true,
        }),
    },
    quiz_generation: {
        schema: QuizQuestionsSchema,
        normalize: (raw) => {
            if (Array.isArray(raw)) return { questions: raw };
            const parsed = typeof raw === 'object' && raw !== null ? raw : parseStructuredOutput(String(raw || ''));
            if (Array.isArray(parsed)) return { questions: parsed };
            if (Array.isArray(parsed?.questions)) return parsed;
            if (Array.isArray(parsed?.mcqs)) return { questions: parsed.mcqs };
            return parsed;
        },
        degrade: () => ({ questions: [], _validationDegraded: true }),
    },
    topic_knowledge: {
        schema: TopicKnowledgeSchema,
        normalize: (raw) => (typeof raw === 'object' && raw !== null ? raw : parseStructuredOutput(String(raw || ''))),
        degrade: () => ({ mentorMessage: '', _validationDegraded: true }),
    },
    full_synthesis: {
        schema: FullSynthesisSchema,
        normalize: (raw) => (typeof raw === 'object' && raw !== null ? raw : parseStructuredOutput(String(raw || ''))),
        degrade: () => ({
            consensus: '',
            evidenceGrade: 'LOW',
            _validationDegraded: true,
        }),
    },
};

/**
 * Unified AI output boundary: parse → validate → normalize → reject/degrade.
 * @param {'paper_synopsis'|'consensus_synopsis'|'conflict_extraction'|'pico_extraction'|'quiz_generation'|'topic_knowledge'|'full_synthesis'} profile
 * @param {unknown} raw
 * @param {{ allowDegrade?: boolean }} [options]
 */
function validateAiOutput(profile, raw, options = {}) {
    const spec = OUTPUT_PROFILES[profile];
    if (!spec) {
        return { ok: false, data: null, errors: [`Unknown AI output profile: ${profile}`], degraded: null };
    }

    let parsed = raw;
    if (typeof raw === 'string') {
        try {
            parsed = parseStructuredOutput(raw);
        } catch (err) {
            if (!options.allowDegrade) {
                return { ok: false, data: null, errors: [err.message], degraded: null };
            }
            return {
                ok: false,
                data: null,
                errors: [err.message],
                degraded: spec.degrade(),
            };
        }
    }

    const normalized = spec.normalize(parsed);
    const result = validateContract(spec.schema, normalized, { label: profile });
    if (result.ok) return result;

    if (options.allowDegrade) {
        return {
            ok: false,
            data: null,
            errors: result.errors,
            degraded: spec.degrade(),
        };
    }

    return result;
}

module.exports = {
    OUTPUT_PROFILES,
    validateAiOutput,
    QuizQuestionsSchema,
    TopicKnowledgeSchema,
    FullSynthesisSchema,
};
