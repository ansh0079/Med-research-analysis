'use strict';

/**
 * Every model call names a registered operation, and gets that operation's budget.
 *
 * Unnamed calls inherited a 2500/1024-token fallback and pooled their failures into "unspecified".
 * That is how the reranker failed on every search for months, and topic evolution every night,
 * without anything reporting it.
 */

const fs = require('fs');
const path = require('path');
const { OPERATIONS, getOperation, withOperationDefaults } = require('../../server/services/ai/aiOperations');

const ROOT = path.join(__dirname, '../..');
const CALL = /\.(callText|callStructured|callTextStream)\(/g;

// Wrappers that pass their caller's options through. Their callers are checked by the literal
// scan below instead; each entry says where the operation comes from.
const FORWARDING_WRAPPERS = {
    'server/routes/ai/analysis.js': 'callTextWithFallback/streamTextWithFallback forward options from the route handlers',
    'server/routes/ai/shared.js': 'generateQuizQuestions forwards usage from quizGenerationService',
    'server/services/learning/mcqValidationService.js': 'callModelStructured builds usage from its operation argument',
};

function listJs(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === 'node_modules' ? [] : listJs(full);
        return e.name.endsWith('.js') ? [full] : [];
    });
}

/** Text of a call's argument list, skipping strings and template literals so a "(" in a prompt does not count. */
function argsOf(src, openParen) {
    let depth = 0;
    const templateStack = [];
    for (let i = openParen; i < src.length; i++) {
        const c = src[i];
        if (c === '\'' || c === '"') {
            for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
            continue;
        }
        if (c === '`') {
            for (i++; i < src.length && src[i] !== '`'; i++) {
                if (src[i] === '\\') { i++; continue; }
                if (src[i] === '$' && src[i + 1] === '{') { templateStack.push(depth); depth++; i++; break; }
            }
            continue;
        }
        if (c === '}' && templateStack.length && depth - 1 === templateStack[templateStack.length - 1]) {
            templateStack.pop();
            depth--;
            // resume the template literal
            for (i++; i < src.length && src[i] !== '`'; i++) {
                if (src[i] === '\\') { i++; continue; }
                if (src[i] === '$' && src[i + 1] === '{') { templateStack.push(depth); depth++; i++; break; }
            }
            continue;
        }
        if (c === '(' || c === '{' || c === '[') depth++;
        if (c === ')' || c === '}' || c === ']') {
            depth--;
            if (depth === 0) return src.slice(openParen, i + 1);
        }
    }
    return src.slice(openParen);
}

const sites = listJs(path.join(ROOT, 'server')).flatMap((file) => {
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const out = [];
    for (const m of src.matchAll(CALL)) {
        const line = src.slice(0, m.index).split('\n').length;
        out.push({ rel, line, args: argsOf(src, m.index + m[0].length - 1) });
    }
    return out;
});

test('the scan finds the call sites (a broken scan must not pass silently)', () => {
    expect(sites.length).toBeGreaterThan(40);
});

test('every model call names a registered operation', () => {
    const problems = [];
    for (const site of sites) {
        const named = [...site.args.matchAll(/operation:\s*'([a-z_]+)'/g)].map((m) => m[1]);
        if (named.length) {
            for (const name of named) if (!getOperation(name)) problems.push(`${site.rel}:${site.line} unregistered '${name}'`);
            continue;
        }
        if (FORWARDING_WRAPPERS[site.rel]) continue;
        problems.push(`${site.rel}:${site.line} names no operation`);
    }
    expect(problems).toEqual([]);
});

test('every operation name written anywhere in server code is registered', () => {
    const problems = [];
    for (const file of listJs(path.join(ROOT, 'server'))) {
        const src = fs.readFileSync(file, 'utf8');
        for (const m of src.matchAll(/usage:\s*\{\s*operation:\s*'([a-z_]+)'/g)) {
            if (!getOperation(m[1])) problems.push(`${path.relative(ROOT, file)}: '${m[1]}'`);
        }
    }
    // mcqValidationService passes these positionally
    for (const name of ['quiz_validation', 'quiz_safety_classifier']) if (!getOperation(name)) problems.push(name);
    expect(problems).toEqual([]);
});

test('every registered operation has a budget', () => {
    for (const [name, op] of Object.entries(OPERATIONS)) {
        expect([name, Number.isFinite(op.maxOutputTokens) && op.maxOutputTokens > 0]).toEqual([name, true]);
        expect(['interactive', 'background']).toContain(op.kind);
    }
});

describe('withOperationDefaults', () => {
    test('fills the registered budget and deadline when the caller passed none', () => {
        const out = withOperationDefaults({ temperature: 0.2, usage: { operation: 'topic_evolution' } });
        expect(out).toMatchObject({ temperature: 0.2, maxOutputTokens: 8192, timeoutMs: 120000 });
    });

    test('an explicit value at the call site wins', () => {
        const out = withOperationDefaults({ maxOutputTokens: 100, timeoutMs: 5, usage: { operation: 'topic_evolution' } });
        expect(out).toMatchObject({ maxOutputTokens: 100, timeoutMs: 5 });
    });

    test('an unregistered call still runs, unchanged, and is reported once', () => {
        const logger = { warn: jest.fn() };
        const opts = { temperature: 0.1, usage: { operation: 'not_a_real_op_xyz' } };
        expect(withOperationDefaults(opts, logger)).toBe(opts);
        withOperationDefaults(opts, logger);
        expect(logger.warn).toHaveBeenCalledTimes(1);
    });
});
