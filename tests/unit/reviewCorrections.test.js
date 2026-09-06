'use strict';

const express = require('express');
const request = require('supertest');
const { registerAiJobRoutes } = require('../../server/routes/ai/jobs');
const { createQuizGradingToken } = require('../../server/services/quizGradingToken');
const { gradeQuizAttempts } = require('../../server/routes/learning/quiz');
const { evidenceSourceTrust, filterQuestionsByEvidenceTrust } = require('../../server/services/learning/quizGenerationService');
const { needsRegeneration, synthesisKey } = require('../../server/services/hierarchicalCacheService');
const { selectBootstrapArm } = require('../../server/services/bandit/sampling');
const { selectArmByLinearValue, ARM_IDS, featureDim } = require('../../server/services/contextualValueModel');
const { paperSynopsisJobKey } = require('../../server/services/ai/aiGenerationJobService');
const { schemas } = require('../../server/utils/validation');

describe('review corrections', () => {
    test('server grading ignores a browser-supplied correct answer', () => {
        const gradingToken = createQuizGradingToken({ id: 'q1', question: 'Question?', correctAnswer: 'A' });
        const result = gradeQuizAttempts([{
            questionId: 'q1',
            questionType: 'recall',
            questionText: 'Question?',
            userAnswer: 'A',
            correctAnswer: 'B',
            isCorrect: false,
            gradingToken,
        }]);
        expect(result.error).toBeNull();
        expect(result.attempts[0]).toMatchObject({ correctAnswer: 'A', isCorrect: true, clientReportedIsCorrect: false });
    });

    test('server grading rejects a token reused for different question text', () => {
        const gradingToken = createQuizGradingToken({ id: 'q1', question: 'Original?', correctAnswer: 'A' });
        const result = gradeQuizAttempts([{ questionId: 'q1', questionText: 'Changed?', userAnswer: 'A', gradingToken }]);
        expect(result).toMatchObject({ error: 'question_text', attempts: [] });
    });

    test('AI job detail and claims are hidden from a different user', async () => {
        const db = {
            getAiGenerationJobByKey: jest.fn().mockResolvedValue({ jobKey: 'job-a', userId: 'user-a', status: 'completed' }),
            listAiGenerationClaimsByJobKey: jest.fn().mockResolvedValue([{ id: 1 }]),
        };
        const app = express();
        app.use((req, _res, next) => { req.user = { id: 'user-b' }; req.log = { error: jest.fn() }; next(); });
        registerAiJobRoutes(app, { db, requireAuthJwt: (_req, _res, next) => next(), rateLimit: () => (_req, _res, next) => next() });

        await request(app).get('/api/ai/jobs/job-a').expect(404);
        await request(app).get('/api/ai/jobs/job-a/claims').expect(404);
        expect(db.listAiGenerationClaimsByJobKey).not.toHaveBeenCalled();
    });

    test('async synopsis job keys are isolated per user', () => {
        const article = { uid: 'pmid:123' };
        expect(paperSynopsisJobKey(article, 'model', 'student', 'user-a'))
            .not.toBe(paperSynopsisJobKey(article, 'model', 'student', 'user-b'));
    });

    test('high-stakes evidence trust requires server-confirmed full text or a guideline', () => {
        expect(evidenceSourceTrust({ title: 'Abstract only' }).verificationStatus).toBe('abstract_only');
        expect(evidenceSourceTrust({ _fullTextIndexed: true }).verificationStatus).toBe('full_text_available');
        expect(evidenceSourceTrust({ pubtype: ['Practice Guideline'] }).verificationStatus).toBe('guideline_supported');
        expect(evidenceSourceTrust({ _retraction: { isRetracted: true } }).reviewState).toBe('needs_revision');
    });

    test('evidence quizzes retain recall but drop abstract-only clinical questions', () => {
        const filtered = filterQuestionsByEvidenceTrust([
            { id: 'recall', questionType: 'recall', claimVerificationStatus: 'abstract_only' },
            { id: 'clinical', questionType: 'clinical_application', claimVerificationStatus: 'abstract_only' },
            { id: 'guideline', questionType: 'guideline', claimVerificationStatus: 'guideline_supported' },
        ]);
        expect(filtered.questions.map((question) => question.id)).toEqual(['recall', 'guideline']);
        expect(filtered.droppedHighStakes).toHaveLength(1);
    });

    test('hierarchical synthesis cache is user-scoped and invalidates source removals', () => {
        expect(synthesisKey('ARDS', 'p1', { userId: 'a' })).not.toBe(synthesisKey('ARDS', 'p1', { userId: 'b' }));
        expect(needsRegeneration({
            timestamp: new Date().toISOString(),
            sources: [{ uid: 'p1' }, { uid: 'p2' }],
        }, [{ uid: 'p1' }])).toBe(true);
    });

    test('density gate can deliberately bootstrap an untried arm with correct propensity', () => {
        const result = selectBootstrapArm(
            ['heuristic_default', 'engagement_heavy', 'quiz_gap_heavy'],
            'heuristic_default',
            { globalPulls: 100, rows: [{ arm_id: 'heuristic_default', pulls: 100 }] },
            { explorationRate: 0.12, random: () => 0, minGlobalPulls: 20 }
        );
        expect(result.armId).toBe('engagement_heavy');
        expect(result.propensity).toBeCloseTo(0.06);
        expect(Object.values(result.propensityByArm).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    });

    test('linear epsilon-greedy selection reports the actual policy probability', () => {
        const model = { ok: true, weights: Array(featureDim()).fill(0), armIds: ARM_IDS };
        const selected = selectArmByLinearValue(model, {}, { epsilon: 0.2, random: () => 0 });
        expect(selected.source).toBe('epsilon_explore');
        expect(selected.propensity).toBeCloseTo(0.8 + (0.2 / ARM_IDS.length));
        expect(Object.values(selected.propensityByArm).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    });

    test('quiz submission schema preserves reward lineage and reasoning signals', () => {
        const parsed = schemas.quizAttempt.parse({
            topic: 'ARDS',
            attempts: [{
                questionId: 'q1', questionType: 'recall', questionText: 'Q?', userAnswer: 'A', gradingToken: 'token',
                claimDecisionId: 42, reasoningTags: ['overclaim'], reasoningNote: 'Reasoning note',
            }],
        });
        expect(parsed.attempts[0]).toMatchObject({ claimDecisionId: 42, reasoningTags: ['overclaim'], reasoningNote: 'Reasoning note' });
    });
});
