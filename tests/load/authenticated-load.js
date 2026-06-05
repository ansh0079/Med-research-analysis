/**
 * Authenticated Load Test
 * Tests AI-heavy and learning endpoints with real JWT auth.
 * Uses lighter VUs/shorter durations because these endpoints are expensive.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || 'e2e-load@test.local';
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'TestPass123!';

// Custom metrics
const synopsisTrend = new Trend('response_time_synopsis');
const quizGenTrend = new Trend('response_time_quiz_generate');
const quizAttemptTrend = new Trend('response_time_quiz_attempt');
const masteryTrend = new Trend('response_time_mastery');
const authErrorRate = new Rate('auth_error_rate');
const aiErrorRate = new Rate('ai_error_rate');
const rateLimitHitRate = new Rate('rate_limit_hit_rate');

export const options = {
  scenarios: {
    authenticated_ai: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 10 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'authenticated_ai' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<8000'],
    'response_time_synopsis': ['p(95)<5000'],
    'response_time_quiz_generate': ['p(95)<6000'],
    auth_error_rate: ['rate<0.01'],
    ai_error_rate: ['rate<0.05'],
    rate_limit_hit_rate: ['rate<0.10'],
    http_req_failed: ['rate<0.10'],
  },
};

/**
 * Setup: register + login to obtain auth cookie/JWT
 */
export function setup() {
  // Attempt registration (idempotent if user exists)
  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      name: 'Load Test User',
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  // Login
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const loginOk = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
  });

  if (!loginOk) {
    console.error(`Auth failed: ${loginRes.status} ${loginRes.body}`);
    return { authHeaders: null };
  }

  // Extract cookie if present
  const setCookie = loginRes.headers['Set-Cookie'] || loginRes.headers['set-cookie'];
  const authHeaders = { 'Content-Type': 'application/json' };
  if (setCookie) {
    authHeaders['Cookie'] = setCookie;
  }

  // Some deployments return JWT in body
  let token = null;
  try {
    const body = JSON.parse(loginRes.body);
    token = body.token || body.accessToken;
  } catch (_e) {
    // ignore
  }
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  return { authHeaders };
}

function makeAuthedRequest(method, url, body, authHeaders) {
  const params = { headers: { ...authHeaders } };
  if (method === 'GET') return http.get(url, params);
  return http.post(url, JSON.stringify(body), params);
}

function recordRateLimit(response) {
  const is429 = response.status === 429;
  rateLimitHitRate.add(is429);
  if (is429) {
    const retryAfter = response.headers['Retry-After'] || response.headers['retry-after'];
    const rlLimit = response.headers['X-RateLimit-Limit'] || response.headers['x-ratelimit-limit'];
    console.log(`Rate limited: retryAfter=${retryAfter}, limit=${rlLimit}`);
  }
  return is429;
}

function testSynopsis(authHeaders) {
  group('Synopsis', () => {
    const body = {
      article: {
        title: 'SGLT2 inhibitors in heart failure with preserved ejection fraction',
        abstract: 'A randomized controlled trial summary.',
        uid: 'pmid-load-test',
      },
      provider: 'auto',
    };
    const res = makeAuthedRequest('POST', `${BASE_URL}/api/ai/synopsis`, body, authHeaders);
    recordRateLimit(res);
    const success = check(res, {
      'synopsis 200 or 429': (r) => r.status === 200 || r.status === 429,
    });
    aiErrorRate.add(!success && res.status !== 429);
    synopsisTrend.add(res.timings.duration);
  });
}

function testQuizGenerate(authHeaders) {
  group('Quiz Generate', () => {
    const body = {
      topic: 'diabetes mellitus',
      count: 3,
      difficulty: 'medium',
    };
    const res = makeAuthedRequest('POST', `${BASE_URL}/api/quiz/generate`, body, authHeaders);
    recordRateLimit(res);
    const success = check(res, {
      'quiz generate 200 or 429': (r) => r.status === 200 || r.status === 429,
    });
    aiErrorRate.add(!success && res.status !== 429);
    quizGenTrend.add(res.timings.duration);
  });
}

function testQuizAttempt(authHeaders) {
  group('Quiz Attempt', () => {
    const body = {
      topic: 'diabetes mellitus',
      attempts: [
        {
          questionId: 'q-load-1',
          questionType: 'recall',
          questionText: 'What is the primary mechanism of metformin?',
          userAnswer: 'Decreases hepatic glucose production',
          correctAnswer: 'Decreases hepatic glucose production',
          isCorrect: true,
          timeMs: 12000,
          confidence: 4,
        },
      ],
    };
    const res = makeAuthedRequest('POST', `${BASE_URL}/api/learning/quiz-attempt`, body, authHeaders);
    recordRateLimit(res);
    const success = check(res, {
      'quiz attempt 200 or 429': (r) => r.status === 200 || r.status === 429,
    });
    aiErrorRate.add(!success && res.status !== 429);
    quizAttemptTrend.add(res.timings.duration);
  });
}

function testMastery(authHeaders) {
  group('Mastery', () => {
    const res = makeAuthedRequest('GET', `${BASE_URL}/api/learning/mastery/diabetes%20mellitus`, null, authHeaders);
    recordRateLimit(res);
    const success = check(res, {
      'mastery 200 or 429': (r) => r.status === 200 || r.status === 429,
    });
    aiErrorRate.add(!success && res.status !== 429);
    masteryTrend.add(res.timings.duration);
  });
}

export default function (data) {
  if (!data.authHeaders) {
    authErrorRate.add(true);
    sleep(1);
    return;
  }

  const roll = Math.random();
  if (roll < 0.35) {
    testSynopsis(data.authHeaders);
  } else if (roll < 0.60) {
    testQuizGenerate(data.authHeaders);
  } else if (roll < 0.85) {
    testQuizAttempt(data.authHeaders);
  } else {
    testMastery(data.authHeaders);
  }

  sleep(randomIntBetween(2, 6));
}
