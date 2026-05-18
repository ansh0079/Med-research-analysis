/**
 * Shared `pg` Pool options for production reliability (tunable via env).
 * @param {string} connectionString
 * @param {object} [ssl]
 * @param {{ max?: number }} [overrides]
 */
function buildPgPoolConfig(connectionString, ssl, overrides = {}) {
    const maxMain = parseInt(process.env.PG_POOL_MAX || '', 10);
    const idle = parseInt(process.env.PG_POOL_IDLE_TIMEOUT_MS || '', 10);
    const connTimeout = parseInt(process.env.PG_POOL_CONNECTION_TIMEOUT_MS || '', 10);

    const base = {
        connectionString: String(connectionString).trim(),
        ssl: ssl || false,
        max: Number.isFinite(overrides.max) ? overrides.max : Number.isFinite(maxMain) && maxMain > 0 ? maxMain : 20,
        idleTimeoutMillis: Number.isFinite(idle) && idle > 0 ? idle : 30_000,
        connectionTimeoutMillis: Number.isFinite(connTimeout) && connTimeout > 0 ? connTimeout : 10_000,
        allowExitOnIdle: false,
    };

    return base;
}

/** Smaller default pool for optional vector DB connections. */
function buildPgVectorPoolConfig(connectionString, ssl) {
    const maxMain = parseInt(process.env.PG_POOL_MAX || '', 10);
    const maxVec = parseInt(process.env.PG_VECTOR_POOL_MAX || '', 10);
    const cap = Number.isFinite(maxVec) && maxVec > 0 ? maxVec : Math.min(Number.isFinite(maxMain) && maxMain > 0 ? maxMain : 20, 10);
    return buildPgPoolConfig(connectionString, ssl, { max: cap });
}

module.exports = { buildPgPoolConfig, buildPgVectorPoolConfig };
