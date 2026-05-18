/**
 * k6 Configuration for Medical Research API Load Testing
 * 
 * This file provides shared configuration and utilities for k6 load tests.
 */

// Environment configuration
export const ENV = {
  // Base URL for API testing
  baseUrl: __ENV.BASE_URL || 'http://localhost:3002',
  
  // Environment name
  environment: __ENV.ENVIRONMENT || 'local',
  
  // Test type
  testType: __ENV.TEST_TYPE || 'standard',
  
  // Output directory for results
  outputDir: __ENV.OUTPUT_DIR || './tests/load/results',
  
  // Debug mode
  debug: __ENV.DEBUG === 'true',
};

// API Endpoints
export const ENDPOINTS = {
  health: '/health',
  search: '/api/pubmed/search',
  config: '/api/config',
  analytics: '/api/analytics/event',
  biogpt: '/api/biogpt',
};

// Test scenarios
export const SCENARIOS = {
  smoke: {
    description: 'Quick smoke test for CI/CD',
    vus: 5,
    duration: '1m',
  },
  normal: {
    description: 'Normal load: 10 concurrent users',
    vus: 10,
    duration: '5m',
  },
  standard: {
    description: 'Standard test: 50 users with ramp up/down',
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 50 },
      { duration: '1m', target: 0 },
    ],
  },
  peak: {
    description: 'Peak load: 100 concurrent users',
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 0 },
    ],
  },
  stress: {
    description: 'Stress test: 500 concurrent users',
    stages: [
      { duration: '5m', target: 500 },
      { duration: '5m', target: 500 },
      { duration: '5m', target: 0 },
    ],
  },
  spike: {
    description: 'Spike test: Sudden 200 user spike',
    stages: [
      { duration: '30s', target: 10 },
      { duration: '10s', target: 200 },
      { duration: '3m', target: 200 },
      { duration: '30s', target: 10 },
      { duration: '2m', target: 10 },
      { duration: '10s', target: 0 },
    ],
  },
  soak: {
    description: 'Soak test: 30 minutes at moderate load',
    vus: 30,
    duration: '30m',
  },
};

// Thresholds
export const THRESHOLDS = {
  // Response time thresholds
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  
  // Error rate threshold (< 1%)
  error_rate: ['rate<0.01'],
  
  // Success rate (95% of requests must succeed)
  http_req_failed: ['rate<0.05'],
};

// Search queries for testing
export const SEARCH_QUERIES = [
  'cancer', 'diabetes', 'cardiovascular', 'alzheimer', 'covid-19',
  'vaccine', 'oncology', 'genetics', 'treatment', 'clinical trial',
  'immunotherapy', 'biomarker', 'hypertension', 'stroke', 'depression',
  'antibiotic', 'surgery', 'radiology', 'pathology', 'pediatrics',
];

// Helper function to get random query
export function getRandomQuery() {
  return SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
}

// Helper function to build URL
export function buildUrl(endpoint, params = {}) {
  const url = new URL(endpoint, ENV.baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  return url.toString();
}
