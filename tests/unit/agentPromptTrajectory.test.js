const { buildAgentSystemPrompt, buildRetrievalContext, extractGroundedClaimsFromReply } = require('../../server/routes/agent');

describe('agent trajectory prompt', () => {
    test('labels current results and memory separately and includes weak trajectory context', () => {
        const prompt = buildAgentSystemPrompt(
            {
                topic: 'Sepsis',
                knowledge: {
                    seminalPapers: [{ sourceIndex: 1, title: 'Early goal directed therapy', clinicalPrinciple: 'landmark resuscitation trial' }],
                    teachingPoints: [{ claim: 'Use source control and antimicrobials early.' }],
                },
            },
            [{ title: 'AKI after septic shock', pubdate: '2026', abstract: 'Renal outcomes after septic shock.', _synapseTopics: ['AKI'] }],
            [{ source_body: 'SSC', source_year: 2021, recommendation_text: 'Give antimicrobials early.' }],
            {
                profile: { trainingStage: 'foundation_doctor', persona: 'doctor' },
                mastery: { overallScore: 45, recallScore: 70, clinicalApplicationScore: 40, trialInterpretationScore: 55, guidelineScore: 80, pitfallScore: 50 },
                weakTopics: [{ topic: 'AKI' }],
                topicMemory: { weakOutlineNodeIds: ['source-control', 'renal-hypoperfusion'] },
                previousQueries: ['sepsis management', 'vasopressors in shock'],
                synapseTopics: ['AKI'],
            },
            [],
            {
                teachingObjects: [{
                    objectKey: 'paper:1',
                    objectType: 'paper',
                    title: 'ARDSNet ARMA',
                    confidence: 0.85,
                    payload: { clinicalBottomLine: 'Use lower tidal volumes in appropriate ARDS populations.' },
                }],
                groundedClaims: [{
                    claimKey: 'abc123def456',
                    claimText: 'Low tidal volume ventilation reduces ventilator-induced lung injury.',
                    evidenceQuote: 'Lower tidal volumes were studied in ARDS.',
                    sourcePath: 'synopsis.bottomLine',
                    confidence: 0.85,
                }],
                claimMastery: [{
                    claimKey: 'abc123def456',
                    claimText: 'Low tidal volume ventilation reduces ventilator-induced lung injury.',
                    masteryState: 'untested',
                }],
                freshness: {
                    volatility: 'moderate',
                    confidenceDecay: 0.31,
                    effectiveConfidence: 0.49,
                    priorityScore: 0.42,
                    reason: 'confidence_decay',
                },
            }
        );

        expect(prompt).toContain('[MEM-1]');
        expect(prompt).toContain('[RES-1]');
        expect(prompt).toContain('Session trajectory: sepsis management -> vasopressors in shock');
        expect(prompt).toContain('Weak outline nodes for this topic: source-control, renal-hypoperfusion');
        expect(prompt).toContain('Cross-topic synapses in current evidence: AKI');
        expect(prompt).toContain('PROACTIVE LINKING');
        expect(prompt).toContain('KNOWLEDGE DELTA');
        expect(prompt).toContain('Retrieved app knowledge budget');
        expect(prompt).toContain('ARDSNet ARMA');
        expect(prompt).toContain('[CLAIM-abc123def456]');
        expect(prompt).toContain('Untested claims');
        expect(prompt).toContain('topic memory is stale');
    });

    test('retrieval context is compact and names weak claims', () => {
        const context = buildRetrievalContext({
            claimMastery: [{
                claimKey: 'weak1',
                claimText: 'Guideline claim the learner missed.',
                masteryState: 'weak',
                accuracy: 33,
            }],
        });
        expect(context).toContain('Previously weak claims');
        expect(context).toContain('[CLAIM-weak1]');
    });

    test('extracts only cited agent answer claims', () => {
        const claims = extractGroundedClaimsFromReply(
            'This unsupported sentence should not become memory. Lower tidal volume ventilation is supported by the current result [RES-1]. Guidelines agree on cautious escalation [G1].',
            { topic: 'ARDS', objectKey: 'agent-answer:test' }
        );
        expect(claims).toHaveLength(2);
        expect(claims[0].claimKey).toHaveLength(24);
        expect(claims[0].sourcePath).toBe('agent.answer');
    });
});
