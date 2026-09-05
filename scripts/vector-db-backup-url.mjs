#!/usr/bin/env node
/**
 * Return the vector DB URL when it is a separate database from the app DB.
 * Used by backup scripts so a split PG_VECTOR_URL is dumped independently.
 */
function normalizeUrl(raw) {
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}${url.pathname}`.replace(/\/$/, '');
  } catch {
    return String(raw).replace(/\/$/, '');
  }
}

const appUrl = process.env.DATABASE_URL || process.env.SOURCE_URL || '';
const vectorUrl = process.env.PG_VECTOR_URL || '';
if (vectorUrl && normalizeUrl(vectorUrl) !== normalizeUrl(appUrl)) {
  process.stdout.write(vectorUrl);
}
