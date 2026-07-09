const { buildCaseBranchDifficultyPlan, buildCaseScenarioPrompt } = require('../../server/services/caseScenarioService');

describe('buildCaseScenarioPrompt guideline grounding', () => {
    test('includes guideline context block when guidelines are supplied', () => {
        const prompt = buildCaseScenarioPrompt('sepsis', 'medium', { trainingStage: 'finals' }, [
            { source_body: 'Surviving Sepsis Campaign', source_year: 2021, recommendation_text: 'Give antibiotics within 1 hour', recommendation_strength: 'strong' },
        ]);

        expect(prompt).toContain('CLINICAL GUIDELINES (primary authority)');
        expect(prompt).toContain('[GUIDELINE 1]');
        expect(prompt).toContain('Surviving Sepsis Campaign');
        expect(prompt).toContain('Give antibiotics within 1 hour');
    });

    test('falls back gracefully when no guidelines are supplied', () => {
        const prompt = buildCaseScenarioPrompt('sepsis', 'medium', { trainingStage: 'finals' });

        expect(prompt).toContain('No guideline context provided.');
    });

    test('injects BKT branch difficulty targets into case prompt', () => {
        const plan = buildCaseBranchDifficultyPlan('hard', { topicMastery: { overallScore: 82 } });
        const prompt = buildCaseScenarioPrompt('sepsis', 'hard', { trainingStage: 'finals', topicMastery: { overallScore: 82 } });

        expect(plan.management).toBe('hard');
        expect(prompt).toContain('BKT-ADAPTIVE BRANCH PLAN');
        expect(prompt).toContain('"difficultyTarget"');
        expect(prompt).toContain('The management decision should target "hard"');
    });
});
