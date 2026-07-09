#!/usr/bin/env node

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const root = process.cwd();

const filesToCheck = [
  'README.md',
  'LAUNCH_CHECKLIST.md',
  'NEXT_STEPS.md',
  'FEATURES_COMPLETE.md',
  'FRONTEND_FEATURES.md',
  'FEATURES_SUMMARY.md',
  'ADVANCED_FEATURES_COMPLETE.md',
  'package.json',
];

const blockedPatterns = [
  'index-secure.html',
  'index-features.html',
  'build:legacy-window',
  'build:legacy-esm',
  'scripts/legacy-window.js',
  'scripts/legacy-window.mjs',
  'scripts/api-bridge.js',
  'scripts/services-secure.js',
  'scripts/app.js',
  'scripts/app-features.js',
  'scripts/components.js',
  'scripts/components-user.js',
  'scripts/ai-analysis.js',
];

const allowlistByFile = {
  'README.md': ['LEGACY_DEPRECATION_PLAN.md'],
};

const findings = [];

for (const relativeFile of filesToCheck) {
  const absoluteFile = join(root, relativeFile);
  if (!existsSync(absoluteFile)) continue;

  const content = readFileSync(absoluteFile, 'utf8');
  const lines = content.split(/\r?\n/);
  const allowlist = allowlistByFile[relativeFile] || [];

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    for (const token of blockedPatterns) {
      if (!line.includes(token)) continue;
      const isAllowlisted = allowlist.some((allowed) => line.includes(allowed));
      if (isAllowlisted) continue;
      findings.push({
        file: relativeFile,
        line: lineNumber,
        token,
        sample: line.trim(),
      });
    }
  });
}

if (findings.length > 0) {
  console.error('Legacy removal readiness check failed. Found blocking legacy references:\n');
  findings.forEach((item) => {
    console.error(`- ${item.file}:${item.line} -> "${item.token}"`);
    console.error(`  ${item.sample}`);
  });
  console.error(
    '\nResolve references above (or move historical notes to deprecation docs) before executing Phase 4 deletions.'
  );
  process.exit(1);
}

console.log('Legacy removal readiness check passed.');
