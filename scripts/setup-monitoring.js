#!/usr/bin/env node
/**
 * Monitoring Setup Script
 * Sets up Sentry, LogRocket, and Uptime monitoring for the application
 * Free-tier friendly configuration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}`),
};

class MonitoringSetup {
  constructor() {
    this.rootDir = process.cwd();
    this.config = {
      sentry: {
        enabled: false,
        dsn: '',
        org: '',
        project: '',
      },
      logrocket: {
        enabled: false,
        appId: '',
      },
      uptime: {
        enabled: false,
        apiKey: '',
        url: '',
      },
      analytics: {
        provider: 'none',
        trackingId: '',
      },
    };
  }

  async run() {
    console.log(`
${colors.cyan}${colors.bright}╔════════════════════════════════════════════════════════╗
║     Medical Research App - Monitoring Setup           ║
╚════════════════════════════════════════════════════════╝${colors.reset}

This script will help you set up monitoring and analytics:
${colors.green}• Sentry${colors.reset} - Error tracking (Free: 5k errors/month)
${colors.green}• LogRocket${colors.reset} - Session replay (Free: 1k sessions/month)
${colors.green}• UptimeRobot${colors.reset} - Uptime monitoring (Free: 50 monitors)
${colors.green}• Google Analytics 4${colors.reset} - Usage analytics (Free)
`);

    try {
      await this.checkPrerequisites();
      await this.setupSentry();
      await this.setupLogRocket();
      await this.setupUptimeMonitoring();
      await this.setupAnalytics();
      await this.createEnvFile();
      await this.createMonitoringConfig();
      await this.updateIndexHtml();
      await this.showSummary();

      log.success('\n✨ Monitoring setup completed!');
      log.info('Next steps:');
      log.info('1. Review the generated .env.monitoring file');
      log.info('2. Copy values to your main .env file');
      log.info('3. Deploy and test the monitoring setup');
      log.info('4. Read MONITORING.md for dashboard configuration');
    } catch (error) {
      log.error(`Setup failed: ${error.message}`);
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  async checkPrerequisites() {
    log.step('Checking prerequisites...');

    // Check if package.json exists
    if (!fs.existsSync(path.join(this.rootDir, 'package.json'))) {
      throw new Error('package.json not found. Run this from the project root.');
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 16) {
      log.warning(`Node.js ${nodeVersion} detected. Recommended: 16+`);
    } else {
      log.success(`Node.js ${nodeVersion} detected`);
    }

    log.success('Prerequisites check passed');
  }

  async setupSentry() {
    log.step('Setting up Sentry...');
    log.info('Sentry offers 5,000 errors/month on the free tier');
    log.info('Sign up at: https://sentry.io/signup/');

    const enableSentry = await question('Enable Sentry error tracking? (y/n): ');
    
    if (enableSentry.toLowerCase() !== 'y') {
      log.info('Sentry setup skipped');
      return;
    }

    this.config.sentry.enabled = true;
    this.config.sentry.dsn = await question('Enter Sentry DSN: ');
    this.config.sentry.org = await question('Enter Sentry Organization Slug: ');
    this.config.sentry.project = await question('Enter Sentry Project Slug: ');

    // Check if @sentry/react is installed
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf8')
    );
    
    const hasSentry = packageJson.dependencies?.['@sentry/react'] || 
                      packageJson.devDependencies?.['@sentry/react'];

    if (!hasSentry) {
      log.info('Installing Sentry packages...');
      try {
        execSync('npm install @sentry/react @sentry/tracing', {
          stdio: 'inherit',
          cwd: this.rootDir,
        });
        log.success('Sentry packages installed');
      } catch (error) {
        log.warning('Failed to install Sentry packages. Install manually:');
        log.info('npm install @sentry/react @sentry/tracing');
      }
    }

    // Create Sentry init file
    await this.createSentryInit();
    log.success('Sentry configured');
  }

  async createSentryInit() {
    const sentryContent = `/**
 * Sentry Configuration
 * Auto-generated by setup-monitoring.js
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const isProduction = import.meta.env.PROD;

export function initSentry() {
  if (!SENTRY_DSN || !isProduction) {
    console.log('[Sentry] Skipped - DSN not configured or not in production');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      new BrowserTracing({
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/.*\.yourdomain\.com\/api/,
        ],
      }),
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions - adjust based on free tier limits
    
    // Session Replay
    replaysSessionSampleRate: 0.01, // 1% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Environment
    environment: import.meta.env.VITE_SENTRY_ENV || 'production',
    
    // Release tracking (requires build process setup)
    release: import.meta.env.VITE_APP_VERSION,
    
    // Before send filter - reduce noise
    beforeSend(event) {
      // Filter out specific errors if needed
      if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
        return null;
      }
      return event;
    },
    
    // Set user context
    initialScope: {
      tags: {
        app: 'medical-research',
      },
    },
  });

  console.log('[Sentry] Initialized successfully');
}

export function setSentryUser(user) {
  if (!SENTRY_DSN) return;
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

export function clearSentryUser() {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}

export function captureException(error, context = {}) {
  if (!SENTRY_DSN) {
    console.error('[Sentry] Error (DSN not configured):', error);
    return;
  }
  
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureException(error);
  });
}

export function captureMessage(message, level = 'info') {
  if (!SENTRY_DSN) {
    console.log(\`[Sentry] \${level}:\`, message);
    return;
  }
  
  Sentry.captureMessage(message, level);
}

export { Sentry };
`;

    fs.writeFileSync(
      path.join(this.rootDir, 'src', 'services', 'sentry.ts'),
      sentryContent
    );
  }

  async setupLogRocket() {
    log.step('Setting up LogRocket...');
    log.info('LogRocket offers 1,000 sessions/month on the free tier');
    log.info('Sign up at: https://logrocket.com/');

    const enableLogRocket = await question('Enable LogRocket session replay? (y/n): ');
    
    if (enableLogRocket.toLowerCase() !== 'y') {
      log.info('LogRocket setup skipped');
      return;
    }

    this.config.logrocket.enabled = true;
    this.config.logrocket.appId = await question('Enter LogRocket App ID: ');

    // Create LogRocket init file
    await this.createLogRocketInit();
    log.success('LogRocket configured');
  }

  async createLogRocketInit() {
    const logRocketContent = `/**
 * LogRocket Configuration
 * Auto-generated by setup-monitoring.js
 */

import LogRocket from 'logrocket';

const LOGROCKET_APP_ID = import.meta.env.VITE_LOGROCKET_APP_ID;
const isProduction = import.meta.env.PROD;

export function initLogRocket() {
  if (!LOGROCKET_APP_ID || !isProduction) {
    console.log('[LogRocket] Skipped - App ID not configured or not in production');
    return;
  }

  LogRocket.init(LOGROCKET_APP_ID, {
    // Sanitize sensitive data for medical/health applications
    dom: {
      inputSanitizer: true,
      textSanitizer: true,
    },
    
    // Network request/response sanitization
    network: {
      requestSanitizer: (request) => {
        // Sanitize authorization headers
        if (request.headers['Authorization']) {
          request.headers['Authorization'] = '<sanitized>';
        }
        // Sanitize request bodies with potential PII
        if (request.body && typeof request.body === 'string') {
          try {
            const body = JSON.parse(request.body);
            if (body.password) body.password = '<sanitized>';
            if (body.email) body.email = '<sanitized>';
            request.body = JSON.stringify(body);
          } catch (err) {
            void err;
          }
        }
        return request;
      },
      responseSanitizer: (response) => {
        // Sanitize response data if needed
        return response;
      },
    },
    
    // Console logging
    console: {
      isEnabled: {
        log: false,
        debug: false,
        info: true,
        warn: true,
        error: true,
      },
    },
  });

  console.log('[LogRocket] Initialized successfully');
}

export function identifyLogRocketUser(user) {
  if (!LOGROCKET_APP_ID) return;
  
  LogRocket.identify(user.id, {
    name: user.name,
    email: user.email,
    // Add custom traits
    plan: user.plan || 'free',
    role: user.role || 'user',
  });
}

export function logRocketTrack(eventName, properties = {}) {
  if (!LOGROCKET_APP_ID) return;
  
  LogRocket.track(eventName, properties);
}

export function logRocketLog(level, ...args) {
  if (!LOGROCKET_APP_ID) return;
  
  LogRocket.log(level, ...args);
}

export { LogRocket };
`;

    fs.writeFileSync(
      path.join(this.rootDir, 'src', 'services', 'logrocket.ts'),
      logRocketContent
    );
  }

  async setupUptimeMonitoring() {
    log.step('Setting up Uptime Monitoring...');
    log.info('UptimeRobot offers 50 monitors on the free tier');
    log.info('Sign up at: https://uptimerobot.com/');

    const enableUptime = await question('Enable UptimeRobot monitoring? (y/n): ');
    
    if (enableUptime.toLowerCase() !== 'y') {
      log.info('Uptime monitoring setup skipped');
      return;
    }

    this.config.uptime.enabled = true;
    this.config.uptime.url = await question('Enter your production URL (e.g., https://yourapp.com): ');
    
    // Create uptime monitoring config
    await this.createUptimeConfig();
    log.success('Uptime monitoring configured');
  }

  async createUptimeConfig() {
    const uptimeConfig = {
      monitors: [
        {
          friendly_name: 'Medical Research App - Homepage',
          url: this.config.uptime.url,
          type: 1, // HTTP(s)
          interval: 300, // 5 minutes (free tier minimum)
          timeout: 30,
        },
        {
          friendly_name: 'Medical Research App - API Health',
          url: `\${this.config.uptime.url}/api/health`,
          type: 1,
          interval: 300,
          timeout: 10,
        },
        {
          friendly_name: 'Medical Research App - Search API',
          url: `\${this.config.uptime.url}/api/search?q=test`,
          type: 1,
          interval: 600, // 10 minutes
          timeout: 30,
        },
      ],
      alert_contacts: [
        {
          type: 2, // Email
          friendly_name: 'Admin Email',
          value: 'admin@yourdomain.com', // Update this
        },
      ],
    };

    fs.writeFileSync(
      path.join(this.rootDir, 'monitoring', 'uptimerobot-config.json'),
      JSON.stringify(uptimeConfig, null, 2)
    );
  }

  async setupAnalytics() {
    log.step('Setting up Analytics...');
    log.info('Available providers: Google Analytics 4, Plausible, Mixpanel');

    const provider = await question('Select provider (ga4/plausible/mixpanel/none): ');
    
    if (provider.toLowerCase() === 'none') {
      log.info('Analytics setup skipped');
      return;
    }

    this.config.analytics.provider = provider.toLowerCase();
    
    switch (this.config.analytics.provider) {
      case 'ga4':
        this.config.analytics.trackingId = await question('Enter GA4 Measurement ID (G-XXXXXXXXXX): ');
        break;
      case 'plausible':
        this.config.analytics.trackingId = await question('Enter Plausible domain (e.g., yourdomain.com): ');
        break;
      case 'mixpanel':
        this.config.analytics.trackingId = await question('Enter Mixpanel Project Token: ');
        break;
      default:
        log.warning('Unknown provider, skipping analytics setup');
        this.config.analytics.provider = 'none';
        return;
    }

    log.success(`Analytics configured with ${provider}`);
  }

  async createEnvFile() {
    log.step('Creating environment configuration...');

    const envContent = `# Monitoring Configuration
# Generated by setup-monitoring.js
# Copy these values to your .env file

# Sentry Configuration
VITE_SENTRY_DSN=${this.config.sentry.dsn || ''}
VITE_SENTRY_ORG=${this.config.sentry.org || ''}
VITE_SENTRY_PROJECT=${this.config.sentry.project || ''}
VITE_SENTRY_ENV=production

# LogRocket Configuration
VITE_LOGROCKET_APP_ID=${this.config.logrocket.appId || ''}

# Analytics Configuration
VITE_ANALYTICS_PROVIDER=${this.config.analytics.provider}
VITE_ANALYTICS_TRACKING_ID=${this.config.analytics.trackingId || ''}
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_DEBUG=false

# UptimeRobot (server-side only)
UPTIMEROBOT_API_KEY=${this.config.uptime.apiKey || ''}

# App Version (auto-generated during build)
VITE_APP_VERSION=1.0.0
`;

    fs.writeFileSync(
      path.join(this.rootDir, '.env.monitoring'),
      envContent
    );
    log.success('Environment file created: .env.monitoring');
  }

  async createMonitoringConfig() {
    log.step('Creating monitoring configuration files...');

    // Create monitoring directory
    const monitoringDir = path.join(this.rootDir, 'monitoring');
    if (!fs.existsSync(monitoringDir)) {
      fs.mkdirSync(monitoringDir, { recursive: true });
    }

    // Create health check endpoint
    const healthCheckContent = `/**
 * Health Check Endpoint
 * Returns application health status
 */

export function healthCheck(req, res) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    checks: {
      api: 'ok',
      database: checkDatabase(), // Implement based on your DB
      external: {
        pubmed: 'unknown', // Check external APIs if needed
        semantic_scholar: 'unknown',
      },
    },
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
}

function checkDatabase() {
  // Implement your database health check
  // Return 'ok', 'degraded', or 'down'
  try {
    // Example: await db.ping();
    return 'ok';
  } catch (error) {
    return 'down';
  }
}
`;

    fs.writeFileSync(
      path.join(monitoringDir, 'health-check.js'),
      healthCheckContent
    );

    // Create alerts config
    const alertsConfig = {
      sentry: {
        enabled: this.config.sentry.enabled,
        alerts: [
          {
            name: 'High Error Rate',
            metric: 'error_rate',
            threshold: 5, // errors per minute
            window: '5m',
          },
          {
            name: 'New Issues',
            metric: 'new_issues',
            threshold: 10,
            window: '1h',
          },
        ],
      },
      uptime: {
        enabled: this.config.uptime.enabled,
        alerts: [
          {
            name: 'Downtime',
            threshold: 0, // Any downtime
          },
          {
            name: 'Slow Response',
            threshold: 5000, // 5 seconds
            metric: 'response_time',
          },
        ],
      },
    };

    fs.writeFileSync(
      path.join(monitoringDir, 'alerts-config.json'),
      JSON.stringify(alertsConfig, null, 2)
    );

    log.success('Monitoring configuration files created');
  }

  async updateIndexHtml() {
    log.step('Updating index.html with monitoring scripts...');

    const indexPath = path.join(this.rootDir, 'index.html');
    
    if (!fs.existsSync(indexPath)) {
      log.warning('index.html not found, skipping script injection');
      return;
    }

    let indexContent = fs.readFileSync(indexPath, 'utf8');

    // Check if already updated
    if (indexContent.includes('<!-- Monitoring -->')) {
      log.info('index.html already contains monitoring scripts');
      return;
    }

    // Add monitoring scripts before closing </head>
    const monitoringScripts = `
  <!-- Monitoring -->
  <script>
    // Initialize monitoring when DOM is ready
    if (import.meta.env.PROD) {
      // Sentry
      if (import.meta.env.VITE_SENTRY_DSN) {
        import('./src/services/sentry.ts').then(m => m.initSentry());
      }
      // LogRocket
      if (import.meta.env.VITE_LOGROCKET_APP_ID) {
        import('./src/services/logrocket.ts').then(m => m.initLogRocket());
      }
      // Analytics
      import('./src/services/analytics.ts').then(m => m.initializeAnalytics());
    }
  </script>
`;

    indexContent = indexContent.replace(
      '</head>',
      `${monitoringScripts}</head>`
    );

    fs.writeFileSync(indexPath, indexContent);
    log.success('index.html updated with monitoring scripts');
  }

  async showSummary() {
    console.log(`
${colors.cyan}${colors.bright}╔════════════════════════════════════════════════════════╗
║                  Setup Summary                         ║
╚════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}Enabled Services:${colors.reset}
  ${this.config.sentry.enabled ? colors.green + '✓' : colors.red + '✗'} Sentry Error Tracking${colors.reset}
  ${this.config.logrocket.enabled ? colors.green + '✓' : colors.red + '✗'} LogRocket Session Replay${colors.reset}
  ${this.config.uptime.enabled ? colors.green + '✓' : colors.red + '✗'} UptimeRobot Monitoring${colors.reset}
  ${this.config.analytics.provider !== 'none' ? colors.green + '✓' : colors.red + '✗'} Analytics (${this.config.analytics.provider})${colors.reset}

${colors.bright}Generated Files:${colors.reset}
  • .env.monitoring - Environment variables
  • src/services/sentry.ts - Sentry configuration
  • src/services/logrocket.ts - LogRocket configuration
  • monitoring/uptimerobot-config.json - Uptime monitoring
  • monitoring/health-check.js - Health endpoint
  • monitoring/alerts-config.json - Alert rules

${colors.bright}Free Tier Limits:${colors.reset}
  • Sentry: 5,000 errors/month
  • LogRocket: 1,000 sessions/month
  • UptimeRobot: 50 monitors
  • Google Analytics 4: Unlimited

${colors.bright}Next Steps:${colors.reset}
  1. Review and copy .env.monitoring to your environment
  2. Update your main.tsx to import monitoring services
  3. Configure dashboards (see MONITORING.md)
  4. Set up alert contacts in each service
  5. Test the monitoring setup
`);
  }
}

// Run setup
const setup = new MonitoringSetup();
setup.run().catch(console.error);
