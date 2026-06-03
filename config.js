// ==========================================
// Central Configuration (Server & Client)
// ==========================================

const fs = require('fs');
const os = require('os');
const path = require('path');

function loadEnvFile(envPath, { override = false } = {}) {
    if (!fs.existsSync(envPath)) return;
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
            const envKey = key.trim();
            const envValue = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            if (override || !process.env[envKey]) {
                process.env[envKey] = envValue;
            }
        }
    });
}

// Load env files. User-level secrets win over project defaults.
function loadEnv() {
    const userEnvPath = path.join(os.homedir(), '.medresearch-keys.env');
    loadEnvFile(userEnvPath);

    const envPath = path.join(__dirname, '.env');
    loadEnvFile(envPath);
}

// Server-side config (NEVER expose to client)
// Use getters to read env vars dynamically after loadEnv() is called
const serverConfig = {
    ports: {
        get node() { return process.env.NODE_PORT || process.env.PORT || 3002; }
    },
    keys: {
        get mistral() { return process.env.MISTRAL_API_KEY; },
        get gemini() { return process.env.GEMINI_API_KEY; },
        get semantic() { return process.env.SEMANTIC_SCHOLAR_KEY || process.env.SEMANTIC_SCHOLAR_API_KEY; },
        get openalex() { return process.env.OPENALEX_KEY; },
        get openai() { return process.env.OPENAI_KEY || process.env.OPENAI_API_KEY; },
        get ncbi() { return process.env.NCBI_API_KEY || process.env.PUBMED_API_KEY; },
        get ncbiEmail() { return process.env.NCBI_EMAIL || 'anonymous@localhost'; },
        get anthropic() { return process.env.ANTHROPIC_API_KEY; }
    },
    features: {
        get enableLocalAI() {
            return process.env.ENABLE_LOCAL_AI === 'true' || Boolean(
                process.env.BIOGPT_SERVER_URL && String(process.env.BIOGPT_SERVER_URL).trim()
            );
        },
        get enableCloudAI() { return process.env.ENABLE_CLOUD_AI === 'true'; },
        get enableSemanticRanking() { return process.env.ENABLE_SEMANTIC_RANKING === 'true'; }
    }
};

// Client-safe config (exposed to browser)
// Use getters so values are read dynamically after loadEnv() is called
const clientConfig = {
    get apiEndpoints() {
        const isProduction = process.env.NODE_ENV === 'production';
        return {
            proxy: isProduction ? '' : `http://localhost:${serverConfig.ports.node}`,
            get localAI() { return !!process.env.BIOGPT_SERVER_URL; }
        };
    },
    get features() {
        return {
            enableLocalAI: serverConfig.features.enableLocalAI,
            enableCloudAI: serverConfig.features.enableCloudAI,
            enableSemanticRanking: serverConfig.features.enableSemanticRanking
        };
    },
    // API key availability flags
    get gemini() { return !!serverConfig.keys.gemini; },
    get mistral() { return !!serverConfig.keys.mistral; },
    // OAuth provider availability
    get oauth() {
        return {
            google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
            orcid: Boolean(process.env.ORCID_CLIENT_ID && process.env.ORCID_CLIENT_SECRET),
        };
    },
    // Default to free tier - no API key needed
    defaultProvider: 'algorithm'
};

module.exports = { loadEnv, serverConfig, clientConfig };
