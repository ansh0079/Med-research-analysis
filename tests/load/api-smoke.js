// Credential-free CI availability check. Real search quality and provider
// latency belong to the browser suite and the separately run search benchmark.
import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3002';
const headers = { 'X-Synthetic-Traffic': 'ci-api-smoke', Accept: 'application/json' };

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate==0'],
    checks: ['rate==1'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const health = http.get(`${baseUrl}/health`, { headers });
  check(health, {
    'health is ready': (r) => r.status === 200 && ['ok', 'healthy'].includes(r.json('status')),
  });
  const config = http.get(`${baseUrl}/api/config`, { headers });
  check(config, {
    'public configuration is available': (r) => r.status === 200 && r.headers['Content-Type']?.includes('application/json'),
  });
  // This exercises the current search route without hammering public providers.
  // A missing route (404), server failure (500), or throttling (429) must fail.
  const validation = http.get(`${baseUrl}/api/search`, {
    headers,
    responseCallback: http.expectedStatuses(400),
  });
  check(validation, {
    'search rejects a missing query': (r) => r.status === 400 && r.json('error') === 'Query is required',
  });
  sleep(3);
}
