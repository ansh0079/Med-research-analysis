'use strict';

// docker compose only passes the variables a service lists. A key can sit in the server's .env
// and still never reach the app. This reads the keys the app takes from process.env in config.js
// and checks the compose file forwards them to both services, so a new key cannot be added to the
// app and quietly left out of the containers.

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const root = path.join(__dirname, '../..');
const compose = yaml.parse(fs.readFileSync(path.join(root, 'docker-compose.hetzner.yml'), 'utf8'));
const configSource = fs.readFileSync(path.join(root, 'config.js'), 'utf8');

// No OpenAI key is provisioned on the server (embeddings use Gemini), so it is not forwarded.
const NOT_FORWARDED_ON_PURPOSE = ['OPENAI_KEY | OPENAI_API_KEY'];

/** [[ALIAS_A, ALIAS_B], ...] for each getter in config.js's `keys` block (and only that block). */
function keyGroups() {
    const open = configSource.indexOf('keys: {');
    let depth = 0;
    let end = open;
    for (let i = configSource.indexOf('{', open); i < configSource.length; i += 1) {
        if (configSource[i] === '{') depth += 1;
        if (configSource[i] === '}') {
            depth -= 1;
            if (depth === 0) { end = i; break; }
        }
    }
    // Each getter is one line: `get name() { return process.env.A || process.env.B; }`
    return configSource.slice(open, end).split('\n')
        .map((line) => [...line.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]))
        .filter((names) => names.length > 0);
}

const forwarded = (service) => new Set(Object.keys(compose.services[service].environment || {}));

describe('compose forwards the keys the app reads', () => {
    test('config.js key groups were found', () => {
        expect(keyGroups().length).toBeGreaterThanOrEqual(8);
    });

    test.each(['web', 'worker'])('%s receives every API key the app reads', (service) => {
        const have = forwarded(service);
        const missing = keyGroups()
            .filter((names) => !names.some((n) => have.has(n)))
            .map((names) => names.join(' | '))
            .filter((label) => !NOT_FORWARDED_ON_PURPOSE.includes(label));
        expect(missing).toEqual([]);
    });

    test('Semantic Scholar key reaches both web and worker', () => {
        for (const service of ['web', 'worker']) expect(forwarded(service).has('SEMANTIC_SCHOLAR_KEY')).toBe(true);
    });

    test('the search keys are among those found, so the check is not vacuous', () => {
        const flat = keyGroups().flat();
        for (const name of ['SEMANTIC_SCHOLAR_KEY', 'OPENALEX_KEY', 'GEMINI_API_KEY', 'NCBI_API_KEY']) expect(flat).toContain(name);
    });
});
