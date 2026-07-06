#!/usr/bin/env node
/* eslint-disable no-console */
const { execSync } = require('child_process');

const baseRef = process.argv[2] || 'origin/main';
const headRef = process.argv[3] || 'HEAD';
const allowLegacyEdit =
  String(process.env.ALLOW_LEGACY_EDIT || '')
    .trim()
    .toLowerCase() === 'true';

if (allowLegacyEdit) {
  console.log('Legacy freeze bypassed because ALLOW_LEGACY_EDIT=true');
  process.exit(0);
}

const blockedLegacyPaths = [
  'scripts/app.js',
  'scripts/app-features.js',
  'scripts/components.js',
  'scripts/components-user.js',
  'scripts/ai-analysis.js',
  'scripts/api-bridge.js',
  'scripts/api-user.js',
  'scripts/api.js',
  'scripts/hooks.js',
  'scripts/utils.js',
];

function getChangedFiles(base, head) {
  const commands = [
    `git diff --name-only "${base}...${head}"`,
    `git diff --name-only "${base}" "${head}"`,
  ];
  for (const command of commands) {
    try {
      const output = execSync(command, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return output
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      // Shallow CI checkouts may lack a merge base for three-dot diff.
    }
  }
  throw new Error(`Unable to diff ${base} against ${head}`);
}

try {
  const changed = getChangedFiles(baseRef, headRef);
  const blocked = changed.filter((f) => blockedLegacyPaths.includes(f.replace(/\\/g, '/')));

  if (blocked.length > 0) {
    console.error('Legacy freeze check failed. The following legacy files were modified:');
    blocked.forEach((f) => console.error(` - ${f}`));
    console.error(
      '\nAdd equivalent changes to modern `src/` surfaces instead. If this edit is absolutely required, rerun with ALLOW_LEGACY_EDIT=true.'
    );
    process.exit(1);
  }

  console.log('Legacy freeze check passed.');
} catch (err) {
  console.error('Legacy freeze check failed to execute:', err.message || err);
  process.exit(1);
}

