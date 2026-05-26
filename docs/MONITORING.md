# Monitoring & Analytics Setup Guide

Production monitoring and analytics setup for the Medical Research Intelligence Platform.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Services Overview](#services-overview)
- [Setup Instructions](#setup-instructions)
- [Dashboard Configuration](#dashboard-configuration)
- [Alert Rules](#alert-rules)
- [On-Call Runbook](#on-call-runbook)
- [Development Mode](#development-mode)
- [Troubleshooting](#troubleshooting)

## Overview

This monitoring stack provides comprehensive observability for your medical research application:

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Sentry** | Error tracking & performance | 5,000 errors/month |
| **LogRocket** | Session replay & UX analytics | 1,000 sessions/month |
| **Google Analytics 4** | Usage analytics | Unlimited |
| **UptimeRobot** | Uptime monitoring | 50 monitors |

## Quick Start

### 1. Run Setup Script

```bash
node scripts/setup-monitoring.js
```

This interactive script will:
- Configure Sentry error tracking
- Set up LogRocket session replay
- Configure analytics provider
- Generate monitoring config files

### 2. Copy Environment Variables

```bash
# Copy monitoring env vars to your .env file
cat .env.monitoring >> .env
```

### 3. Verify Installation

```bash
# Development mode (monitoring disabled)
npm run dev

# Production build (monitoring enabled)
npm run build
npm run preview
```

## Services Overview

### Sentry - Error Tracking

**Free Tier:** 5,000 errors/month, 10M spans/month

**Features:**
- Real-time error tracking
- Performance monitoring
- Release tracking
- Source maps support
- Session replay (limited)

**When to Upgrade:**
- >5,000 errors/month consistently
- Need advanced performance insights
- Require custom data retention

### LogRocket - Session Replay

**Free Tier:** 1,000 sessions/month

**Features:**
- Video-like session replay
- Network request inspection
- Console log capture
- Redux/Vuex state inspection
- User frustration signals

**Privacy Considerations for Medical Apps:**
```typescript
// LogRocket sanitization is configured in src/services/logrocket.ts
LogRocket.init(LOGROCKET_APP_ID, {
  dom: {
    inputSanitizer: true,  // Masks input fields
    textSanitizer: true,   // Masks text content
  },
  network: {
    requestSanitizer: (request) => {
      // Remove auth tokens and PII
      if (request.headers['Authorization']) {
        request.headers['Authorization'] = '<sanitized>';
      }
      return request;
    },
  },
});
```

**When to Upgrade:**
- Need >1,000 sessions/month
- Require longer retention (free = 1 month)
- Need product analytics features

### Google Analytics 4

**Free Tier:** Unlimited events

**Features:**
- User behavior tracking
- Conversion tracking
- Audience insights
- Custom events
- Funnel analysis

**Medical/Healthcare Considerations:**
- GA4 does not collect PHI when properly configured
- Use custom events for feature tracking
- Enable IP anonymization (configured by default)
- Respect user consent for tracking

### UptimeRobot

**Free Tier:** 50 monitors, 5-minute intervals

**Monitors:**
- Homepage availability
- API health endpoint
- Search functionality
- External API dependencies

## Setup Instructions

### Sentry Setup

1. **Create Account:**
   - Sign up at [sentry.io](https://sentry.io/signup/)
   - Create a new organization
   - Create a project: "medical-research-app"

2. **Get DSN:**
   - Go to Project Settings → Client Keys (DSN)
   - Copy the DSN URL
   - Add to `.env`: `VITE_SENTRY_DSN=your-dsn-here`

3. **Configure Source Maps:**
   ```bash
   # Install Sentry CLI
   npm install --save-dev @sentry/cli
   
   # Build with source maps
   npm run build
   
   # Upload source maps (requires auth token)
   npx sentry-cli releases files $VERSION upload-sourcemaps ./dist
   ```

4. **Set Up Release Tracking:**
   Add to your CI/CD pipeline:
   ```bash
   export SENTRY_AUTH_TOKEN=your-auth-token
   export VERSION=$(git rev-parse --short HEAD)
   npx sentry-cli releases new $VERSION
   npx sentry-cli releases set-commits --auto $VERSION
   npx sentry-cli releases finalize $VERSION
   ```

### LogRocket Setup

1. **Create Account:**
   - Sign up at [logrocket.com](https://logrocket.com/)
   - Create a new application
   - Note your App ID (e.g., `yourorg/yourapp`)

2. **Configure App:**
   - Add to `.env`: `VITE_LOGROCKET_APP_ID=your-org/your-app`
   - Review privacy settings in LogRocket dashboard

3. **User Identification:**
   ```typescript
   import { identifyLogRocketUser } from './services/logrocket';
   
   // After user login
   identifyLogRocketUser({
     id: user.id,
     name: user.name,
     email: user.email,
     plan: user.subscription.plan,
   });
   ```

### Google Analytics 4 Setup

1. **Create Property:**
   - Go to [Google Analytics](https://analytics.google.com/)
   - Create new property → Web
   - Enter your domain

2. **Get Measurement ID:**
   - Admin → Data Streams → Web
   - Copy Measurement ID (format: `G-XXXXXXXXXX`)
   - Add to `.env`: `VITE_ANALYTICS_TRACKING_ID=G-XXXXXXXXXX`

3. **Configure Data Streams:**
   - Enable "Enhanced Measurement"
   - Set data retention (recommend: 14 months)
   - Configure user data collection settings

### UptimeRobot Setup

1. **Create Account:**
   - Sign up at [uptimerobot.com](https://uptimerobot.com/)
   - Verify email

2. **Add Monitors:**
   - Dashboard → Add New Monitor
   - Monitor Type: HTTP(s)
   - URL: Your production URL
   - Monitoring Interval: 5 minutes (free tier)

3. **Configure Alerts:**
   - My Settings → Alert Contacts
   - Add email/Slack/PagerDuty
   - Assign to monitors

4. **Import Config (Optional):**
   ```bash
   # Use the generated config
   curl -X POST https://api.uptimerobot.com/v2/newMonitor \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "api_key=YOUR_API_KEY" \
     -d "friendly_name=Medical Research App" \
     -d "url=https://yourapp.com" \
     -d "type=1"
   ```

## Dashboard Configuration

### Sentry Dashboard

**Recommended Widgets:**

1. **Error Overview:**
   - Total errors (24h)
   - New issues count
   - Error rate by release

2. **Performance:**
   - P50/P95/P99 response times
   - Slowest transactions
   - Web Vitals (LCP, FID, CLS)

3. **Release Health:**
   - Crash-free users
   - Crash-free sessions
   - Adoption rate

**Create Custom Dashboard:**
```
Dashboards → Create Dashboard
Add Widget → Errors by URL
Filter: url:*search* OR url:*analysis*
```

### LogRocket Dashboard

**Key Views:**

1. **Error Sessions:**
   - Filter: Has error
   - Sort: By frustration score

2. **Search Flow Analysis:**
   - Filter: Event: "search_performed"
   - Watch: User navigation patterns

3. **Funnel Analysis:**
   - Step 1: Page visit
   - Step 2: Search performed
   - Step 3: Article viewed
   - Step 4: Analysis saved

### GA4 Dashboard

**Recommended Reports:**

1. **Acquisition:**
   - User acquisition by channel
   - New vs returning users
   - Session source/medium

2. **Engagement:**
   - Pages and screens
   - Events by name
   - User retention

3. **Custom Events Report:**
   ```
   Configure → Events → Create Event
   Event Name: search_performed
   Parameters: query, result_count
   ```

4. **Medical Research Specific:**
   - Popular search queries
   - Most viewed articles
   - Analysis completion rate
   - Export usage

## Alert Rules

### Sentry Alerts

**High Error Rate:**
```yaml
Name: High Error Rate
Metric: error_rate
Threshold: 5 errors/minute
Window: 5 minutes
Action: Email + Slack
```

**New Issue Spike:**
```yaml
Name: New Issue Spike
Metric: new_issues_count
Threshold: 10 in 1 hour
Window: 1 hour
Action: Email + PagerDuty (critical hours)
```

**Performance Regression:**
```yaml
Name: Slow API Response
Metric: transaction.duration
Threshold: p95 > 2000ms
Filter: transaction:/api/search
Action: Slack notification
```

**Configuration (alerts-config.json):**
```json
{
  "sentry": {
    "alerts": [
      {
        "name": "High Error Rate",
        "metric": "error_rate",
        "threshold": 5,
        "window": "5m",
        "severity": "warning"
      },
      {
        "name": "Critical Error Rate",
        "metric": "error_rate",
        "threshold": 20,
        "window": "5m",
        "severity": "critical"
      }
    ]
  }
}
```

### UptimeRobot Alerts

**Downtime Alert:**
- Trigger: Monitor down
- Notify after: 1 failure
- Contact: Email + Slack

**Slow Response Alert:**
- Trigger: Response time > 5000ms
- Window: 3 consecutive checks
- Contact: Email

### LogRocket Alerts

**User Frustration:**
- Trigger: Rage clicks detected
- Filter: Session duration > 30s
- Action: Review session recording

## On-Call Runbook

### Incident Response Checklist

#### 1. Alert Received - Initial Assessment

```markdown
□ Check alert source (Sentry/UptimeRobot/LogRocket)
□ Identify affected component/service
□ Check current status in dashboard
□ Determine severity (P1/P2/P3)
□ Create incident channel (Slack: #incidents)
```

#### 2. P1 - Critical (Site Down / Major Outage)

```markdown
□ Acknowledge alert within 5 minutes
□ Check status page (if available)
□ Verify in multiple locations (curl from different regions)
□ Check infrastructure (server, database, DNS)
□ If confirmed: Execute rollback plan
□ Post status update to users
□ Escalate to team lead if not resolved in 15 min
```

**Rollback Commands:**
```bash
# Quick rollback
kubectl rollout undo deployment/medical-research-app
# or
git revert HEAD
npm run deploy:production
```

#### 3. P2 - High (Feature Broken / Performance Issues)

```markdown
□ Review Sentry for related errors
□ Check LogRocket for user impact
□ Identify last deployment time
□ Reproduce issue locally if possible
□ Apply hotfix or feature flag disable
□ Monitor for resolution
```

**Feature Flag Disable:**
```typescript
// In your feature flag service
await disableFeature('new-analysis-ui');
```

#### 4. P3 - Medium (Minor Issues / Warnings)

```markdown
□ Log in issue tracker
□ Monitor for 24 hours
□ Schedule fix for next sprint
□ No immediate action required
```

### Common Issues

#### Search API Down

```bash
# Check health endpoint
curl https://api.yourapp.com/health

# Check external APIs
curl https://api.semanticscholar.org/graph/v1/paper/search?query=test

# Check rate limits
redis-cli GET rate_limit:pubmed
```

#### High Error Rate

```bash
# Check Sentry for top issues
# Filter by: is:unresolved release:latest

# Quick triage in Sentry
1. Group by: issue
2. Check: URL patterns
3. Check: Browser/Device breakdown
4. Identify: First seen time
```

#### Slow Performance

```bash
# Check LogRocket for slow sessions
# Filter: duration > 30s AND has_error = false

# Review in Sentry:
# Performance → Web Vitals
# Look for: LCP > 2.5s, FID > 100ms, CLS > 0.1
```

### Escalation Matrix

| Severity | Response Time | Escalation Time | Contact |
|----------|---------------|-----------------|---------|
| P1 - Critical | 5 min | 15 min | Team Lead → CTO |
| P2 - High | 15 min | 1 hour | Team Lead |
| P3 - Medium | 4 hours | 24 hours | Slack channel |

### Communication Templates

**Incident Started:**
```
🚨 INCIDENT: [Brief description]
Severity: [P1/P2/P3]
Impact: [What users are experiencing]
Started: [Time]
Status: Investigating
Channel: #incident-[id]
```

**Status Update:**
```
📊 UPDATE: [Brief description]
Status: [Investigating/Identified/Monitoring/Resolved]
Progress: [What we've found/done]
ETA: [Estimated resolution time]
```

**Incident Resolved:**
```
✅ RESOLVED: [Brief description]
Duration: [X minutes]
Root Cause: [Brief explanation]
Action Items: [Link to post-mortem]
```

## Development Mode

### Disabling Monitoring in Development

All monitoring is automatically disabled in development mode (`import.meta.env.DEV`).

To explicitly control:

```bash
# .env.local
VITE_ANALYTICS_ENABLED=false
VITE_SENTRY_DSN=""
VITE_LOGROCKET_APP_ID=""
```

### Testing Monitoring Locally

```bash
# Enable analytics in development
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_DEBUG=true
npm run dev
```

### Simulating Errors for Testing

```typescript
// Test error boundary
import { useErrorReporter } from './components/ErrorBoundary';

function TestComponent() {
  const { reportError } = useErrorReporter();
  
  const simulateError = () => {
    reportError(new Error('Test error'), {
      component: 'TestComponent',
      action: 'simulate',
    });
  };
  
  return <button onClick={simulateError}>Test Error</button>;
}
```

## Troubleshooting

### Sentry Issues

**No errors appearing:**
```bash
# Check DSN is configured
echo $VITE_SENTRY_DSN

# Verify in browser console
window.Sentry

# Check network tab for sentry.io requests
```

**Source maps not working:**
```bash
# Verify source maps generated
ls -la dist/assets/*.map

# Upload with correct release
npx sentry-cli releases files $VERSION upload-sourcemaps ./dist
```

### LogRocket Issues

**Sessions not recording:**
- Check ad blockers
- Verify App ID format: `org/app`
- Check console for initialization errors

**Privacy concerns:**
- Review DOM sanitization rules
- Check network request sanitization
- Verify no PHI in console logs

### GA4 Issues

**Events not showing:**
- Wait 24-48 hours for initial data
- Check real-time reports for immediate data
- Verify Measurement ID in requests
- Check for ad blockers

### UptimeRobot Issues

**False positives:**
- Increase timeout threshold
- Check from multiple locations
- Verify DNS resolution

## Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [LogRocket Documentation](https://docs.logrocket.com/)
- [Google Analytics 4 Documentation](https://support.google.com/analytics/topic/9143232)
- [UptimeRobot API](https://uptimerobot.com/api/)
- [Web Vitals Guide](https://web.dev/vitals/)

## Support

For monitoring-related issues:
1. Check service status pages
2. Review this runbook
3. Contact service support
4. Escalate to devops team
