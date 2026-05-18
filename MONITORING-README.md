# Monitoring Quick Start

Quick reference for setting up monitoring on the Medical Research Intelligence Platform.

## Run Setup Script

```bash
node scripts/setup-monitoring.js
```

## Free Tier Limits

| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Sentry** | 5,000 errors/month | Error tracking & performance |
| **LogRocket** | 1,000 sessions/month | Session replay & UX analysis |
| **GA4** | Unlimited events | Usage analytics & funnels |
| **UptimeRobot** | 50 monitors | Uptime monitoring |

## Environment Variables

Add to your `.env` file:

```bash
# Sentry
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_SENTRY_ORG=your-org
VITE_SENTRY_PROJECT=medical-research-app

# LogRocket
VITE_LOGROCKET_APP_ID=your-org/your-app

# Analytics
VITE_ANALYTICS_PROVIDER=ga4
VITE_ANALYTICS_TRACKING_ID=G-XXXXXXXXXX
VITE_ANALYTICS_ENABLED=true
```

## Quick Commands

```bash
# Test error tracking (dev mode)
VITE_SENTRY_DSN=xxx VITE_ANALYTICS_DEBUG=true npm run dev

# Build with monitoring
npm run build

# Verify production build
npm run preview
```

## Key Files

- `src/services/analytics.ts` - Analytics tracking service
- `src/services/sentry.ts` - Error tracking
- `src/services/logrocket.ts` - Session replay
- `src/hooks/useAnalytics.ts` - React analytics hooks
- `src/components/ErrorBoundary.tsx` - Error catching
- `MONITORING.md` - Full documentation

## Usage Examples

### Track Events

```tsx
import { useAnalytics } from './hooks/useAnalytics';

function SearchComponent() {
  const { trackSearch, trackEvent } = useAnalytics();
  
  const handleSearch = (query) => {
    trackSearch(query, { source: 'homepage' });
  };
  
  return <SearchBar onSearch={handleSearch} />;
}
```

### Error Boundary

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### Manual Error Reporting

```tsx
import { useErrorReporter } from './components/ErrorBoundary';

function MyComponent() {
  const { reportError } = useErrorReporter();
  
  const handleAction = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      reportError(error, { component: 'MyComponent' });
    }
  };
}
```

## Disabling in Development

Monitoring is automatically disabled in development mode.

To explicitly disable:

```bash
VITE_ANALYTICS_ENABLED=false npm run dev
```

## Dashboards

After setup, configure dashboards at:

- **Sentry**: https://sentry.io/organizations/your-org/
- **LogRocket**: https://app.logrocket.com/your-app/
- **GA4**: https://analytics.google.com/
- **UptimeRobot**: https://uptimerobot.com/dashboard

## Need Help?

See `MONITORING.md` for complete documentation.
