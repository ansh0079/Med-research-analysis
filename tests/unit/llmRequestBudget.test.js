'use strict';

const {
    LlmRequestBudget,
    LlmBudgetExceededError,
    createBudgetForAction,
    runWithLlmBudget,
    getActiveLlmBudget,
} = require('../../server/services/llmRequestBudget');

describe('llmRequestBudget', () => {
    test('tracks calls and estimated cost', () => {
        const budget = new LlmRequestBudget({ maxCalls: 3, maxCostUsd: 1 });
        budget.assertCanCall({ prompt: 'hello', model: 'gemini-2.5-flash-lite' });
        budget.recordCall({ prompt: 'hello', response: '{"ok":true}', model: 'gemini-2.5-flash-lite' });
        expect(budget.calls).toBe(1);
        expect(budget.estimatedCostUsd).toBeGreaterThan(0);
    });

    test('throws when call limit exceeded', () => {
        const budget = new LlmRequestBudget({ maxCalls: 1, maxCostUsd: 1 });
        budget.recordCall({ prompt: 'a', response: 'b', model: 'gemini-2.5-flash-lite' });
        expect(() => budget.assertCanCall({ prompt: 'c', model: 'gemini-2.5-flash-lite' }))
            .toThrow(LlmBudgetExceededError);
    });

    test('createBudgetForAction uses action defaults', () => {
        const budget = createBudgetForAction('synthesis');
        expect(budget.maxCalls).toBe(5);
        expect(budget.label).toBe('synthesis');
    });

    test('runWithLlmBudget propagates via async local storage', async () => {
        const budget = createBudgetForAction('synopsis');
        await runWithLlmBudget(budget, async () => {
            expect(getActiveLlmBudget()).toBe(budget);
        });
        expect(getActiveLlmBudget()).toBeNull();
    });
});
