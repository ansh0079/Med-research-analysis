#!/usr/bin/env node
/**
 * Beta safety gate verifier.
 *
 * Runs local static/deployment checks and, when BETA_BASE_URL is set, probes
 * the deployed health endpoint. It does not replace smoke tests; it catches
 * missing beta prerequisites before inviting users.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const errors = [];
const warnings = [];

function rel(filePath) {
    return path.relative(root, filePath).replaceAll(path.sep, '/');
}

function env(name) {
    return String(process.env[name] || '').trim();
}

function runNodeScript(script, extraEnv = {}) {
    const result = spawnSync(process.execPath, [path.join(root, script)], {
        cwd: root,
        env: { ...process.env, ...extraEnv },
        encoding: 'utf8',
        windowsHide: true,
    });
    return result;
}

function checkProductionEnv() {
    const result = runNodeScript('scripts/verify-production-env.mjs', {
        NODE_ENV: env('NODE_ENV') || 'production',
    });
    if (result.status !== 0) {
        errors.push('Production environment check failed. Run `npm run verify:production-env` for details.');
    }
    if (result.stdout.trim()) console.log(result.stdout.trim());
    if (result.stderr.trim()) console.warn(result.stderr.trim());
}

function checkLatestRollback() {
    const migrationsDir = path.join(root, 'database', 'migrations');
    const rollbacksDir = path.join(root, 'database', 'rollbacks');
    const migrations = fs.readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();
    const latest = migrations.at(-1);
    if (!latest) {
        errors.push('No SQL migrations found.');
        return;
    }
    const rollback = path.join(rollbacksDir, latest.replace(/\.sql$/i, '.down.sql'));
    if (!fs.existsSync(rollback)) {
        errors.push(`Latest migration ${latest} has no rollback file at ${rel(rollback)}`);
    } else {
        console.log(`Rollback coverage: ${latest} -> ${rel(rollback)}`);
    }
}

async function checkLiveHealth() {
    const baseUrl = env('BETA_BASE_URL');
    if (!baseUrl) {
        warnings.push('BETA_BASE_URL is unset - skipped live /health probe');
        return;
    }
    const healthUrl = new URL('/health', baseUrl).toString();
    const response = await fetch(healthUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
        errors.push(`/health returned HTTP ${response.status} for ${healthUrl}`);
        return;
    }
    const payload = await response.json().catch(() => null);
    if (!payload || payload.status !== 'ok' || payload.database?.ok !== true) {
        errors.push(`/health did not report ok database status for ${healthUrl}`);
        return;
    }
    console.log(`Live health ok: ${healthUrl}`);
}

function checkPrivacyTelemetry() {
    const logrocketPath = path.join(root, 'src', 'services', 'logrocket.ts');
    const source = fs.readFileSync(logrocketPath, 'utf8');
    const expectedNeedles = ['prompt', 'query', 'caseText', 'clinicalQuestion', 'text', 'messages'];
    const missing = expectedNeedles.filter((needle) => !source.includes(`'${needle}'`) && !source.includes(`"${needle}"`));
    if (missing.length > 0) {
        errors.push(`LogRocket request sanitizer is missing sensitive keys: ${missing.join(', ')}`);
    }
}

function checkSafetyCopy() {
    const terms = fs.readFileSync(path.join(root, 'src', 'pages', 'LegalTermsPage.tsx'), 'utf8');
    const privacy = fs.readFileSync(path.join(root, 'src', 'pages', 'LegalPrivacyPage.tsx'), 'utf8');
    if (!/PHI/i.test(terms) || !/clinical/i.test(terms)) {
        errors.push('Legal terms must clearly prohibit PHI submission and clinical use.');
    }
    if (!/PHI/i.test(privacy) || !/AI/i.test(privacy)) {
        errors.push('Privacy page must describe PHI handling and AI provider data flow.');
    }
}

async function main() {
    checkProductionEnv();
    checkLatestRollback();
    checkPrivacyTelemetry();
    checkSafetyCopy();
    await checkLiveHealth();

    for (const warning of warnings) console.warn(`WARN: ${warning}`);
    for (const error of errors) console.error(`ERROR: ${error}`);

    if (errors.length > 0) {
        console.error(`\nBeta safety check failed (${errors.length} error(s), ${warnings.length} warning(s)).`);
        process.exit(1);
    }
    console.log(`Beta safety check passed (${warnings.length} warning(s)).`);
}

main().catch((err) => {
    console.error(err?.message || err);
    process.exit(1);
});
