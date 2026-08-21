#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
    trainLogisticRanker,
} = require('../server/services/searchShadowRankerService');

function arg(name, fallback = null) {
    const prefix = `--${name}=`;
    const found = process.argv.find((item) => item.startsWith(prefix));
    return found ? found.slice(prefix.length) : fallback;
}

function readJudgments(filePath) {
    const abs = path.resolve(process.cwd(), filePath);
    const raw = fs.readFileSync(abs, 'utf8').trim();
    if (!raw) return [];
    if (raw.startsWith('[')) return JSON.parse(raw);
    return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function main() {
    const input = arg('input');
    const output = arg('output', 'server/config/searchShadowRanker.json');
    if (!input) {
        console.error('Usage: node scripts/train-search-shadow-ranker.js --input=judgments.jsonl [--output=server/config/searchShadowRanker.json]');
        console.error('Each row should include { query, article, label } where label is 1/0 or relevant/clicked/saved.');
        process.exit(1);
    }
    const judgments = readJudgments(input);
    const model = trainLogisticRanker(judgments);
    if (!model.ok) {
        console.error(`Training failed: ${model.reason}`);
        process.exit(1);
    }
    const absOut = path.resolve(process.cwd(), output);
    fs.mkdirSync(path.dirname(absOut), { recursive: true });
    fs.writeFileSync(absOut, `${JSON.stringify(model, null, 2)}\n`);
    console.log(`Wrote ${model.version} with ${model.n} judgments (${model.positives} positive) to ${output}`);
}

main();
