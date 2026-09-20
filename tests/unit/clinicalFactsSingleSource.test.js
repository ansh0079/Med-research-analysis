'use strict';

/**
 * The clinical vocabulary must have exactly one definition. Five modules used to derive population
 * independently, with five different tag sets, and a question about adolescents matched none of the
 * guidelines written about children. This test fails the moment a sixth appears.
 */

const fs = require('fs');
const path = require('path');

const SERVER = path.join(__dirname, '../../server');
const CANONICAL = path.join(SERVER, 'services/clinical/clinicalFacts.js');

/** Population wording that only the canonical layer may pattern-match. */
const POPULATION_WORDS = /\b(paediatric|pediatric|neonat\w*|adolescents?|elderly|geriatric)\b/;

function jsFiles(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { if (entry.name !== 'node_modules') out.push(...jsFiles(full)); }
        else if (entry.name.endsWith('.js')) out.push(full);
    }
    return out;
}

/** Regex literals in the source, with the line they sit on. */
function regexLiterals(source) {
    const found = [];
    source.split('\n').forEach((line, i) => {
        if (line.trim().startsWith('*') || line.trim().startsWith('//')) return;
        for (const m of line.matchAll(/\/(?![/*])((?:\.|\[[^\]]*\]|[^/\\n])+)\/[gimsuy]*/g)) {
            found.push({ pattern: m[1], line: i + 1 });
        }
    });
    return found;
}

describe('population vocabulary has one definition', () => {
    test('no module outside clinicalFacts pattern-matches population terms', () => {
        const offenders = [];
        for (const file of jsFiles(SERVER)) {
            if (path.resolve(file) === path.resolve(CANONICAL)) continue;
            const source = fs.readFileSync(file, 'utf8');
            for (const { pattern, line } of regexLiterals(source)) {
                if (POPULATION_WORDS.test(pattern)) {
                    offenders.push(`${path.relative(SERVER, file)}:${line}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });

    test('the canonical layer still defines them, so the check above is not vacuous', () => {
        expect(POPULATION_WORDS.test(fs.readFileSync(CANONICAL, 'utf8'))).toBe(true);
    });
});
