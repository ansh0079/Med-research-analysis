/**
 * Parse raw PDF text into structured sections and heuristic table blocks.
 *
 * Section detection: lines that match standard academic heading patterns
 * (all-caps short line, or title-case heading that matches a known section name)
 * are treated as section boundaries.
 *
 * Table detection: runs of 3+ lines where each line contains 3+ whitespace-
 * separated tokens and column positions are roughly stable.
 */

const SECTION_PATTERNS = [
    { key: 'abstract',      re: /^(abstract)$/i },
    { key: 'introduction',  re: /^(introduction|background)$/i },
    { key: 'methods',       re: /^(methods?|materials?\s+and\s+methods?|study\s+design|patients?\s+and\s+methods?)$/i },
    { key: 'results',       re: /^(results?|findings?|outcomes?)$/i },
    { key: 'discussion',    re: /^(discussion)$/i },
    { key: 'conclusion',    re: /^(conclusions?|summary)$/i },
    { key: 'limitations',   re: /^(limitations?)$/i },
    { key: 'references',    re: /^(references?|bibliography)$/i },
    { key: 'figures',       re: /^(figures?|tables?|supplementary)$/i },
];

/**
 * Clean a single line — strip common PDF artefacts.
 */
function cleanLine(line) {
    return line
        .replace(/\f/g, '')       // form-feed
        .replace(/\r/g, '')       // carriage return
        .trim();
}

/**
 * Heuristically decide whether a line is a section header.
 * Returns the section key or null.
 */
function detectSectionKey(line) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.length > 80) return null;
    // Strip leading numbering (e.g. "2.1 Methods")
    const stripped = trimmed.replace(/^[\d.]+\s+/, '').trim();
    for (const { key, re } of SECTION_PATTERNS) {
        if (re.test(stripped)) return key;
    }
    return null;
}

/**
 * Score how "table-like" a window of lines is.
 * Returns true when 3+ consecutive lines have multiple columns of text/numbers.
 */
function isTableBlock(lines) {
    if (lines.length < 3) return false;
    let tableRows = 0;
    for (const line of lines) {
        const tokens = line.trim().split(/\s{2,}/);    // 2+ spaces = column separator
        if (tokens.length >= 3) tableRows++;
    }
    return tableRows >= Math.min(3, lines.length * 0.6);
}

/**
 * Extract heuristic table blocks from a section's text.
 * Returns an array of { heading, rows } objects.
 */
function extractTables(text) {
    const lines = text.split('\n').map(cleanLine).filter((l) => l.length > 0);
    const tables = [];
    let i = 0;
    while (i < lines.length) {
        // Collect a candidate window
        const window = lines.slice(i, i + 10);
        if (isTableBlock(window)) {
            // Expand window until lines stop looking tabular
            let end = i + 10;
            while (end < lines.length) {
                const next = lines.slice(end, end + 3);
                if (!isTableBlock(next) && next.every((l) => l.split(/\s{2,}/).length < 3)) break;
                end++;
            }
            const tableLines = lines.slice(i, end);
            // Find a preceding heading (line before window)
            const heading = i > 0 ? lines[i - 1] : '';
            tables.push({
                heading: heading.slice(0, 120),
                rows: tableLines.map((l) => l.split(/\s{2,}/).map((c) => c.trim())),
                rawText: tableLines.join('\n'),
            });
            i = end;
        } else {
            i++;
        }
    }
    return tables;
}

/**
 * Parse raw PDF text into structured sections.
 *
 * @param {string} rawText  — full text from pdf-parse
 * @returns {{
 *   sections: Record<string, string>,
 *   orderedKeys: string[],
 *   tables: Array<{ heading: string, rows: string[][], rawText: string }>,
 *   wordCount: number
 * }}
 */
function parsePdfSections(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        return { sections: {}, orderedKeys: [], tables: [], wordCount: 0 };
    }

    const lines = rawText.split('\n').map(cleanLine);
    const sections = {};
    const orderedKeys = [];
    let currentKey = 'preamble';
    let currentLines = [];

    const flush = () => {
        const text = currentLines.join('\n').trim();
        if (text.length > 0) {
            if (sections[currentKey]) {
                sections[currentKey] += '\n' + text;
            } else {
                sections[currentKey] = text;
                orderedKeys.push(currentKey);
            }
        }
        currentLines = [];
    };

    for (const line of lines) {
        const key = detectSectionKey(line);
        if (key) {
            flush();
            currentKey = key;
        } else {
            // Skip lines that are just page numbers
            if (/^\d{1,4}$/.test(line.trim())) continue;
            currentLines.push(line);
        }
    }
    flush();

    // Don't include references in AI analysis — too noisy
    const analysisKeys = orderedKeys.filter((k) => k !== 'references' && k !== 'preamble');

    // Extract tables from the full text (across all sections)
    const tables = extractTables(rawText);

    const wordCount = rawText.split(/\s+/).filter(Boolean).length;

    return { sections, orderedKeys: analysisKeys, tables, wordCount };
}

/**
 * Flatten specific sections into a prompt-ready string.
 * @param {Record<string, string>} sections
 * @param {string[]} keys  — which section keys to include (e.g. ['methods', 'results'])
 * @param {number} [maxChars=20000]
 */
function sectionText(sections, keys, maxChars = 20000) {
    const parts = [];
    for (const key of keys) {
        const text = sections[key];
        if (text) {
            parts.push(`## ${key.toUpperCase()}\n${text}`);
        }
    }
    const joined = parts.join('\n\n');
    return joined.length > maxChars ? joined.slice(0, maxChars) + '\n\n[truncated]' : joined;
}

module.exports = { parsePdfSections, sectionText, extractTables };
