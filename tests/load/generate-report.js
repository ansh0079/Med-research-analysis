#!/usr/bin/env node
/**
 * k6 Load Test Report Generator
 * 
 * Generates an HTML report from k6 JSON output
 * Usage: node generate-report.js [input-json-file]
 */

const fs = require('fs');
const path = require('path');

// Default input file
const inputFile = process.argv[2] || path.join(__dirname, 'results', 'load-test.json');
const outputFile = path.join(__dirname, 'results', 'load-test-report.html');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatDuration(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatNumber(num) {
  return num.toLocaleString();
}

function generateReport(data) {
  const metrics = data.metrics || {};
  const rootGroup = data.root_group || {};
  const testRun = data.test_run || {};
  
  // Extract key metrics
  const httpReqs = metrics.http_reqs?.values || {};
  const httpReqDuration = metrics.http_req_duration?.values || {};
  const httpReqFailed = metrics.http_req_failed?.values || {};
  const vus = metrics.vus?.values || {};
  const vusMax = metrics.vus_max?.values || {};
  const iterations = metrics.iterations?.values || {};
  
  // Custom metrics
  const cacheHitRate = metrics.cache_hit_rate?.values || {};
  const errorRate = metrics.error_rate?.values || {};
  
  // Response time trends
  const healthTrend = metrics.response_time_health?.values || {};
  const searchTrend = metrics.response_time_search?.values || {};
  const configTrend = metrics.response_time_config?.values || {};
  const analyticsTrend = metrics.response_time_analytics?.values || {};
  
  // Determine status based on thresholds
  const p95 = httpReqDuration['p(95)'] || 0;
  const p99 = httpReqDuration['p(99)'] || 0;
  const errorRateValue = httpReqFailed.rate || 0;
  
  let status = 'PASS';
  let statusColor = '#28a745';
  
  if (p95 > 500 || errorRateValue > 0.01) {
    status = 'WARNING';
    statusColor = '#ffc107';
  }
  if (p95 > 1000 || errorRateValue > 0.05) {
    status = 'FAIL';
    statusColor = '#dc3545';
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Medical Research API - Load Test Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        header .subtitle {
            opacity: 0.9;
            font-size: 1.1em;
        }
        
        .status-badge {
            display: inline-block;
            padding: 10px 30px;
            border-radius: 25px;
            font-weight: bold;
            font-size: 1.2em;
            margin-top: 20px;
            background: ${statusColor};
            color: white;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .metric-card h3 {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        
        .metric-unit {
            font-size: 0.5em;
            color: #666;
            font-weight: normal;
        }
        
        .section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .section h2 {
            color: #667eea;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #555;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .good {
            color: #28a745;
            font-weight: bold;
        }
        
        .warning {
            color: #ffc107;
            font-weight: bold;
        }
        
        .bad {
            color: #dc3545;
            font-weight: bold;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 10px;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            transition: width 0.3s ease;
        }
        
        .threshold-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            margin: 10px 0;
            background: #f8f9fa;
            border-radius: 5px;
            border-left: 4px solid #667eea;
        }
        
        .threshold-met {
            border-left-color: #28a745;
        }
        
        .threshold-failed {
            border-left-color: #dc3545;
        }
        
        footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
            header h1 {
                font-size: 1.8em;
            }
            
            .summary-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🏥 Medical Research API</h1>
            <p class="subtitle">Load Test Report</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <span class="status-badge">${status}</span>
        </header>
        
        <div class="summary-grid">
            <div class="metric-card">
                <h3>Total Requests</h3>
                <div class="metric-value">${formatNumber(httpReqs.count || 0)}</div>
            </div>
            <div class="metric-card">
                <h3>Virtual Users (Max)</h3>
                <div class="metric-value">${formatNumber(vusMax.max || 0)}</div>
            </div>
            <div class="metric-card">
                <h3>Test Duration</h3>
                <div class="metric-value">${((data.state?.testRunDurationMs || 0) / 1000 / 60).toFixed(1)}<span class="metric-unit">min</span></div>
            </div>
            <div class="metric-card">
                <h3>Iterations</h3>
                <div class="metric-value">${formatNumber(iterations.count || 0)}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📊 Response Time Metrics</h2>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Threshold</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Average Response Time</td>
                        <td>${formatDuration(httpReqDuration.avg || 0)}</td>
                        <td>-</td>
                        <td class="good">✓</td>
                    </tr>
                    <tr>
                        <td>Minimum Response Time</td>
                        <td>${formatDuration(httpReqDuration.min || 0)}</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td>Maximum Response Time</td>
                        <td>${formatDuration(httpReqDuration.max || 0)}</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td>P50 (Median)</td>
                        <td>${formatDuration(httpReqDuration.med || 0)}</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td>P95</td>
                        <td>${formatDuration(p95)}</td>
                        <td>&lt; 500ms</td>
                        <td class="${p95 < 500 ? 'good' : p95 < 1000 ? 'warning' : 'bad'}">${p95 < 500 ? '✓ PASS' : p95 < 1000 ? '⚠ WARNING' : '✗ FAIL'}</td>
                    </tr>
                    <tr>
                        <td>P99</td>
                        <td>${formatDuration(p99)}</td>
                        <td>&lt; 1000ms</td>
                        <td class="${p99 < 1000 ? 'good' : 'bad'}">${p99 < 1000 ? '✓ PASS' : '✗ FAIL'}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>🎯 Success & Error Metrics</h2>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Threshold</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Success Rate</td>
                        <td>${((1 - (errorRateValue)) * 100).toFixed(2)}%</td>
                        <td>&gt; 95%</td>
                        <td class="${(1 - errorRateValue) > 0.95 ? 'good' : 'bad'}">${(1 - errorRateValue) > 0.95 ? '✓ PASS' : '✗ FAIL'}</td>
                    </tr>
                    <tr>
                        <td>Error Rate</td>
                        <td>${(errorRateValue * 100).toFixed(2)}%</td>
                        <td>&lt; 1%</td>
                        <td class="${errorRateValue < 0.01 ? 'good' : errorRateValue < 0.05 ? 'warning' : 'bad'}">${errorRateValue < 0.01 ? '✓ PASS' : errorRateValue < 0.05 ? '⚠ WARNING' : '✗ FAIL'}</td>
                    </tr>
                    <tr>
                        <td>Failed Requests</td>
                        <td>${formatNumber(httpReqFailed.passes || 0)}</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>
                </tbody>
            </table>
            
            <h3 style="margin-top: 30px;">Cache Performance</h3>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Cache Hit Rate</td>
                        <td class="${(cacheHitRate.rate || 0) > 0.1 ? 'good' : ''}">${((cacheHitRate.rate || 0) * 100).toFixed(1)}%</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>🔍 Endpoint Performance</h2>
            <table>
                <thead>
                    <tr>
                        <th>Endpoint</th>
                        <th>Avg Response Time</th>
                        <th>P95</th>
                        <th>Min</th>
                        <th>Max</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>/health</td>
                        <td>${formatDuration(healthTrend.avg || 0)}</td>
                        <td>${formatDuration(healthTrend['p(95)'] || 0)}</td>
                        <td>${formatDuration(healthTrend.min || 0)}</td>
                        <td>${formatDuration(healthTrend.max || 0)}</td>
                    </tr>
                    <tr>
                        <td>/api/pubmed/search</td>
                        <td>${formatDuration(searchTrend.avg || 0)}</td>
                        <td>${formatDuration(searchTrend['p(95)'] || 0)}</td>
                        <td>${formatDuration(searchTrend.min || 0)}</td>
                        <td>${formatDuration(searchTrend.max || 0)}</td>
                    </tr>
                    <tr>
                        <td>/api/config</td>
                        <td>${formatDuration(configTrend.avg || 0)}</td>
                        <td>${formatDuration(configTrend['p(95)'] || 0)}</td>
                        <td>${formatDuration(configTrend.min || 0)}</td>
                        <td>${formatDuration(configTrend.max || 0)}</td>
                    </tr>
                    <tr>
                        <td>/api/analytics/event</td>
                        <td>${formatDuration(analyticsTrend.avg || 0)}</td>
                        <td>${formatDuration(analyticsTrend['p(95)'] || 0)}</td>
                        <td>${formatDuration(analyticsTrend.min || 0)}</td>
                        <td>${formatDuration(analyticsTrend.max || 0)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>📋 Threshold Summary</h2>
            <div class="threshold-row ${p95 < 500 ? 'threshold-met' : 'threshold-failed'}">
                <span>P95 Response Time &lt; 500ms</span>
                <span class="${p95 < 500 ? 'good' : 'bad'}">${formatDuration(p95)}</span>
            </div>
            <div class="threshold-row ${p99 < 1000 ? 'threshold-met' : 'threshold-failed'}">
                <span>P99 Response Time &lt; 1000ms</span>
                <span class="${p99 < 1000 ? 'good' : 'bad'}">${formatDuration(p99)}</span>
            </div>
            <div class="threshold-row ${errorRateValue < 0.01 ? 'threshold-met' : errorRateValue < 0.05 ? '' : 'threshold-failed'}">
                <span>Error Rate &lt; 1%</span>
                <span class="${errorRateValue < 0.01 ? 'good' : errorRateValue < 0.05 ? 'warning' : 'bad'}">${(errorRateValue * 100).toFixed(2)}%</span>
            </div>
            <div class="threshold-row ${(1 - errorRateValue) > 0.95 ? 'threshold-met' : 'threshold-failed'}">
                <span>Success Rate &gt; 95%</span>
                <span class="${(1 - errorRateValue) > 0.95 ? 'good' : 'bad'}">${((1 - errorRateValue) * 100).toFixed(2)}%</span>
            </div>
        </div>
        
        <div class="section">
            <h2>📈 Performance Recommendations</h2>
            <ul style="list-style: none; padding: 0;">
                ${p95 > 500 ? '<li style="padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; margin-bottom: 10px;">⚠️ <strong>P95 latency exceeds 500ms</strong> - Consider implementing caching or optimizing database queries</li>' : ''}
                ${errorRateValue > 0.01 ? '<li style="padding: 10px; background: #f8d7da; border-left: 4px solid #dc3545; margin-bottom: 10px;">🚨 <strong>Error rate exceeds 1%</strong> - Review error logs and implement better error handling</li>' : ''}
                ${(cacheHitRate.rate || 0) < 0.1 ? '<li style="padding: 10px; background: #d1ecf1; border-left: 4px solid #17a2b8; margin-bottom: 10px;">💡 <strong>Cache hit rate is low</strong> - Consider increasing cache TTL or reviewing cache keys</li>' : ''}
                ${!p95 > 500 && errorRateValue <= 0.01 ? '<li style="padding: 10px; background: #d4edda; border-left: 4px solid #28a745; margin-bottom: 10px;">✅ <strong>All performance thresholds met!</strong> The API is performing within acceptable parameters.</li>' : ''}
            </ul>
        </div>
        
        <footer>
            <p>Generated by k6 Load Testing Framework</p>
            <p>Medical Research API Load Test Suite</p>
        </footer>
    </div>
</body>
</html>`;

  return html;
}

// Main execution
async function main() {
  log('\n╔══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         k6 Load Test Report Generator                        ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════╝\n', 'cyan');

  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    log(`❌ Input file not found: ${inputFile}`, 'red');
    log('   Run load test with: npm run test:load:report\n', 'yellow');
    process.exit(1);
  }

  log(`📖 Reading: ${inputFile}`);
  
  try {
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    log('📊 Generating HTML report...');
    const html = generateReport(data);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write HTML report
    fs.writeFileSync(outputFile, html);
    
    log(`\n✅ Report generated successfully!`, 'green');
    log(`📄 Output: ${outputFile}`, 'green');
    log(`\n🌐 Open the report in your browser to view detailed results.\n`);
    
    // Print summary
    const metrics = data.metrics || {};
    const httpReqDuration = metrics.http_req_duration?.values || {};
    const httpReqFailed = metrics.http_req_failed?.values || {};
    
    log('📋 Quick Summary:', 'cyan');
    log(`   • P95 Response Time: ${formatDuration(httpReqDuration['p(95)'] || 0)}`);
    log(`   • P99 Response Time: ${formatDuration(httpReqDuration['p(99)'] || 0)}`);
    log(`   • Error Rate: ${((httpReqFailed.rate || 0) * 100).toFixed(2)}%`);
    log(`   • Total Requests: ${formatNumber(metrics.http_reqs?.values?.count || 0)}\n`);
    
  } catch (error) {
    log(`\n❌ Error generating report: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
