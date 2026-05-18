#!/usr/bin/env node
/**
 * Security Fixes Script
 * Run this to apply immediate security patches
 * Usage: node scripts/security-fixes.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 Medical Research App - Security Fixes\n');

const fixes = [];

// Fix 1: Update vulnerable dependencies
fixes.push({
    name: 'Update Dependencies',
    action: () => {
        try {
            console.log('📦 Updating npm packages...');
            execSync('npm audit fix', { stdio: 'inherit' });
            return true;
        } catch (e) {
            console.error('Failed to update dependencies:', e.message);
            return false;
        }
    }
});

// Fix 2: Create secure .env template
fixes.push({
    name: 'Create Secure .env Template',
    action: () => {
        const envContent = `# ==========================================
# SECURITY WARNING: Never commit this file to git!
# Add .env to .gitignore immediately
# ==========================================

# Node Environment
NODE_ENV=production

# Server Ports
NODE_PORT=3002
PYTHON_PORT=8000

# API Keys - Replace with your actual keys
# Hugging Face (for BioGPT/Mistral AI)
HUGGINGFACE_TOKEN=your_secure_token_here
BIOGPT_TOKEN=your_secure_token_here

# Semantic Scholar
SEMANTIC_SCHOLAR_KEY=your_key_here

# OpenAlex (optional)
OPENALEX_KEY=your_key_here

# OpenAI (optional - for GPT-3.5)
OPENAI_KEY=<your-openai-api-key>

# NCBI/PubMed (optional - increases rate limits)
NCBI_API_KEY=your_key_here

# Security Settings
JWT_SECRET=generate_a_random_32_char_string_here
SESSION_SECRET=another_random_32_char_string

# Feature Flags
ENABLE_LOCAL_AI=true
ENABLE_CLOUD_AI=true
ENABLE_SEMANTIC_RANKING=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;
        try {
            fs.writeFileSync('.env.secure', envContent);
            console.log('✅ Created .env.secure template');
            return true;
        } catch (e) {
            console.error('Failed to create .env.secure:', e.message);
            return false;
        }
    }
});

// Fix 3: Install security dependencies
fixes.push({
    name: 'Install Security Dependencies',
    action: () => {
        const deps = [
            'helmet',
            'express-rate-limit',
            'express-mongo-sanitize',
            'hpp',
            'csurf',
            'joi',
            'dompurify',
            'xss-clean'
        ];
        
        try {
            console.log('📦 Installing security packages...');
            execSync(`npm install ${deps.join(' ')}`, { stdio: 'inherit' });
            return true;
        } catch (e) {
            console.error('Failed to install dependencies:', e.message);
            return false;
        }
    }
});

// Fix 4: Create security middleware
fixes.push({
    name: 'Create Security Middleware',
    action: () => {
        const middlewareContent = `// ==========================================
// Security Middleware Configuration
// Add this to your server.js/server-enhanced.js
// ==========================================

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const csrf = require('csurf');
const Joi = require('joi');

// 1. Helmet Security Headers
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com"
            ],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://unpkg.com",
                "https://cdn.tailwindcss.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: [
                "'self'",
                "https://api.semanticscholar.org",
                "https://eutils.ncbi.nlm.nih.gov",
                "https://router.huggingface.co"
            ]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'same-origin' }
});

// 2. Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const strictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: {
        error: 'Rate limit exceeded for this endpoint.'
    }
});

// 3. CORS Configuration
const cors = require('cors');
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:8080'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
    credentials: true,
    maxAge: 86400
};

// 4. Validation Middleware Factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }
        next();
    };
};

// 5. Schemas
const schemas = {
    analyze: Joi.object({
        text: Joi.string().max(10000).required(),
        analysisType: Joi.string()
            .valid('quick', 'comprehensive', 'critical', 'biomedical', 'layperson')
            .default('comprehensive'),
        model: Joi.string().max(100).optional()
    }),
    
    saveArticle: Joi.object({
        article: Joi.object({
            uid: Joi.string().required(),
            title: Joi.string().optional(),
            abstract: Joi.string().optional()
        }).required()
    }),
    
    search: Joi.object({
        query: Joi.string().max(500).required(),
        max: Joi.number().integer().min(1).max(100).default(20),
        sort: Joi.string().valid('relevance', 'date').default('relevance')
    })
};

// 6. Error Handler (hide stack traces in production)
const errorHandler = (err, req, res, next) => {
    console.error(err);
    
    if (process.env.NODE_ENV === 'production') {
        res.status(err.status || 500).json({
            error: 'An error occurred',
            message: err.message
        });
    } else {
        res.status(err.status || 500).json({
            error: err.message,
            stack: err.stack
        });
    }
};

module.exports = {
    securityHeaders,
    apiLimiter,
    strictLimiter,
    corsOptions,
    validate,
    schemas,
    errorHandler,
    mongoSanitize,
    hpp
};
`;
        try {
            fs.writeFileSync('middleware/security.js', middlewareContent);
            console.log('✅ Created middleware/security.js');
            return true;
        } catch (e) {
            console.error('Failed to create security middleware:', e.message);
            return false;
        }
    }
});

// Fix 5: Create .gitignore additions
fixes.push({
    name: 'Update .gitignore',
    action: () => {
        const gitignoreAdditions = `
# Security - Never commit sensitive files
.env
.env.local
.env.*.local
*.key
*.pem
*.cert

# Database files
database/*.db
database/*.db-journal
database/backups/

# Logs
logs/
*.log
npm-debug.log*

# Runtime data
pids/
*.pid
*.seed

# Coverage directory used by tools like istanbul
coverage/

# Dependency directories
node_modules/

# Build outputs
dist/
build/
`;
        try {
            const gitignorePath = '.gitignore';
            let existing = '';
            if (fs.existsSync(gitignorePath)) {
                existing = fs.readFileSync(gitignorePath, 'utf8');
            }
            
            if (!existing.includes('.env')) {
                fs.appendFileSync(gitignorePath, gitignoreAdditions);
                console.log('✅ Updated .gitignore');
            } else {
                console.log('ℹ️ .gitignore already contains security entries');
            }
            return true;
        } catch (e) {
            console.error('Failed to update .gitignore:', e.message);
            return false;
        }
    }
});

// Run all fixes
async function runFixes() {
    const results = [];
    
    for (const fix of fixes) {
        console.log(`\n🔧 ${fix.name}...`);
        const success = await fix.action();
        results.push({ name: fix.name, success });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 Security Fixes Summary\n');
    
    results.forEach(r => {
        const icon = r.success ? '✅' : '❌';
        console.log(`${icon} ${r.name}`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('1. Review and update .env.secure with your actual API keys');
    console.log('2. Add security middleware to your Express app');
    console.log('3. Remove hardcoded API keys from scripts/services.js');
    console.log('4. Run: npm audit to verify fixes');
    console.log('5. Review SECURITY_AUDIT.md for complete remediation plan');
    console.log('\n🔐 Stay secure!\n');
}

runFixes().catch(console.error);
