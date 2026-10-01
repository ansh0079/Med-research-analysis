'use strict';

/**
 * Shared NICE recommendations-chapter fetching and parsing.
 *
 * Used by scripts/ingest-nice-guidelines.js (bulk ingest) and
 * scripts/repair-truncated-guidelines.js (targeted repair of rows whose
 * recommendation text was cut off at a lead-in colon).
 */

const { fetchWithTimeout: fetch } = require('../../server/utils/fetch');

const NICE_BASE = 'https://www.nice.org.uk';
const UA = 'Mozilla/5.0 (compatible; MedResearch/1.0; +https://signalmd.co)';

const RECOMMENDATION_RE = /\b(should|should not|recommend|must|offer|consider|avoid|do not|initiate|start|prescribe|screen|monitor|refer|first-line|second-line|indicated|contraindicated|titrate|discontinue)\b/i;
const MIN_LENGTH = 30;

// Remove HTML tags, decode entities
function stripHtml(s) {
    return (s || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/\s+/g, ' ')
        .trim();
}

// Fetch recommendations chapter for a NICE guideline ref
async function fetchNiceRecommendations(ref) {
    const urls = [
        `${NICE_BASE}/guidance/${ref}/chapter/Recommendations`,
        `${NICE_BASE}/guidance/${ref}/chapter/1-recommendations`,
        `${NICE_BASE}/guidance/${ref}/chapter/1-Recommendations`,
    ];
    for (const url of urls) {
        try {
            const res = await fetch(url, { timeout: 20000, headers: { 'User-Agent': UA } });
            if (!res.ok) continue;
            const html = await res.text();
            if (html.length < 500) continue;
            return { html, url };
        } catch {
            continue;
        }
    }
    return null;
}

/**
 * Join a lead-in paragraph that ends with ':' (or ';') with the list items
 * that carry its conditions. NICE marks these up as a <p> followed by a <ul>;
 * the items alone are not standalone recommendations.
 */
function joinLeadInWithListItems(leadIn, listItems) {
    let text = leadIn;
    let prevItem = null;
    for (const item of listItems) {
        // Continue with a space when the sentence is mid-flow: after a colon,
        // after a dangling "or"/"and", before a leading "or"/"and", or after a
        // short connector phrase such as "and in addition".
        const prevIsConnector = prevItem !== null
            && /^(or|and)\b/i.test(prevItem)
            && prevItem.split(/\s+/).length <= 4;
        const separator = /[:;.!?]\s*$/.test(text)
            || /\b(or|and)\s*$/i.test(text)
            || /\bin addition\s*$/i.test(text)
            || /^(or|and)\b/i.test(item)
            || prevIsConnector
            ? ' '
            : '; ';
        text += separator + item;
        prevItem = item;
    }
    if (!/[.!?]\s*(\[\d{4}[^\]]*\])?\s*$/.test(text)) text += '.';
    return text;
}

/**
 * Walk the recommendations HTML as a token stream and emit ordered text
 * blocks, tracking whether each block lives inside a list item. Handles the
 * two NICE markups: bare <li>text</li>, and <li><p>text</p></li> (including
 * nested sub-lists of sub-conditions).
 */
function extractBlocks(html) {
    const blocks = [];
    // Tokens: <p>/<li> open/close tags (structural), any other tag (ignored,
    // contributes a space), and text runs.
    const re = /<\/?(?:p|li)\b[^>]*>|<[^>]+>|[^<]+/gi;
    const liStack = []; // entries: { hadP: boolean }
    let inP = false;
    let pInLi = false;
    let buf = '';
    const emitBuf = (inList) => {
        const text = stripHtml(buf);
        buf = '';
        if (text) blocks.push({ text, inList });
    };
    let m;
    while ((m = re.exec(html)) !== null) {
        const tok = m[0];
        if (/^<p\b/i.test(tok)) {
            if (liStack.length) liStack[liStack.length - 1].hadP = true;
            if (!inP) {
                inP = true;
                pInLi = liStack.length > 0;
                buf = '';
            }
        } else if (/^<\/p/i.test(tok)) {
            if (inP) {
                emitBuf(pInLi);
                inP = false;
            }
        } else if (/^<li\b/i.test(tok)) {
            liStack.push({ hadP: false });
            if (!inP) buf = '';
        } else if (/^<\/li/i.test(tok)) {
            const li = liStack.pop();
            if (li && !li.hadP && !inP) emitBuf(true); // bare-text list item
        } else if (tok.startsWith('<')) {
            buf += ' '; // non-structural inline tag (<a>, <strong>, <br>, ...)
        } else {
            buf += tok;
        }
    }
    if (buf.trim()) emitBuf(liStack.length > 0);
    return blocks;
}

// Parse recommendation items from NICE recommendations HTML
function parseNiceRecommendations(html, ref) {
    const recs = [];
    const blocks = extractBlocks(html);

    // Merge pass: a standalone paragraph ending with ':' or ';' swallows the
    // run of list blocks that immediately follows it — those list items are
    // its conditions (and, when nested, their sub-conditions).
    const merged = [];
    for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i];
        if (!block.inList && /[:;]\s*$/.test(block.text)) {
            const listItems = [];
            let j = i + 1;
            while (j < blocks.length && blocks[j].inList) {
                listItems.push(blocks[j].text);
                j += 1;
            }
            if (listItems.length > 0) {
                merged.push({ inList: false, text: joinLeadInWithListItems(block.text, listItems) });
                i = j - 1;
                continue;
            }
        }
        merged.push(block);
    }

    for (const item of merged) {
        const text = item.text;
        if (text.length < MIN_LENGTH) continue;
        if (!RECOMMENDATION_RE.test(text)) continue;
        // Skip meta-commentary
        if (/\bthis guideline\b|\bmore information\b|\bsee also\b|\bappendix\b|\bfull guideline\b/i.test(text) && text.length < 100) continue;
        // Skip JavaScript/tracking noise
        if (/function\s*\(|window\[|gtm\.start|dataLayer|googletag|addEventListener/i.test(text)) continue;
        recs.push(text);
    }
    return [...new Set(recs)]; // deduplicate
}

module.exports = {
    NICE_BASE,
    UA,
    RECOMMENDATION_RE,
    MIN_LENGTH,
    stripHtml,
    fetchNiceRecommendations,
    parseNiceRecommendations,
};
