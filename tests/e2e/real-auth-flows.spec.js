/**
 * Real Auth + Real Backend E2E Tests
 *
 * These tests exercise the full stack with real authentication and real database
 * writes. Only the LLM quiz generator is mocked (via page.route) for speed and
 * determinism.
 *
 * Run with: npx playwright test --project=chromium-auth tests/e2e/real-auth-flows.spec.js
 */

const { test: base, expect } = require('@playwright/test');
const { sepsisEasy } = require('./fixtures/mock-quiz-questions');
const path = require('path');

// All tests in this file use the authenticated storage state
const test = base.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(__dirname, '.auth', 'user.json'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

test.describe('Real auth flows', () => {
  test.beforeEach(async ({ page }) => {
    // Mock quiz generation so we don't need real AI calls
    await page.route('**/api/quiz/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          questions: sepsisEasy,
          topic: 'Sepsis',
          provider: 'mock',
          model: null,
          disclaimer: 'Mocked for E2E testing.',
          validation: { reviewed: 3, rejected: 0, rejections: [], skipped: false },
        }),
      });
    });

    // Let all other API calls pass through to the real backend
    await page.route('**/api/**', async (route) => {
      if (!route.request().url().includes('/api/quiz/generate')) {
        await route.continue();
      }
    });
  });

  test('user appears authenticated on page load', async ({ page }) => {
    await page.goto('/');
    // The auth context should hydrate and show the user is logged in.
    // We look for a logout button or user menu rather than exact text.
    await expect(page.locator('text=Logout, button, a').or(page.locator('[data-testid="user-menu"]'))).toBeVisible({ timeout: 10000 });
  });

  test('full quiz flow submits attempts and updates dashboard', async ({ page }) => {
    // 1. Navigate to quiz
    await page.goto('/quiz?topic=Sepsis');
    await expect(page.locator('text=Sepsis')).toBeVisible({ timeout: 15000 });

    // 2. Answer all questions (we know the correct answers from mock data)
    const answers = ['B', 'C', 'C'];
    for (let i = 0; i < answers.length; i++) {
      // Wait for the question to render
      await page.waitForSelector('[data-testid="quiz-option"], button', { timeout: 10000 });

      // Select the answer option
      const optionLabel = answers[i];
      const optionButton = page.locator(`button:has-text("${optionLabel}:")`).first();
      await expect(optionButton).toBeVisible({ timeout: 5000 });
      await optionButton.click();

      // Click "Next" or "Submit" if present
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Submit")').first();
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
      }
    }

    // 3. Assert score/completion card appears
    await expect(page.locator('text=Score, text=Completed, [data-testid="quiz-complete"]').first()).toBeVisible({ timeout: 10000 });

    // 4. Navigate to history and assert attempts were saved
    await page.goto('/history');
    await expect(page.locator('text=Sepsis').first()).toBeVisible({ timeout: 10000 });

    // 5. Navigate to learning dashboard and assert mastery updated
    await page.goto('/learning');
    await expect(page.locator('text=Sepsis').first()).toBeVisible({ timeout: 10000 });
  });

  test('quiz attempt correctness is verified server-side', async ({ page }) => {
    // This test intentionally sends a wrong answer and verifies the server
    // records it as wrong (asserted via history).
    await page.goto('/quiz?topic=Sepsis');
    await expect(page.locator('text=Sepsis')).toBeVisible({ timeout: 15000 });

    // Answer the first question deliberately wrong
    const wrongOption = page.locator('button:has-text("A:")').first();
    await expect(wrongOption).toBeVisible({ timeout: 5000 });
    await wrongOption.click();

    // Complete the quiz with any answers for remaining questions
    const remainingAnswers = ['C', 'C'];
    for (const ans of remainingAnswers) {
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Submit")').first();
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
      }
      const opt = page.locator(`button:has-text("${ans}:")`).first();
      await expect(opt).toBeVisible({ timeout: 5000 });
      await opt.click();
    }
    const finalNext = page.locator('button:has-text("Next"), button:has-text("Submit")').first();
    if (await finalNext.isVisible().catch(() => false)) {
      await finalNext.click();
    }

    await expect(page.locator('text=Score, text=Completed, [data-testid="quiz-complete"]').first()).toBeVisible({ timeout: 10000 });

    // Check history shows a wrong attempt
    await page.goto('/history');
    await expect(page.locator('text=Sepsis').first()).toBeVisible({ timeout: 10000 });
    // Look for an incorrect indicator (this is UI-dependent; adjust selector as needed)
    await expect(page.locator('text=Incorrect, [data-testid="incorrect-badge"]').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Real LLM suite @real-llm', () => {
  test('generates a real quiz with live AI', async ({ page }) => {
    test.skip(!process.env.GEMINI_API_KEY && !process.env.MISTRAL_API_KEY, 'Skipping: no LLM API key configured');
    test.setTimeout(120000);

    // Do NOT mock /api/quiz/generate — let it hit the real backend and real LLM
    await page.goto('/quiz?topic=Sepsis');
    await expect(page.locator('text=Sepsis')).toBeVisible({ timeout: 15000 });

    // Wait for AI-generated questions to appear (up to 60s)
    await page.waitForSelector('button:has-text("A:"), [data-testid="quiz-option"]', { timeout: 60000 });

    // Just verify at least one question rendered
    const options = page.locator('button:has-text("A:")');
    await expect(options.first()).toBeVisible();
  });
});
