#!/usr/bin/env node
/**
 * Lists or removes stale .claude/worktrees clones (not part of the main repo).
 * Usage:
 *   node scripts/cleanup-stale-worktrees.mjs          # dry-run list
 *   node scripts/cleanup-stale-worktrees.mjs --delete # remove directories
 */
import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), '.claude', 'worktrees');
const shouldDelete = process.argv.includes('--delete');

if (!fs.existsSync(root)) {
  console.log('No .claude/worktrees directory — nothing to clean.');
  process.exit(0);
}

const entries = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
if (!entries.length) {
  console.log('worktrees folder is empty.');
  process.exit(0);
}

for (const entry of entries) {
  const full = path.join(root, entry.name);
  if (shouldDelete) {
    fs.rmSync(full, { recursive: true, force: true });
    console.log(`Removed ${full}`);
  } else {
    console.log(`Would remove: ${full}`);
  }
}

if (!shouldDelete) {
  console.log('\nDry run only. Re-run with --delete to remove.');
}
