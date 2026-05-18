# Medical Research API - Load Testing Guide

This guide covers how to run load tests, interpret results, and optimize the Medical Research API performance.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Scenarios](#test-scenarios)
3. [Running Tests](#running-tests)
4. [Understanding Results](#understanding-results)
5. [Performance Thresholds](#performance-thresholds)
6. [Optimization Strategies](#optimization-strategies)
7. [CI/CD Integration](#cicd-integration)

---

## Quick Start

### Prerequisites

1. **Install k6**: Follow the [official k6 installation guide](https://k6.io/docs/getting-started/installation/)
   ```bash
   # Windows (Chocolatey)
   choco install k6
   
   # macOS (Homebrew)
   brew install k6
   
   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. **Install npm dependencies**:
   ```bash
   npm install
   ```

3. **Start the API server**:
   ```bash
   npm run server
   # or
   npm run python-server
   ```

### Run Your First Test

```bash
# Run smoke test (quick validation)
npm run test:load:smoke

# Run standard load test
npm run test:load

# Generate HTML report
npm run test:load:report
```

---

## Test Scenarios

### 1. Smoke Test (`smoke`)
- **Duration**: 1 minute
- **Users**: 5 concurrent
- **Purpose**: Quick validation that the API works under minimal load
- **Use Case**: CI/CD pipelines, pre-deployment checks

### 2. Normal Load (`normal`)
- **Duration**: 5 minutes
- **Users**: 10 concurrent
- **Purpose**: Baseline performance under expected normal traffic
- **Use Case**: Daily monitoring, regression testing

### 3. Standard Load (`standard`) - Default
- **Duration**: 8 minutes (2m ramp + 5m sustain + 1m ramp down)
- **Users**: 50 concurrent
- **Purpose**: Production-like load simulation
- **Use Case**: Release validation, capacity planning

### 4. Peak Load (`peak`)
- **Duration**: 9 minutes (2m ramp + 5m sustain + 2m ramp down)
- **Users**: 100 concurrent
- **Purpose**: Test behavior under high traffic periods
- **Use Case**: Black Friday prep, marketing campaign validation

### 5. Stress Test (`stress`)
- **Duration**: 15 minutes (5m ramp + 5m sustain + 5m ramp down)
- **Users**: 500 concurrent
- **Purpose**: Find breaking point and recovery behavior
- **Use Case**: Infrastructure limits identification

### 6. Spike Test (`spike`)
- **Duration**: ~6.5 minutes
- **Pattern**: 10 → 200 → 10 users with sudden transitions
- **Purpose**: Test sudden traffic bursts and recovery
- **Use Case**: DDoS resilience, viral content scenarios

### 7. Soak Test (`soak`)
- **Duration**: 30 minutes
- **Users**: 30 concurrent
- **Purpose**: Detect memory leaks and degradation over time
- **Use Case**: Long-running stability validation

---

## Running Tests

### Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm run test:load` | Run default (standard) load test |
| `npm run test:load:smoke` | Quick smoke test (1 min, 5 users) |
| `npm run test:load:normal` | Normal load (5 min, 10 users) |
| `npm run test:load:peak` | Peak load (9 min, 100 users) |
| `npm run test:load:stress` | Stress test (15 min, 500 users) |
| `npm run test:load:spike` | Spike test (sudden 200 user spike) |
| `npm run test:load:soak` | Soak test (30 min, 30 users) |
| `npm run test:load:report` | Run test and generate HTML report |
| `npm run test:load:ci` | CI-optimized smoke test with JSON output |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_TYPE` | Test scenario type | `standard` |
| `BASE_URL` | API base URL | `http://localhost:3002` |
| `ENVIRONMENT` | Environment name | `local` |
| `DEBUG` | Enable debug logging | `false` |
| `OUTPUT_DIR` | Results output directory | `./tests/load/results` |

### Custom Test Run Examples

```bash
# Run against staging environment
BASE_URL=https://staging-api.example.com TEST_TYPE=peak npm run test:load

# Run stress test with debug output
DEBUG=true TEST_TYPE=stress npm run test:load

# Run with custom JSON output for analysis
k6 run --out json=results.json tests/load/search-load.js

# Run with InfluxDB output for Grafana
k6 run --out influxdb=http://localhost:8086/k6 tests/load/search-load.js
```

---

## Understanding Results

### Console Output

After running a test, k6 outputs summary statistics:

```
     ✓ status is 200
     ✗ response time < 500ms
      ↳  93% — ✓ 1865 / ✗ 135

     checks.........................: 93.25% ✓ 1865 ✗ 135
     data_received..................: 15 MB  251 kB/s
     data_sent......................: 1.2 MB 20 kB/s
     http_req_blocked...............: avg=12.4µs min=1µs   med=5µs   max=5.2ms  p(95)=20µs
     http_req_connecting............: avg=8.1µs  min=0µs   med=0µs   max=3.1ms  p(95)=0µs
     http_req_duration..............: avg=245ms  min=12ms  med=180ms max=2.5s   p(95)=520ms p(99)=1.2s
     http_req_failed................: 1.25%  ✓ 25   ✗ 1975
     http_req_receiving.............: avg=0.8ms  min=0.1ms med=0.5ms max=45ms   p(95)=2.1ms
     http_req_sending...............: avg=0.2ms  min=0.05ms med=0.1ms max=12ms   p(95)=0.5ms
     http_req_tls_handshaking.......: avg=0µs    min=0µs   med=0µs   max=0µs    p(95)=0µs
     http_req_waiting...............: avg=244ms  min=12ms  med=179ms max=2.5s   p(95)=518ms
     http_reqs......................: 2000   33.33/s
     iteration_duration.............: avg=1.2s   min=1.1s  med=1.18s max=3.5s   p(95)=1.52s
     iterations.....................: 2000   33.33/s
     vus............................: 50     min=50 max=50
     vus_max........................: 50     min=50 max=50
```

### Key Metrics Explained

| Metric | Description | Good Value |
|--------|-------------|------------|
| `http_req_duration` | Total HTTP request time | p95 < 500ms |
| `http_req_waiting` | Time waiting for server response (TTFB) | < 300ms |
| `http_req_failed` | Failed request percentage | < 1% |
| `http_reqs` | Total requests and RPS | Depends on scenario |
| `vus` | Active virtual users | As configured |
| `checks` | Percentage of passed checks | > 95% |

### Custom Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `response_time_health` | Health endpoint response time | p95 < 100ms |
| `response_time_search` | Search endpoint response time | p95 < 800ms |
| `response_time_config` | Config endpoint response time | p95 < 200ms |
| `response_time_analytics` | Analytics endpoint response time | p95 < 300ms |
| `cache_hit_rate` | Percentage of cached responses | > 10% |
| `error_rate` | Custom error rate tracking | < 1% |

### HTML Report

The HTML report (`tests/load/results/load-test-report.html`) provides:
- Visual summary with status badge
- Response time distribution
- Endpoint-specific performance
- Threshold compliance indicators
- Performance recommendations

---

## Performance Thresholds

### Defined Thresholds

| Threshold | Value | Rationale |
|-----------|-------|-----------|
| P95 Response Time | < 500ms | Good user experience |
| P99 Response Time | < 1000ms | Acceptable worst case |
| Error Rate | < 1% | High reliability standard |
| Success Rate | > 95% | Minimum availability SLA |
| Cache Hit Rate | > 10% | Baseline caching effectiveness |

### Interpreting Threshold Results

**✅ PASS**: All metrics within thresholds
- API is performing optimally
- No immediate action required

**⚠️ WARNING**: Some metrics approaching limits
- Monitor trends closely
- Consider proactive optimization

**✗ FAIL**: Metrics exceed thresholds
- Immediate investigation needed
- Refer to optimization strategies below

---

## Optimization Strategies

### High Response Time (> 500ms P95)

#### 1. Implement Caching
```javascript
// Add response caching middleware
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

app.get('/api/pubmed/search', async (req, res) => {
    const cacheKey = req.url;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        res.set('X-Cache', 'HIT');
        return res.json(cached.data);
    }
    
    const data = await fetchSearchResults(req.query);
    cache.set(cacheKey, { data, timestamp: Date.now() });
    res.set('X-Cache', 'MISS');
    res.json(data);
});
```

#### 2. Database Optimization
- Add indexes on frequently queried columns
- Use query result caching
- Implement connection pooling
- Consider read replicas for search queries

#### 3. External API Optimization
- Cache third-party API responses
- Use batch requests where possible
- Implement circuit breakers
- Add request timeouts

### High Error Rate (> 1%)

#### 1. Error Handling
```javascript
app.use((err, req, res, next) => {
    // Log detailed error information
    console.error({
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
    });
    
    // Return generic error to client
    res.status(500).json({ 
        error: 'Internal server error',
        requestId: req.id 
    });
});
```

#### 2. Health Checks
- Implement `/health` endpoint with dependency checks
- Use Kubernetes liveness/readiness probes
- Set up monitoring alerts

#### 3. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests, please try again later',
});

app.use('/api/', limiter);
```

### Low Throughput

#### 1. Horizontal Scaling
- Deploy multiple API instances
- Use load balancer (nginx, AWS ALB)
- Implement sticky sessions if needed

#### 2. Connection Pooling
```javascript
const pool = new pg.Pool({
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
```

#### 3. Async Processing
- Move heavy operations to background jobs
- Use message queues (Redis, RabbitMQ)
- Implement webhook callbacks for long operations

### Memory Leaks (Soak Test Failures)

#### 1. Monitoring
```javascript
// Log memory usage periodically
setInterval(() => {
    const usage = process.memoryUsage();
    console.log({
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    });
}, 60000);
```

#### 2. Code Review Checklist
- Ensure all event listeners are removed
- Close database connections properly
- Clear intervals/timeouts on shutdown
- Avoid global variable accumulation

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Load Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install k6
        run: |
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
          
      - name: Start server
        run: npm run server &
        
      - name: Wait for server
        run: npx wait-on http://localhost:3002/health
        
      - name: Run smoke tests
        run: npm run test:load:ci
        
      - name: Upload results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: load-test-results
          path: tests/load/results/
```

### Threshold-Based Pipeline Gates

```javascript
// Add to search-load.js thresholds
thresholds: {
    http_req_duration: ['p(95)<500'], // Fail CI if > 500ms
    http_req_failed: ['rate<0.01'],   // Fail CI if > 1% errors
}
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `connection refused` | Ensure server is running on correct port |
| `rate: NaN%` | Check that requests are being made |
| High `http_req_blocked` | Check DNS resolution and connection limits |
| Out of memory | Reduce VU count or increase system memory |

### Debug Mode

Enable verbose logging:
```bash
DEBUG=true npm run test:load
```

### Getting Help

- [k6 Documentation](https://k6.io/docs/)
- [k6 Community Forum](https://community.k6.io/)
- Project Issues: [GitHub Issues](https://github.com/your-org/medical-research-analysis/issues)

---

## Best Practices

1. **Run smoke tests on every commit**
2. **Schedule peak load tests weekly**
3. **Monitor trends over time** - Don't just look at single test results
4. **Test with production-like data** - Use realistic search queries
5. **Test all critical endpoints** - Health, search, config, analytics
6. **Establish baselines** - Document expected performance metrics
7. **Set up alerts** - Notify when thresholds are exceeded
8. **Review regularly** - Performance requirements change over time
