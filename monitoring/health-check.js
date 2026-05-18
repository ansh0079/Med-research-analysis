/**
 * Health Check Endpoint
 * Returns application health status for monitoring systems
 */

async function healthCheck(req, res) {
  const checks = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '2.0.0',
    environment: process.env.NODE_ENV || 'production',
  };

  const health = {
    status: 'healthy',
    ...checks,
    checks: {
      api: 'ok',
      database: await checkDatabase(),
      external: {
        pubmed: await checkExternalAPI('pubmed'),
        semanticScholar: await checkExternalAPI('semantic_scholar'),
        unpaywall: await checkExternalAPI('unpaywall'),
      },
    },
  };

  // Determine overall status
  const failedChecks = Object.values(health.checks).filter(
    check => typeof check === 'object' ? check.status === 'down' : check === 'down'
  );

  if (failedChecks.length > 0) {
    health.status = failedChecks.length > 2 ? 'unhealthy' : 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
}

async function checkDatabase() {
  try {
    // Implement your database health check here
    // Example: await db.ping() or similar
    return { status: 'ok', latency: 0 };
  } catch (error) {
    return { status: 'down', error: error.message };
  }
}



// For CommonJS compatibility
module.exports = { healthCheck };
