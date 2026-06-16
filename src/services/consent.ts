const CONSENT_KEY = 'med_cookie_consent_v1';

export type ConsentChoice = 'accepted' | 'declined';

const initializers: Array<() => void> = [];

export function getConsentChoice(): ConsentChoice | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return getConsentChoice() === 'accepted';
}

/**
 * Registers a function that turns on an analytics/tracking script.
 * Runs immediately if consent was already accepted in a prior session;
 * otherwise runs the moment the user accepts via the consent banner.
 */
export function registerAnalyticsInitializer(fn: () => void): void {
  initializers.push(fn);
  if (hasAnalyticsConsent()) {
    fn();
  }
}

export function setConsentChoice(choice: ConsentChoice): void {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    /* ignore */
  }
  if (choice === 'accepted') {
    initializers.forEach(fn => fn());
  }
}
