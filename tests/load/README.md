# Load Testing for Medical Research API

This directory contains comprehensive load testing suite using [k6](https://k6.io).

## Quick Start

```bash
# Install k6 first (see https://k6.io/docs/getting-started/installation/)

# Run smoke test (1 min, 5 users)
npm run test:load:smoke

# Run standard load test (default: 50 users, 8 min)
npm run test:load

# Generate HTML report
npm run test:load:report
```

## Available Test Scenarios

| Command | Duration | Users | Purpose |
|---------|----------|-------|---------|
| `npm run test:load:smoke` | 1 min | 5 | Quick validation |
| `npm run test:load:normal` | 5 min | 10 | Baseline performance |
| `npm run test:load` | 8 min | 50 | Standard load (default) |
| `npm run test:load:peak` | 9 min | 100 | High traffic simulation |
| `npm run test:load:stress` | 15 min | 500 | Breaking point test |
| `npm run test:load:spike` | 6.5 min | 200 | Sudden traffic spike |
| `npm run test:load:soak` | 30 min | 30 | Long-running stability |

## File Structure

```
tests/load/
├── search-load.js          # Main k6 test script
├── k6-config.js            # Shared configuration
├── generate-report.js      # HTML report generator
├── .env.example            # Environment variables template
├── LOAD_TESTING_GUIDE.md   # Comprehensive documentation
├── README.md               # This file
└── results/                # Test output directory
    └── load-test-report.html
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_TYPE` | Test scenario | `standard` |
| `BASE_URL` | API URL | `http://localhost:3002` |
| `ENVIRONMENT` | Environment name | `local` |
| `DEBUG` | Debug logging | `false` |

## Example: Run Against Staging

```bash
BASE_URL=https://staging-api.example.com TEST_TYPE=peak npm run test:load
```

## Performance Thresholds

- **P95 Response Time**: < 500ms ✅
- **P99 Response Time**: < 1000ms ✅
- **Error Rate**: < 1% ✅
- **Success Rate**: > 95% ✅

## Endpoints Tested

- `GET /health` - Health check
- `GET /api/pubmed/search?q={query}` - Search endpoint
- `GET /api/config` - Configuration
- `POST /api/analytics/event` - Analytics tracking

## Documentation

For detailed information on interpreting results and optimization strategies, see [LOAD_TESTING_GUIDE.md](./LOAD_TESTING_GUIDE.md).
