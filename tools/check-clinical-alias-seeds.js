#!/usr/bin/env node
'use strict';

const path = require('path');
const {
    DEFAULT_SEEDS_PATH,
    readAliasSeedCatalog,
    validateAliasSeedCatalog,
} = require('../server/services/clinicalQueryAliasSeeds');

const seedsPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_SEEDS_PATH;

const catalog = readAliasSeedCatalog(seedsPath);
const result = validateAliasSeedCatalog(catalog);

for (const warning of result.warnings) {
    console.warn(`clinical-alias warning: ${warning}`);
}

if (!result.ok) {
    for (const error of result.errors) {
        console.error(`clinical-alias error: ${error}`);
    }
    process.exit(1);
}

console.log(
    `Clinical alias seed catalog OK (${result.seedCount} seeds, ${result.pinnedPmidCount} pinned PMIDs).`
);
