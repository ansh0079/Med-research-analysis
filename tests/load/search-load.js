/**
 * Medical Research API - Load Testing Suite
 * Using k6 (https://k6.io)
 * 
 * This test suite covers:
 * - Normal load testing (10 concurrent users)
 * - Peak load testing (100 concurrent users)
 * - Stress testing (500 concurrent users)
 * - Spike testing (sudden 200 user spike)
 * 
 * Metrics tracked:
 * - Response time (p50, p95, p99)
 * - Error rate
 * - Requests per second
 * - Cache hit rate (custom metric)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// ============================================
// CUSTOM METRICS
// ============================================

// Response time trends for specific endpoints
const healthTrend = new Trend('response_time_health');
const searchTrend = new Trend('response_time_search');
const configTrend = new Trend('response_time_config');
const analyticsTrend = new Trend('response_time_analytics');

// Error rates
const errorRate = new Rate('error_rate');
const searchErrorRate = new Rate('search_error_rate');

// Cache metrics
const cacheHitRate = new Rate('cache_hit_rate');
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');

// Throughput metrics
const requestsPerSecond = new Counter('total_requests');

// Custom response time thresholds
const apiResponseTime = new Trend('api_response_time');

// ============================================
// TEST CONFIGURATION
// ============================================

// Get test type from environment variable
const TEST_TYPE = __ENV.TEST_TYPE || 'normal';
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';

// Test scenarios configuration
const scenarios = {
  // Normal load: 10 concurrent users, steady state
  normal: {
    executor: 'constant-vus',
    vus: 10,
    duration: '5m',
    tags: { test_type: 'normal' },
  },

  // Peak load: 100 concurrent users
  peak: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },   // Ramp up to 100 users
      { duration: '5m', target: 100 },   // Stay at 100 users
      { duration: '2m', target: 0 },     // Ramp down
    ],
    tags: { test_type: 'peak' },
  },

  // Stress test: 500 concurrent users
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 500 },   // Gradual ramp to 500
      { duration: '5m', target: 500 },   // Sustain at 500
      { duration: '5m', target: 0 },     // Gradual ramp down
    ],
    tags: { test_type: 'stress' },
  },

  // Spike test: Sudden 200 user spike
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 10 },   // Baseline
      { duration: '10s', target: 200 },  // Sudden spike
      { duration: '3m', target: 200 },   // Sustain spike
      { duration: '30s', target: 10 },   // Return to baseline
      { duration: '2m', target: 10 },    // Verify recovery
      { duration: '10s', target: 0 },    // Ramp down
    ],
    tags: { test_type: 'spike' },
  },

  // Standard test: 50 users with ramp up/down (default)
  standard: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },    // Ramp up over 2 minutes
      { duration: '5m', target: 50 },    // Sustain for 5 minutes
      { duration: '1m', target: 0 },     // Ramp down
    ],
    tags: { test_type: 'standard' },
  },

  // Soak test: Extended duration at moderate load
  soak: {
    executor: 'constant-vus',
    vus: 30,
    duration: '30m',
    tags: { test_type: 'soak' },
  },

  // Quick smoke test for CI/CD
  smoke: {
    executor: 'constant-vus',
    vus: 5,
    duration: '1m',
    tags: { test_type: 'smoke' },
  },
};

// Export options
export const options = {
  scenarios: {
    [TEST_TYPE]: scenarios[TEST_TYPE] || scenarios.standard,
  },

  // Thresholds for all test types
  thresholds: {
    // Response time thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // p95 < 500ms, p99 < 1000ms
    'response_time_health': ['p(95)<100'],            // Health checks should be fast
    'response_time_search': ['p(95)<800'],            // Search can be slightly slower
    'response_time_config': ['p(95)<200'],            // Config should be fast
    'response_time_analytics': ['p(95)<300'],         // Analytics should be fast

    // Error rate threshold
    error_rate: ['rate<0.01'],                        // Error rate < 1%
    'search_error_rate': ['rate<0.02'],               // Search can have slightly higher error rate

    // Success rate threshold
    http_req_failed: ['rate<0.05'],                   // 95% of requests successful

    // Cache hit rate (informational)
    cache_hit_rate: ['rate>0.1'],                     // At least 10% cache hit rate
  },

  // System tags
  tags: {
    environment: __ENV.ENVIRONMENT || 'local',
    test_suite: 'medical-research-api',
  },
};

// ============================================
// TEST DATA
// ============================================

// Search queries for realistic testing
const searchQueries = [
  'cancer',
  'diabetes',
  'cardiovascular',
  'alzheimer',
  'covid-19',
  'vaccine',
  'oncology',
  'genetics',
  'treatment',
  'clinical trial',
  'immunotherapy',
  'biomarker',
  'hypertension',
  'stroke',
  'depression',
  'antibiotic',
  'surgery',
  'radiology',
  'pathology',
  'pediatrics',
];

// User agents for variety
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.0',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get random search query
 */
function getRandomQuery() {
  return searchQueries[randomIntBetween(0, searchQueries.length - 1)];
}

/**
 * Get random user agent
 */
function getRandomUserAgent() {
  return userAgents[randomIntBetween(0, userAgents.length - 1)];
}

/**
 * Make request with common headers
 */
function makeRequest(method, url, body = null) {
  const params = {
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
    },
    tags: {},
  };

  if (body) {
    params.headers['Content-Type'] = 'application/json';
  }

  requestsPerSecond.add(1);

  if (method === 'GET') {
    return http.get(url, params);
  } else if (method === 'POST') {
    return http.post(url, JSON.stringify(body), params);
  }
}

/**
 * Check cache header and record metrics
 */
function checkCache(response) {
  const cacheHeader = response.headers['X-Cache'] || response.headers['x-cache'];
  if (cacheHeader) {
    if (cacheHeader.includes('HIT') || cacheHeader.includes('hit')) {
      cacheHitRate.add(true);
      cacheHits.add(1);
    } else {
      cacheHitRate.add(false);
      cacheMisses.add(1);
    }
  }
}

/**
 * Record response time for specific endpoint
 */
function recordResponseTime(trend, response) {
  trend.add(response.timings.duration);
  apiResponseTime.add(response.timings.duration);
}

// ============================================
// ENDPOINT TEST FUNCTIONS
// ============================================

/**
 * Test health endpoint
 */
function testHealth() {
  group('Health Endpoint', () => {
    const response = makeRequest('GET', `${BASE_URL}/health`);
    
    const success = check(response, {
      'health status is 200': (r) => r.status === 200,
      'health response is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
      'health status is ok': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'ok' || body.status === 'healthy';
        } catch (e) {
          return false;
        }
      },
    });

    errorRate.add(!success);
    recordResponseTime(healthTrend, response);
    checkCache(response);
  });
}

/**
 * Test search endpoint
 */
function testSearch() {
  group('Search Endpoint', () => {
    const query = getRandomQuery();
    const response = makeRequest('GET', `${BASE_URL}/api/pubmed/search?query=${encodeURIComponent(query)}`);
    
    const success = check(response, {
      'search status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'search response time < 2s': (r) => r.timings.duration < 2000,
    });

    errorRate.add(!success);
    searchErrorRate.add(response.status >= 500);
    recordResponseTime(searchTrend, response);
    checkCache(response);
  });
}

/**
 * Test config endpoint
 */
function testConfig() {
  group('Config Endpoint', () => {
    const response = makeRequest('GET', `${BASE_URL}/api/config`);
    
    const success = check(response, {
      'config status is 200': (r) => r.status === 200,
      'config response is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
    });

    errorRate.add(!success);
    recordResponseTime(configTrend, response);
    checkCache(response);
  });
}

/**
 * Test analytics endpoint
 */
function testAnalytics() {
  group('Analytics Endpoint', () => {
    const eventData = {
      eventType: 'search',
      metadata: {
        query: getRandomQuery(),
        timestamp: new Date().toISOString(),
        sessionId: `session-${randomIntBetween(1, 10000)}`,
        source: 'load_test',
        testType: TEST_TYPE,
      },
    };

    const response = makeRequest('POST', `${BASE_URL}/api/analytics/event`, eventData);
    
    const success = check(response, {
      'analytics status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'analytics response time < 1s': (r) => r.timings.duration < 1000,
    });

    errorRate.add(!success);
    recordResponseTime(analyticsTrend, response);
  });
}

// ============================================
// SETUP AND TEARDOWN
// ============================================

/**
 * Setup function - runs once before all VUs start
 */
export function setup() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Medical Research API - Load Test                   ║
╠══════════════════════════════════════════════════════════════╣
║ Test Type: ${TEST_TYPE.padEnd(45)} ║
║ Base URL: ${BASE_URL.padEnd(46)} ║
║ Environment: ${(__ENV.ENVIRONMENT || 'local').padEnd(43)} ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    console.error(`⚠️  WARNING: API health check failed (status: ${healthCheck.status})`);
    console.error('   Ensure the server is running before starting load tests.');
  } else {
    console.log('✅ API health check passed');
  }

  return { testType: TEST_TYPE, baseUrl: BASE_URL };
}

/**
 * Teardown function - runs once after all VUs complete
 */
export function teardown(data) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Load Test Completed                                ║
╠══════════════════════════════════════════════════════════════╣
║ Test Type: ${data.testType.padEnd(45)} ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

// ============================================
// MAIN TEST FUNCTION
// ============================================

/**
 * Default test function - executed by each VU
 */
export default function () {
  // Execute different endpoint tests with weighted probability
  // This simulates realistic user behavior
  const random = Math.random();

  if (random < 0.3) {
    // 30% - Health check (most frequent)
    testHealth();
  } else if (random < 0.6) {
    // 30% - Search (high frequency)
    testSearch();
  } else if (random < 0.85) {
    // 25% - Config check
    testConfig();
  } else {
    // 15% - Analytics event
    testAnalytics();
  }

  // Random sleep between requests (100ms - 1000ms)
  // This simulates think time between user actions
  sleep(randomIntBetween(1, 10) / 10);
}
