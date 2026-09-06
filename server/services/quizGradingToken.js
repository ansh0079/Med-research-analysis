'use strict';

const crypto = require('crypto');

const TOKEN_VERSION = 1;
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

function gradingSecret() {
    const configured = process.env.QUIZ_GRADING_SECRET || process.env.JWT_SECRET;
    if (configured) return configured;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('QUIZ_GRADING_SECRET or JWT_SECRET is required in production');
    }
    return 'signal-md-development-quiz-grading-secret';
}

function encode(value) {
    return Buffer.from(value).toString('base64url');
}

function questionHash(questionText) {
    return crypto.createHash('sha256').update(String(questionText || '').trim()).digest('hex').slice(0, 24);
}

function signature(encodedPayload) {
    return crypto.createHmac('sha256', gradingSecret()).update(encodedPayload).digest('base64url');
}

function createQuizGradingToken(question, { now = Date.now(), ttlSeconds = DEFAULT_TTL_SECONDS } = {}) {
    if (!question?.id || !question?.correctAnswer) return null;
    const payload = {
        v: TOKEN_VERSION,
        qid: String(question.id),
        answer: String(question.correctAnswer),
        qh: questionHash(question.question || question.questionText),
        exp: Math.floor(now / 1000) + Math.max(60, Number(ttlSeconds) || DEFAULT_TTL_SECONDS),
    };
    const encodedPayload = encode(JSON.stringify(payload));
    return `${encodedPayload}.${signature(encodedPayload)}`;
}

function verifyQuizGradingToken(token, attempt, { now = Date.now() } = {}) {
    try {
        const [encodedPayload, providedSignature, extra] = String(token || '').split('.');
        if (!encodedPayload || !providedSignature || extra) return { valid: false, reason: 'malformed' };
        const expectedSignature = signature(encodedPayload);
        const a = Buffer.from(providedSignature);
        const b = Buffer.from(expectedSignature);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false, reason: 'signature' };
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        if (payload.v !== TOKEN_VERSION) return { valid: false, reason: 'version' };
        if (Number(payload.exp) < Math.floor(now / 1000)) return { valid: false, reason: 'expired' };
        if (String(payload.qid) !== String(attempt?.questionId || '')) return { valid: false, reason: 'question_id' };
        if (payload.qh !== questionHash(attempt?.questionText)) return { valid: false, reason: 'question_text' };
        if (!payload.answer) return { valid: false, reason: 'answer' };
        return { valid: true, correctAnswer: String(payload.answer) };
    } catch (_error) {
        return { valid: false, reason: 'invalid' };
    }
}

function attachQuizGradingTokens(body) {
    if (!body || !Array.isArray(body.questions)) return body;
    return {
        ...body,
        questions: body.questions.map((question) => ({
            ...question,
            gradingToken: createQuizGradingToken(question),
        })),
    };
}

function attachLearningRoundGradingTokens(result) {
    if (!result || typeof result !== 'object') return result;
    const round = result.round && typeof result.round === 'object' ? result.round : null;
    const items = Array.isArray(round?.items) ? round.items : Array.isArray(result.items) ? result.items : null;
    if (!items) return result;
    const signedItems = items.map((item, index) => {
        const id = `round-${item.id ?? index}`;
        const question = { id, question: item.questionText, correctAnswer: item.correctAnswer };
        return { ...item, gradingToken: createQuizGradingToken(question) };
    });
    if (round) return { ...result, round: { ...round, items: signedItems } };
    return { ...result, items: signedItems };
}

module.exports = {
    DEFAULT_TTL_SECONDS,
    questionHash,
    createQuizGradingToken,
    verifyQuizGradingToken,
    attachQuizGradingTokens,
    attachLearningRoundGradingTokens,
};
