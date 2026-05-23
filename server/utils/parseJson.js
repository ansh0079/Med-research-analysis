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
    try { return JSON.parse(candidate); } catch { /* fall through */ }

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
    try { const r = JSON.parse(trimmed); if (Array.isArray(r)) return r; } catch { /* fall through */ }

    // 2. Strip fences and retry
    const cleaned = trimmed.replace(/```json/g, '').replace(/```/g, '').trim();
    try { const r = JSON.parse(cleaned); if (Array.isArray(r)) return r; } catch { /* fall through */ }

    // 3. Extract outermost [ … ], strip trailing commas
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) return null;
    try { return JSON.parse(cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1')); }
    catch { return null; }
}

module.exports = { parseJsonBlock, parseJsonArrayBlock };
