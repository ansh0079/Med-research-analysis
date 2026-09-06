'use strict';

const crypto = require('crypto');

const TOKEN_VERSION = 2;
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

/**
 * The token travels to the browser inside the question payload, so anything in
 * it is readable by the person answering -- base64url is encoding, not secrecy.
 * v1 carried the correct answer in clear text, which let a reader decode the
 * answer key before choosing. The answer is therefore sealed with AES-256-GCM
 * under a key derived from the grading secret; the server can still grade
 * statelessly, but the payload gives a reader nothing.
 */
function answerKey() {
    return crypto.createHash('sha256').update(gradingSecret()).digest();
}

function sealAnswer(answer) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', answerKey(), iv);
    const ct = Buffer.concat([cipher.update(String(answer), 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), ct].map((b) => b.toString('base64url')).join('~');
}

/** @returns {string|null} the answer, or null when the blob is absent or tampered with. */
function openAnswer(sealed) {
    try {
        const [ivB64, tagB64, ctB64] = String(sealed || '').split('~');
        if (!ivB64 || !tagB64 || !ctB64) return null;
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm', answerKey(), Buffer.from(ivB64, 'base64url'),
        );
        decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
        const out = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64url')), decipher.final()]);
        return out.toString('utf8');
    } catch {
        return null;
    }
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
        answer: sealAnswer(question.correctAnswer),
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
        const correctAnswer = openAnswer(payload.answer);
        if (correctAnswer == null) return { valid: false, reason: 'answer' };
        return { valid: true, correctAnswer };
    } catch (_error) {
        return { valid: false, reason: 'invalid' };
    }
}

/**
 * Sign each question and remove the answer key from what goes over the wire.
 *
 * The client used to receive `correctAnswer` alongside every question and grade
 * locally, so the answers were readable in the network tab before answering.
 * Grading is authoritative on the server (see gradeQuizAttempts), so the client
 * does not need the answer until it has committed to one -- POST /api/quiz/grade
 * returns it then.
 */
function attachQuizGradingTokens(body) {
    if (!body || !Array.isArray(body.questions)) return body;
    return {
        ...body,
        questions: body.questions.map((question) => {
            const { correctAnswer: _withheld, ...rest } = question;
            return { ...rest, gradingToken: createQuizGradingToken(question) };
        }),
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
        const { correctAnswer: _withheld, ...rest } = item;
        return { ...rest, gradingToken: createQuizGradingToken(question) };
    });
    if (round) return { ...result, round: { ...round, items: signedItems } };
    return { ...result, items: signedItems };
}

module.exports = {
    DEFAULT_TTL_SECONDS,
    TOKEN_VERSION,
    sealAnswer,
    openAnswer,
    questionHash,
    createQuizGradingToken,
    verifyQuizGradingToken,
    attachQuizGradingTokens,
    attachLearningRoundGradingTokens,
};
