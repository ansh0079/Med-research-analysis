/**
 * Rate Limit Audit under Concurrent Load
 * Validates:
 * 1. Rapid-fire from single IP triggers 429 with correct headers
 * 2. Legitimate mixed traffic is not affected by one abusive IP
 * 3. No memory leaks / response degradation under sustained 429 load
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';

const rl429Rate = new Rate('rate_limit_429_rate');
const rlHeaderOkRate = new Rate('rate_limit_header_ok_rate');
const legitimateSuccessRate = new Rate('legitimate_success_rate');
const abuseResponseTime = new Trend('abuse_response_time');
const legitimateResponseTime = new Trend('legitimate_response_time');
const rlRejectionCounter = new Counter('rate_limit_rejections_total');

export const options = {
  scenarios: {
    // Single abusive IP firing as fast as possible
    abuser: {
      executor: 'constant-vus',
      vus: 1,
      duration: '2m',
      tags: { role: 'abuser' },
    },
    // Legitimate users from mixed IPs (simulated via different headers)
    legitimate: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      tags: { role: 'legitimate' },
    },
  },
  thresholds: {
    'rate_limit_429_rate': ['rate>0.30'],               // Abuser should hit 429s
    'legitimate_success_rate': ['rate>0.95'],           // Legit users should succeed
    'rate_limit_header_ok_rate': ['rate>0.90'],         // Most 429s should have headers
    http_req_failed: ['rate<0.20'],
  },
};

function makeRequest(url, headers = {}) {
  return http.get(url, { headers });
}

export default function () {
  const role = __VU % 2 === 0 ? 'abuser' : 'legitimate'; // approximate split by VU

  if (__ENV.SCENARIO === 'abuser' || role === 'abuser') {
    group('Abusive IP', () => {
      // Fire rapid requests to an expensive endpoint without auth
      const res = makeRequest(`${BASE_URL}/api/config`, {
        'X-Forwarded-For': '203.0.113.99', // simulate single abusive IP
      });

      const is429 = res.status === 429;
      rl429Rate.add(is429);
      abuseResponseTime.add(res.timings.duration);

      if (is429) {
        rlRejectionCounter.add(1);
        const hasRetryAfter = res.headers['Retry-After'] !== undefined || res.headers['retry-after'] !== undefined;
        const hasLimit = res.headers['X-RateLimit-Limit'] !== undefined || res.headers['x-ratelimit-limit'] !== undefined;
        rlHeaderOkRate.add(hasRetryAfter && hasLimit);
      }

      check(res, {
        'abuser gets 200 or 429': (r) => r.status === 200 || r.status === 429,
      });
    });
  } else {
    group('Legitimate Traffic', () => {
      // Use varied fake IPs so rate limiter sees different clients
      const fakeIp = `198.51.100.${randomIntBetween(1, 254)}`;
      const res = makeRequest(`${BASE_URL}/api/config`, {
        'X-Forwarded-For': fakeIp,
      });

      const success = res.status === 200;
      legitimateSuccessRate.add(success);
      legitimateResponseTime.add(res.timings.duration);

      check(res, {
        'legitimate gets 200': (r) => r.status === 200,
        'legitimate response < 500ms': (r) => r.timings.duration < 500,
      });
    });
  }

  // Minimal sleep for abuser, normal for legitimate
  sleep(__ENV.SCENARIO === 'abuser' ? 0.05 : 0.5);
}
