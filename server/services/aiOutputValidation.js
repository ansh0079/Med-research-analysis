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
        // TODO: Apply validateNumericGrounding to quiz explanations once source articles are passed into validation context
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
function textFromValue(value) {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(textFromValue).filter(Boolean).join(' ');
    if (typeof value === 'object') return Object.values(value).map(textFromValue).filter(Boolean).join(' ');
    return '';
}

function articleEvidenceTextForNumericGrounding(article = {}) {
    if (!article || typeof article !== 'object') return '';
    return [
        article.title,
        article.abstract,
        article.fullText,
        article.full_text,
        article.bodyText,
        article._fullTextText,
        article._fullTextContent,
        article._fullTextSections,
        article.fullTextSections,
    ].map(textFromValue).filter(Boolean).join(' ');
}

function normalizeNumericToken(token) {
    const cleaned = String(token || '').replace(/,/g, '').replace(/%/g, '').trim();
    if (!cleaned) return '';
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? String(numeric) : cleaned;
}

function extractNumericTokens(text) {
    const withoutCitations = String(text || '')
        .replace(/\[(?:\s*\d+\s*,?)+\]/g, ' ')
        .replace(/\((?:\s*\d+\s*,?)+\)/g, ' ');
    return Array.from(withoutCitations.matchAll(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?%?\b|\b\d+(?:\.\d+)?%?\b/g))
        .map((match) => normalizeNumericToken(match[0]))
        .filter(Boolean);
}

function validateNumericGrounding(data, articles = [], fields = ['mainFindings', 'bottomLine']) {
    const articleList = Array.isArray(articles) ? articles : [articles].filter(Boolean);
    const sourceTokens = new Set(extractNumericTokens(articleList.map(articleEvidenceTextForNumericGrounding).join(' ')));
    if (!sourceTokens.size) {
        const outputHasNumbers = fields.some((field) => extractNumericTokens(data?.[field]).length > 0);
        return outputHasNumbers
            ? { ok: false, issues: ['numeric grounding unavailable: source text has no numeric evidence tokens'] }
            : { ok: true, issues: [] };
    }

    const issues = [];
    for (const field of fields) {
        const tokens = extractNumericTokens(data?.[field]);
        const missing = [...new Set(tokens.filter((token) => !sourceTokens.has(token)))];
        if (missing.length) {
            issues.push(`${field} contains ungrounded numeric value(s): ${missing.join(', ')}`);
        }
    }
    return { ok: issues.length === 0, issues };
}

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
    if (result.ok) {
        if (profile === 'paper_synopsis' && options.groundingArticles) {
            const grounding = validateNumericGrounding(result.data, options.groundingArticles);
            if (!grounding.ok) {
                const errors = grounding.issues.map((issue) => `paper_synopsis numeric grounding failed: ${issue}`);
                if (options.allowDegrade) {
                    return {
                        ok: false,
                        data: null,
                        errors,
                        degraded: spec.degrade(),
                    };
                }
                return { ok: false, data: null, errors, degraded: null };
            }
        }

        // TODO: Numeric grounding for quiz_generation and case outputs.
        // Quiz MCQ explanations (quiz_generation profile) contain numeric claims that should be
        // grounded against the source articles used to generate them. Apply validateNumericGrounding
        // to each question's explanation field once groundingArticles is plumbed through the
        // validation context. Example for quiz_generation:
        //   if (profile === 'quiz_generation' && options.groundingArticles) {
        //       for (const q of result.data.questions || []) {
        //           const grounding = validateNumericGrounding(q, options.groundingArticles, ['explanation']);
        //           if (!grounding.ok) { /* flag or degrade */ }
        //       }
        //   }
        // This requires mcqGeneratorService.generateAndStoreMCQs to pass
        // { groundingArticles: sourceArticles } when calling validateAiOutput('quiz_generation', ...).
        // Case narrative outputs (no dedicated validateAiOutput profile yet) should receive the
        // same treatment once a case_narrative profile is introduced.

        return result;
    }

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
    articleEvidenceTextForNumericGrounding,
    extractNumericTokens,
    validateNumericGrounding,
    QuizQuestionsSchema,
    TopicKnowledgeSchema,
    FullSynthesisSchema,
};
