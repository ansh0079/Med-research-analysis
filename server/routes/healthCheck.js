'use strict';

const os = require('os');
const logger = require('../config/logger');

/**
 * Health Check Endpoint
 * 
 * Provides comprehensive health status for monitoring and alerting
 */

function registerHealthCheckRoutes(app, deps) {
    const { db, cache, serverConfig } = deps;
    
    /**
     * Basic health check - lightweight, suitable for load balancer probes
     */
    app.get('/health', async (req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    });
    
    /**
     * Detailed health check - includes all dependency checks
     */
    app.get('/health/detailed', async (req, res) => {
        const checks = {
            database: await checkDatabase(db),
            cache: await checkCache(cache),
            aiProviders: await checkAIProviders(serverConfig),
            diskSpace: await checkDiskSpace(),
            memory: checkMemory()
        };
        
        const allHealthy = Object.values(checks).every(check => 
            typeof check === 'object' ? check.status === 'ok' : check
        );
        
        const status = allHealthy ? 'healthy' : 'degraded';
        const statusCode = allHealthy ? 200 : 503;
        
        res.status(statusCode).json({
            status,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || 'unknown',
            node: process.version,
            environment: process.env.NODE_ENV || 'development',
            checks
        });
    });
    
    /**
     * Readiness probe - checks if service is ready to accept traffic
     */
    app.get('/health/ready', async (req, res) => {
        const dbReady = await checkDatabase(db);
        
        if (dbReady.status === 'ok') {
            res.status(200).json({
                ready: true,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({
                ready: false,
                reason: 'Database not ready',
                timestamp: new Date().toISOString()
            });
        }
    });
    
    /**
     * Liveness probe - checks if service is alive (not deadlocked)
     */
    app.get('/health/live', (req, res) => {
        // If we can respond, we're alive
        res.status(200).json({
            alive: true,
            timestamp: new Date().toISOString(),
            pid: process.pid
        });
    });
}

/**
 * Checks database connectivity and performance
 */
async function checkDatabase(db) {
    const start = Date.now();
    try {
        await db.get('SELECT 1 as test');
        const latency = Date.now() - start;
        
        return {
            status: 'ok',
            latency: `${latency}ms`,
            healthy: latency < 1000  // Warn if query takes > 1 second
        };
    } catch (err) {
        logger.error({ err }, 'Database health check failed');
        return {
            status: 'error',
            message: err.message
        };
    }
}

/**
 * Checks cache connectivity
 */
async function checkCache(cache) {
    if (!cache) {
        return { status: 'unavailable', message: 'Cache not configured' };
    }
    
    const start = Date.now();
    try {
        const testKey = 'health_check_test';
        const testValue = Date.now().toString();
        
        await cache.setAsync?.(testKey, testValue, 10);
        const retrieved = await cache.getAsync?.(testKey);
        
        const latency = Date.now() - start;
        const works = retrieved === testValue;
        
        return {
            status: works ? 'ok' : 'error',
            latency: `${latency}ms`,
            message: works ? null : 'Cache set/get mismatch'
        };
    } catch (err) {
        logger.error({ err }, 'Cache health check failed');
        return {
            status: 'error',
            message: err.message
        };
    }
}

/**
 * Checks AI provider configuration and availability
 */
async function checkAIProviders(serverConfig) {
    const checks = {};
    
    if (serverConfig?.keys?.gemini) {
        checks.gemini = {
            configured: true,
            keyLength: serverConfig.keys.gemini.length
        };
    } else {
        checks.gemini = { configured: false };
    }
    
    if (serverConfig?.keys?.mistral) {
        checks.mistral = {
            configured: true,
            keyLength: serverConfig.keys.mistral.length
        };
    } else {
        checks.mistral = { configured: false };
    }
    
    const anyConfigured = checks.gemini?.configured || checks.mistral?.configured;
    
    return {
        status: anyConfigured ? 'ok' : 'error',
        providers: checks,
        message: anyConfigured ? null : 'No AI providers configured'
    };
}

/**
 * Checks available disk space
 */
async function checkDiskSpace() {
    try {
        const { statfs } = require('fs').promises;
        const stats = await statfs('/');
        
        const totalGB = (stats.blocks * stats.bsize) / (1024 ** 3);
        const freeGB = (stats.bfree * stats.bsize) / (1024 ** 3);
        const usedPercent = ((totalGB - freeGB) / totalGB) * 100;
        
        return {
            status: usedPercent < 90 ? 'ok' : 'warning',
            total: `${Math.round(totalGB)}GB`,
            free: `${Math.round(freeGB)}GB`,
            usedPercent: `${Math.round(usedPercent)}%`,
            warning: usedPercent >= 90 ? 'Low disk space' : null
        };
    } catch (err) {
        // statfs may not be available on all systems
        return {
            status: 'unavailable',
            message: 'Disk space check not supported on this system'
        };
    }
}

/**
 * Checks memory usage
 */
function checkMemory() {
    const usage = process.memoryUsage();
    const mb = (bytes) => Math.round(bytes / 1024 / 1024);
    
    const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const systemUsagePercent = ((totalMem - freeMem) / totalMem) * 100;
    
    return {
        status: heapUsagePercent < 85 && systemUsagePercent < 90 ? 'ok' : 'warning',
        process: {
            rss: `${mb(usage.rss)}MB`,
            heapTotal: `${mb(usage.heapTotal)}MB`,
            heapUsed: `${mb(usage.heapUsed)}MB`,
            heapUsagePercent: `${Math.round(heapUsagePercent)}%`
        },
        system: {
            total: `${mb(totalMem)}MB`,
            free: `${mb(freeMem)}MB`,
            usagePercent: `${Math.round(systemUsagePercent)}%`
        },
        warning: heapUsagePercent >= 85 ? 'High heap usage' : 
                 systemUsagePercent >= 90 ? 'High system memory usage' : null
    };
}

module.exports = { registerHealthCheckRoutes };
