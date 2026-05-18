const ONBOARDING_KEY = 'med_onboarding_done';

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export function completeOnboarding(): void {
  localStorage.setItem(ONBOARDING_KEY, '1');
}
