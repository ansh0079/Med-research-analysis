#!/usr/bin/env node
/**
 * Fail when two migration files share the same numeric(+letter) prefix,
 * except for a grandfathered set of historical collisions.
 *
 * 070 and 070b are distinct. Two files both named 049_* are not.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');

const GRANDFATHERED_COLLISIONS = new Map([
  ['010', ['010_quality_monitoring.sql', '010_stripe_subscriptions.sql']],
  ['049', ['049_beta_invites.sql', '049_guideline_contradictions.sql', '049_synthesis_claim_fingerprints.sql']],
  ['050', ['050_case_sessions.sql', '050_topic_crosslinks.sql']],
  ['051', ['051_case_evidence_context.sql', '051_claim_lifecycle.sql']],
]);

function prefixOf(filename) {
  const match = filename.match(/^(\d+[a-z]?)/i);
  return match ? match[1] : null;
}

function main() {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const byPrefix = new Map();
  for (const file of files) {
    const prefix = prefixOf(file);
    if (!prefix) {
      console.error(`Migration file missing numeric prefix: ${file}`);
      process.exit(1);
    }
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix).push(file);
  }

  const errors = [];
  for (const [prefix, group] of byPrefix) {
    if (group.length <= 1) continue;
    const allowed = GRANDFATHERED_COLLISIONS.get(prefix);
    const extra = allowed ? group.filter((f) => !allowed.includes(f)) : group;
    if (!allowed) {
      errors.push(`Prefix ${prefix} is used by ${group.join(', ')}`);
    } else if (extra.length) {
      errors.push(`Prefix ${prefix} gained new files beyond the grandfathered set: ${extra.join(', ')}`);
    }
  }

  if (errors.length) {
    console.error('Migration prefix uniqueness check failed:');
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }
  console.log(`Migration prefixes OK (${files.length} files).`);
}

main();
