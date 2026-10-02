'use strict';

const fs = require('fs');
const path = require('path');

/**
 * PICO, CONSORT and compare results live only in Redis. A flush without AOF
 * drops them. The Hetzner compose file already starts Redis with appendonly.
 * This checks that file, and the live server when REDIS_URL is set.
 */
async function main() {
    const composePath = path.join(__dirname, '..', 'docker-compose.hetzner.yml');
    const compose = fs.existsSync(composePath) ? fs.readFileSync(composePath, 'utf8') : '';
    const composeOn = /appendonly\s+yes/.test(compose);
    console.log(`Redis AOF compose: ${composeOn ? 'appendonly yes' : 'appendonly not set in docker-compose.hetzner.yml'}`);

    const url = String(process.env.REDIS_URL || '').trim();
    if (!url) {
        console.log('Redis AOF live: skipped (REDIS_URL unset)');
        process.exit(composeOn ? 0 : 1);
    }

    const Redis = require('ioredis');
    const redis = new Redis(url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 4000,
        lazyConnect: true,
        enableReadyCheck: true,
    });
    try {
        await redis.connect();
        const reply = await redis.config('GET', 'appendonly');
        const value = Array.isArray(reply) ? reply[1] : '';
        const on = String(value).toLowerCase() === 'yes';
        console.log(`Redis AOF live: appendonly=${value || 'unknown'}`);
        process.exit(on ? 0 : 1);
    } catch (err) {
        console.log(`Redis AOF live: not readable (${err.message}). Compose remains the record.`);
        process.exit(composeOn ? 0 : 1);
    } finally {
        redis.disconnect();
    }
}

main();
