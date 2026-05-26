/**
 * Shared JSON-parsing helpers for AI model output.
 *
 * Models often wrap JSON in markdown code fences, add trailing commas,
 * or embed it in prose.  These helpers handle all common variations.
 */

/**
 * Extract a single JSON **object** from free-form AI text.
 * Handles ```json fences, trailing commas, and prose wrapping.
 * Returns `null` when nothing parseable is found.
 */
function parseJsonBlock(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();

    // 1. Try fenced code-block extraction first (most reliable)
    const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/) || trimmed.match(/```\s*([\s\S]*?)\s*```/);
    const candidate = fenced ? fenced[1].trim() : trimmed;

    // 2. Direct parse
    try { return JSON.parse(candidate); } catch (err) { void err; }

    // 3. Strip trailing commas + extract outermost { … }
    const cleaned = candidate.replace(/,\s*([}\]])/g, '$1');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    try { return JSON.parse(cleaned.slice(start, end + 1)); }
    catch { return null; }
}

/**
 * Extract a JSON **array** from free-form AI text.
 * Same fence / trailing-comma handling as `parseJsonBlock`.
 * Returns `null` when nothing parseable is found.
 */
function parseJsonArrayBlock(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();

    // 1. Direct parse
    try { const r = JSON.parse(trimmed); if (Array.isArray(r)) return r; } catch (err) { void err; }

    // 2. Strip fences and retry
    const cleaned = trimmed.replace(/```json/g, '').replace(/```/g, '').trim();
    try { const r = JSON.parse(cleaned); if (Array.isArray(r)) return r; } catch (err) { void err; }

    // 3. Extract outermost [ … ], strip trailing commas
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) return null;
    try { return JSON.parse(cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1')); }
    catch { return null; }
}

function repairJsonCandidate(value) {
    return String(value || '')
        .replace(/^\uFEFF/, '')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/([{,]\s*)([A-Za-z_$][\w$-]*)(\s*:)/g, '$1"$2"$3')
        .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, inner) => `: "${inner.replace(/"/g, '\\"')}"`)
        .replace(/\[\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, inner) => `["${inner.replace(/"/g, '\\"')}"`)
        .replace(/,\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, inner) => `, "${inner.replace(/"/g, '\\"')}"`);
}

function parseJsonWithRepair(candidate) {
    if (!candidate || typeof candidate !== 'string') return null;
    const attempts = [
        candidate,
        candidate.replace(/```json/gi, '').replace(/```/g, '').trim(),
    ];
    const repaired = repairJsonCandidate(attempts[1]);
    if (repaired !== attempts[1]) attempts.push(repaired);

    for (const attempt of attempts) {
        try {
            return JSON.parse(attempt);
        } catch {
            // Try the next repair level.
        }
    }
    return null;
}

function parseJsonArrayStrict(text) {
    if (!text || typeof text !== 'string') {
        const err = new Error('AI response was empty');
        err.status = 502;
        throw err;
    }

    const cleaned = text
        .replace(/```json/gi, '```')
        .replace(/```/g, '')
        .trim();

    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd > objectStart) {
        const parsedObject = parseJsonWithRepair(cleaned.slice(objectStart, objectEnd + 1));
        if (Array.isArray(parsedObject?.questions)) return parsedObject.questions;
        if (Array.isArray(parsedObject?.mcqs)) return parsedObject.mcqs;
        if (Array.isArray(parsedObject)) return parsedObject;
    }

    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');
    if (arrayStart === -1 || arrayEnd <= arrayStart) {
        const err = new Error('AI response did not contain a JSON array');
        err.status = 502;
        throw err;
    }

    const parsed = parseJsonWithRepair(cleaned.slice(arrayStart, arrayEnd + 1));
    if (!Array.isArray(parsed)) {
        const err = new Error('AI response JSON was not an array');
        err.status = 502;
        throw err;
    }
    return parsed;
}

module.exports = { parseJsonBlock, parseJsonArrayBlock, parseJsonArrayStrict, repairJsonCandidate };
