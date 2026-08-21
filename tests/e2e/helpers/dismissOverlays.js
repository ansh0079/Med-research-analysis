/**
 * Dismiss chrome overlays that intercept Playwright clicks in authenticated flows.
 * Verify-email uses aria-label="Dismiss"; PHI notice uses button text "Dismiss".
 */

async function dismissVerifyEmailBanner(page) {
  const btn = page.locator('button[aria-label="Dismiss"]').first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => {});
  }
}

async function dismissPhiNotice(page) {
  const btn = page.getByLabel('Data use notice').getByRole('button', { name: /^Dismiss$/i });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => {});
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ keepPhi?: boolean }} [opts]
 */
async function dismissChromeOverlays(page, opts = {}) {
  const { keepPhi = false } = opts;
  await dismissVerifyEmailBanner(page);
  if (!keepPhi) {
    await dismissPhiNotice(page);
  }
}

module.exports = {
  dismissChromeOverlays,
  dismissVerifyEmailBanner,
  dismissPhiNotice,
};
