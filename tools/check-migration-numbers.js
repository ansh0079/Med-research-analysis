#!/usr/bin/env node
'use strict';

/**
 * Fail the build when two migrations share a numeric prefix.
 *
 * The runner tracks migrations by filename, so duplicates do both run -- but they run in
 * alphabetical order rather than intended order, and the number stops identifying a
 * migration uniquely. Two collisions (084, 085) reached main from parallel branches
 * before this check existed.
 *
 * Collisions already applied in production are grandfathered: renaming an applied
 * migration would make it look unapplied and re-run it. The point of this gate is to
 * stop new ones.
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');

// Collisions that already reached production before this gate existed. They are
// deliberately NOT renamed: the runner keys the ledger on filename, so renaming an
// applied migration makes it look unapplied and re-run. Production already shows that
// happening -- it has ledger rows for both 070_alerts_author_journal_filter.sql and
// 070b_alerts_author_journal_filter.sql, the same migration under two names.
const GRANDFATHERED = new Set(['010', '049', '050', '051', '070', '072', '084', '085']);

function main() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        console.log('No migrations directory; nothing to check.');
        return 0;
    }

    const byNumber = new Map();
    for (const file of fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
        const match = file.match(/^(\d+)/);
        if (!match) {
            console.error(`Migration is not numbered: ${file}`);
            return 1;
        }
        const num = match[1];
        if (!byNumber.has(num)) byNumber.set(num, []);
        byNumber.get(num).push(file);
    }

    let failed = false;
    for (const [num, files] of [...byNumber].sort()) {
        if (files.length < 2) continue;
        if (GRANDFATHERED.has(num)) {
            console.log(`  (grandfathered) ${num}: ${files.join(', ')}`);
            continue;
        }
        console.error(`Duplicate migration number ${num}: ${files.join(', ')}`);
        failed = true;
    }

    if (failed) {
        console.error('\nRenumber the new migration to the next unused number.');
        return 1;
    }
    console.log(`Migration numbering OK (${byNumber.size} distinct numbers).`);
    return 0;
}

process.exit(main());
