const {
    estimateTokens,
    truncateAgentPrompt,
    getAgentOutputTokenBudget,
} = require('../../server/services/agentPromptBudget');

describe('agentPromptBudget', () => {
    test('estimateTokens is positive for non-empty text', () => {
        expect(estimateTokens('hello world')).toBeGreaterThan(0);
    });

    test('truncateAgentPrompt returns unchanged prompt when under budget', () => {
        const prompt = 'system\n\n---\n\nuser turn';
        const result = truncateAgentPrompt(prompt, 1000);
        expect(result.prompt).toBe(prompt);
        expect(result.truncated).toBe(false);
        expect(result.finalTokens).toBe(result.originalTokens);
    });

    test('truncateAgentPrompt preserves final user turn', () => {
        const userTurn = 'this is the user question';
        const padding = 'x'.repeat(50000);
        const prompt = `${padding}\n\n---\n\n${userTurn}`;
        const result = truncateAgentPrompt(prompt, 50);
        expect(result.prompt).toContain(userTurn);
        expect(result.truncated).toBe(true);
        expect(result.finalTokens).toBeLessThanOrEqual(50);
    });

    test('truncateAgentPrompt never exceeds budget', () => {
        const prompt = 'a'.repeat(200000);
        const result = truncateAgentPrompt(prompt, 100);
        expect(result.finalTokens).toBeLessThanOrEqual(100);
    });

    test('getAgentOutputTokenBudget respects intent defaults', () => {
        expect(getAgentOutputTokenBudget('synopsis', 1800)).toBe(4000);
        expect(getAgentOutputTokenBudget('quiz', 1800)).toBe(2500);
        expect(getAgentOutputTokenBudget('agent_chat', 1800)).toBe(1800);
        expect(getAgentOutputTokenBudget('unknown_intent', 1234)).toBe(1234);
    });
});
