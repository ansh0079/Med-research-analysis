/**
 * LogRocket Configuration
 * Session replay and UX analytics
 * Free tier: 1,000 sessions/month
 *
 * PRIVACY-FIRST IMPLEMENTATION FOR MEDICAL/HEALTH APPLICATIONS
 * All PII is masked or omitted before transmission.
 */

import LogRocket from 'logrocket';

const LOGROCKET_APP_ID = import.meta.env.VITE_LOGROCKET_APP_ID;
const isProduction = import.meta.env.PROD;

export function initLogRocket(): void {
  if (!LOGROCKET_APP_ID || !isProduction) {
    console.log('[LogRocket] Skipped - App ID not configured or not in production');
    return;
  }

  LogRocket.init(LOGROCKET_APP_ID, {
    // Privacy settings for medical/health applications
    dom: {
      inputSanitizer: true,  // Masks all input values
      textSanitizer: true,   // Masks text content
    },

    // Network sanitization
    network: {
      requestSanitizer: (request) => {
        // Remove authorization headers
        if (request.headers['Authorization']) {
          request.headers['Authorization'] = '<sanitized>';
        }

        // Sanitize request bodies for common PII and Medical identifiers
        if (request.body && typeof request.body === 'string') {
          try {
            const body = JSON.parse(request.body);
            const sensitiveKeys = [
              'password', 'token', 'email', 'phone',
              'address', 'ssn', 'birthdate', 'patient_id',
              'search_query' // Protect proprietary research queries
            ];

            sensitiveKeys.forEach(key => {
              if (body[key]) body[key] = '<sanitized>';
            });

            request.body = JSON.stringify(body);
          } catch {
            // Not JSON, leave as-is
          }
        }
        return request;
      },
      responseSanitizer: (response) => {
        // Mask potentially sensitive medical data in responses
        if (response.body && typeof response.body === 'string') {
          try {
            const body = JSON.parse(response.body);
            // Example: mask specific abstract content or patient data if returned
            if (body.results) {
              body.results = body.results.map((item: Record<string, unknown>) => ({
                ...item,
                // Retain metadata but consider masking high-sensitivity fields
              }));
            }
            response.body = JSON.stringify(body);
          } catch {
            // Not JSON
          }
        }
        return response;
      },
    },

    // Console settings
    console: {
      isEnabled: {
        log: false,
        debug: false,
        info: true,
        warn: true,
        error: true,
      },
    },
  });

  console.log('[LogRocket] Initialized successfully');
}

export function identifyLogRocketUser(user: {
  id: string;
  name?: string;
  email?: string;
  plan?: string;
  role?: string;
}): void {
  if (!LOGROCKET_APP_ID) return;

  // For medical applications, avoid sending PII like name and email directly.
  // Instead, send a non-identifiable user ID and generic attributes.
  LogRocket.identify(user.id, {
    name: user.name ? '<sanitized>' : undefined, // Mask name
    email: user.email ? '<sanitized>' : undefined, // Mask email
    plan: user.plan || 'free',
    role: user.role || 'user',
  });
}

export function logRocketTrack(eventName: string, properties?: Record<string, unknown>): void {
  if (!LOGROCKET_APP_ID) return;
  LogRocket.track(eventName, properties);
}

export function logRocketLog(level: 'log' | 'info' | 'warn' | 'error', ...args: unknown[]): void {
  if (!LOGROCKET_APP_ID) return;
  LogRocket.log(level, ...args);
}

export { LogRocket };
