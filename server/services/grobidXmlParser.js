/**
 * Parse GROBID TEI XML into the same shape as pdfSectionParser.js output.
 *
 * GROBID produces TEI (Text Encoding Initiative) XML with structured sections,
 * bibliographic metadata, tables, and figures. This module maps that XML
 * onto the flat section / table / word-count structure the rest of the app
 * expects, so the cache and downstream consumers need no changes.
 */

'use strict';

const { XMLParser } = require('fast-xml-parser');

// Map GROBID <div type="..."> values to our canonical section keys.
// GROBID uses slightly different vocabulary than our regex parser.
const DIV_TYPE_MAP = {
    abstract: 'abstract',
    introduction: 'introduction',
    background: 'introduction',
    'materials|methods': 'methods',
    methods: 'methods',
    'patients|methods': 'methods',
    'study|design': 'methods',
    'materials|and|methods': 'methods',
    results: 'results',
    findings: 'results',
    discussion: 'discussion',
    conclusion: 'conclusion',
    summary: 'conclusion',
    limitations: 'limitations',
    references: 'references',
    bibliography: 'references',
};

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: false,
    trimValues: true,
    // Preserve arrays even when single element
    isArray: (name) => ['div', 'p', 's', 'figure', 'table', 'row', 'cell', 'head', 'biblStruct'].includes(name),
});

/**
 * Recursively extract plain text from an XML node (or array of nodes).
 */
function extractText(node) {
    if (node == null) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('\n');
    if (typeof node === 'object') {
        // Prioritize explicit text key
        if (node['#text']) return String(node['#text']);
        // Concatenate all string values recursively
        return Object.values(node)
            .map(extractText)
            .filter((t) => t.length > 0)
            .join(' ');
    }
    return String(node);
}

/**
 * Clean extracted text: collapse whitespace, remove TEI artefacts.
 */
function cleanText(text) {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
}

/**
 * Determine canonical section key from a GROBID <div> type attribute.
 */
function resolveSectionKey(div) {
    const typeAttr = div['@_type'] || div['@_subtype'] || '';
    const raw = String(typeAttr).toLowerCase().trim();
    // Direct lookup
    if (DIV_TYPE_MAP[raw]) return DIV_TYPE_MAP[raw];
    // Fuzzy: GROBID sometimes emits compound types like "materials|methods"
    for (const [grobidType, key] of Object.entries(DIV_TYPE_MAP)) {
        if (raw.includes(grobidType)) return key;
    }
    // Head-based fallback: look at the first <head> inside the div
    const headText = extractText(div.head).toLowerCase();
    if (/^abstract/.test(headText)) return 'abstract';
    if (/^(introduction|background)/.test(headText)) return 'introduction';
    if (/^(methods?|materials?\s+and\s+methods?|study\s+design|patients?\s+and\s+methods?|materials?\s+and\s+participants?)/.test(headText)) return 'methods';
    if (/^(results?|findings?|outcomes?)/.test(headText)) return 'results';
    if (/^discussion/.test(headText)) return 'discussion';
    if (/^(conclusions?|summary)/.test(headText)) return 'conclusion';
    if (/^(limitations?)/.test(headText)) return 'limitations';
    if (/^(references?|bibliography)/.test(headText)) return 'references';
    return null;
}

/**
 * Recursively collect all <figure type="table"> elements from a node.
 */
function collectFigures(node, figures = []) {
    if (!node || typeof node !== 'object') return figures;
    if (Array.isArray(node)) {
        for (const child of node) collectFigures(child, figures);
        return figures;
    }
    if (node['@_type'] === 'table' && (node.table || node.head)) {
        figures.push(node);
    }
    // Recurse into known container keys
    for (const key of Object.keys(node)) {
        if (key.startsWith('@_') || key === '#text') continue;
        collectFigures(node[key], figures);
    }
    return figures;
}

/**
 * Build tables from GROBID <figure type="table"> elements.
 */
function extractTables(body) {
    const figures = collectFigures(body);
    const tables = [];
    for (const fig of figures) {
        const heading = cleanText(extractText(fig.head)).slice(0, 120);
        const tableEl = fig.table;
        if (!tableEl) continue;
        // GROBID may wrap table in an array
        const tableObjs = Array.isArray(tableEl) ? tableEl : [tableEl];
        for (const tbl of tableObjs) {
            const rows = tbl.row || [];
            const rowData = [];
            for (const row of rows) {
                const cells = row.cell || [];
                const cellTexts = cells.map((c) => cleanText(extractText(c)));
                if (cellTexts.length > 0) rowData.push(cellTexts);
            }
            if (rowData.length >= 2) {
                const rawText = rowData.map((r) => r.join('\t')).join('\n');
                tables.push({ heading, rows: rowData, rawText });
            }
        }
    }
    return tables;
}

/**
 * Count words in TEI body text.
 */
function countWords(body) {
    const allText = extractText(body);
    return allText.split(/\s+/).filter(Boolean).length;
}

/**
 * Parse raw TEI XML string into the app-standard section structure.
 *
 * @param {string} teiXml
 * @returns {{
 *   sections: Record<string, string>,
 *   orderedKeys: string[],
 *   tables: Array<{ heading: string, rows: string[][], rawText: string }>,
 *   wordCount: number
 * }}
 */
function parseGrobidXml(teiXml) {
    if (!teiXml || typeof teiXml !== 'string') {
        return { sections: {}, orderedKeys: [], tables: [], wordCount: 0 };
    }

    let doc;
    try {
        doc = parser.parse(teiXml);
    } catch (err) {
        // If XML parsing fails, treat as empty
        return { sections: {}, orderedKeys: [], tables: [], wordCount: 0 };
    }

    const body = doc?.TEI?.text?.body;
    if (!body) {
        return { sections: {}, orderedKeys: [], tables: [], wordCount: 0 };
    }

    const sections = {};
    const orderedKeys = [];
    let currentKey = 'preamble';
    let currentLines = [];

    const flush = () => {
        const text = currentLines.join('\n\n').trim();
        if (text.length > 0) {
            if (sections[currentKey]) {
                sections[currentKey] += '\n\n' + text;
            } else {
                sections[currentKey] = text;
                orderedKeys.push(currentKey);
            }
        }
        currentLines = [];
    };

    // Process children of <body> in document order
    const children = body.div || [];
    // Also handle preamble text that appears before the first <div>
    const preambleText = body['#text'] ? cleanText(String(body['#text'])) : '';
    if (preambleText) {
        currentLines.push(preambleText);
    }

    for (const div of children) {
        const key = resolveSectionKey(div);
        if (key) {
            flush();
            // Skip noisy sections from AI analysis (same as legacy parser)
            if (key === 'references') {
                currentKey = key;
                currentLines = []; // don't collect references
                continue;
            }
            currentKey = key;
        }

        // Extract text from the div, skipping biblStruct noise
        const divText = cleanText(extractText(div));
        if (divText.length > 0) {
            currentLines.push(divText);
        }
    }
    flush();

    // Filter out references from orderedKeys (same as legacy)
    const analysisKeys = orderedKeys.filter((k) => k !== 'references' && k !== 'preamble');

    // Tables
    const tables = extractTables(body);

    // Word count
    const wordCount = countWords(body);

    return {
        sections,
        orderedKeys: analysisKeys,
        tables,
        wordCount,
    };
}

module.exports = { parseGrobidXml, extractText, resolveSectionKey };
