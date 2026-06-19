import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@services/api';
import { useAuth } from '@contexts/AuthContext';
import { Button } from '@components/ui/Button';

interface PlanInfo {
  id: string; name: string; amount: number; currency: string;
  interval: string; features: string[]; available: boolean;
}

interface BillingStatus {
  status: string; plan: string; role: string;
  currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean;
  trialStartedAt: string | null; trialEndsAt: string | null; hasUsedTrial: boolean;
  stripeConfigured: boolean; plans: PlanInfo[];
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:   { label: 'Active',      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  trialing: { label: 'Trial',       cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  past_due: { label: 'Past due',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  canceled: { label: 'Cancelled',   cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
  free:     { label: 'Free',        cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
};

interface UsageMeter {
  limitKey: string;
  label: string;
  used: number;
  cap: number | null;
  unlimited: boolean;
  percentUsed: number;
  nearLimit: boolean;
  atLimit: boolean;
  resetsAt: string;
}

interface UsageSummary {
  plan: string;
  planLabel: string;
  yearMonth: string;
  meters: {
    aiAnalysesPerMonth: UsageMeter;
    synthesisPerMonth: UsageMeter;
    searchesPerDay: UsageMeter;
  };
}

function UsageMeterCard({ meter, upgradeHref = '/billing' }: { meter: UsageMeter; upgradeHref?: string }) {
  if (meter.unlimited) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-1">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{meter.label}</p>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Unlimited</p>
      </div>
    );
  }

  const pct = Math.min(100, meter.percentUsed);
  const barColor = meter.atLimit ? 'bg-red-500' : meter.nearLimit ? 'bg-amber-500' : 'bg-indigo-500';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{meter.label}</p>
        <span className="text-sm font-black text-slate-900 dark:text-white">{meter.used}/{meter.cap}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {meter.nearLimit && !meter.atLimit && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          You&apos;re at {pct}% of your monthly limit.{' '}
          <a href={upgradeHref} className="font-bold underline">Upgrade for more</a>
        </p>
      )}
      {meter.atLimit && (
        <p className="text-xs text-red-700 dark:text-red-300">
          Limit reached. Resets {new Date(meter.resetsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.{' '}
          <a href={upgradeHref} className="font-bold underline">Upgrade plan</a>
        </p>
      )}
    </div>
  );
}

export const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [billing, setBilling] = React.useState<BillingStatus | null>(null);
  const [usage, setUsage] = React.useState<UsageSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [checkoutLoading, setCheckoutLoading] = React.useState<string | null>(null);
  const [portalLoading, setPortalLoading] = React.useState(false);
  const [trialLoading, setTrialLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [nowMs] = React.useState(() => Date.now());

  const defaultBilling: BillingStatus = {
    status: 'free', plan: 'free', role: 'user',
    currentPeriodEnd: null, cancelAtPeriodEnd: false,
    trialStartedAt: null, trialEndsAt: null, hasUsedTrial: false,
    stripeConfigured: false, plans: [],
  };

  const justSucceeded = searchParams.get('success') === '1';
  const justCancelled = searchParams.get('cancelled') === '1';

  React.useEffect(() => {
    Promise.all([
      api.getBillingStatus(),
      api.getBillingUsage().catch(() => null),
    ])
      .then(([status, usageData]) => {
        setBilling(status);
        setUsage(usageData as UsageSummary | null);
      })
      .catch(() => setError('Failed to load billing information'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (planId: string) => {
    setCheckoutLoading(planId);
    setError(null);
    try {
      const { url } = await api.createCheckoutSession(planId);
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const { url } = await api.openBillingPortal();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
      setPortalLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setError(null);
    try {
      await api.startTrial();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start trial');
      setTrialLoading(false);
    }
  };

  const isActive = billing?.status === 'active' || billing?.status === 'trialing';
  const badge = STATUS_BADGE[billing?.status ?? 'free'] ?? STATUS_BADGE.free;
  const trialDaysLeft = billing?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(billing.trialEndsAt).getTime() - nowMs) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen aurora-bg">
      <div className="max-w-4xl mx-auto px-4 pt-[calc(var(--nav-h)+2rem)] pb-16 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Billing & Plans</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your subscription and access premium features.
          </p>
        </div>

        {/* Success / cancelled banners */}
        {justSucceeded && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl animate-fade-in">
            <i className="fas fa-check-circle text-emerald-500" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              Payment successful! Your plan has been upgraded. It may take a moment to reflect.
            </p>
          </div>
        )}
        {justCancelled && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl animate-fade-in">
            <i className="fas fa-info-circle text-amber-500" />
            <p className="text-sm text-amber-700 dark:text-amber-300">Checkout was cancelled. You have not been charged.</p>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl">
            <i className="fas fa-exclamation-circle text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="neo-card rounded-2xl p-8 flex items-center justify-center gap-3">
            <div className="spinner" />
            <span className="text-sm text-slate-400">Loading billing info…</span>
          </div>
        ) : billing && (
          <>
            {/* Current plan card */}
            <div className="neo-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Current plan</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white capitalize">
                    {billing.plan === 'free' ? 'Free' : billing.plan}
                  </h2>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                {billing.trialEndsAt && billing.status === 'trialing' && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left in your trial
                  </p>
                )}
                {billing.currentPeriodEnd && (!billing.trialEndsAt || billing.status !== 'trialing') && (
                  <p className="text-xs text-slate-400">
                    {billing.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
                    {new Date(billing.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {user?.email && (
                  <p className="text-xs text-slate-400">{user.email}</p>
                )}
              </div>
              {isActive && (
                <button
                  type="button"
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {portalLoading ? <div className="spinner" /> : <i className="fas fa-credit-card text-xs" />}
                  Manage subscription
                </button>
              )}
            </div>

            {usage && (
              <div className="neo-card rounded-2xl p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Usage this month</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Track AI analyses, synthesis, and daily searches on your {usage.planLabel} plan.
                  </p>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <UsageMeterCard meter={usage.meters.aiAnalysesPerMonth} />
                  <UsageMeterCard meter={usage.meters.synthesisPerMonth} />
                  <UsageMeterCard meter={usage.meters.searchesPerDay} />
                </div>
              </div>
            )}

            {/* Stripe not configured warning */}
            {!billing.stripeConfigured && (
              <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl">
                <i className="fas fa-triangle-exclamation text-amber-500 text-sm mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <p className="font-semibold">Stripe not configured</p>
                  <p>Add <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">STRIPE_SECRET_KEY</code>, <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">STRIPE_RESEARCHER_PRICE_ID</code>, <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">STRIPE_PRO_PRICE_ID</code>, and <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">STRIPE_TEAM_PRICE_ID</code> to your <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">.env</code> file to enable payments.</p>
                </div>
              </div>
            )}

            {/* Plan cards */}
            <div className="grid md:grid-cols-3 gap-5">
              {billing.plans.map((plan) => {
                const isCurrent = billing.plan === plan.id && isActive;
                const isPopular = plan.id === 'pro';
                const isResearcher = plan.id === 'researcher';
                return (
                  <div
                    key={plan.id}
                    className={`neo-card rounded-2xl p-6 flex flex-col gap-5 relative ${isCurrent ? 'ring-2 ring-indigo-500/50' : ''}`}
                  >
                    {isResearcher && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 bg-slate-700 text-white text-[10px] font-black rounded-full uppercase tracking-wide">
                          Best value
                        </span>
                      </div>
                    )}
                    {isPopular && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-black rounded-full uppercase tracking-wide shadow-lg shadow-indigo-500/30">
                          Most popular
                        </span>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-full uppercase tracking-wide">
                          Current plan
                        </span>
                      </div>
                    )}

                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">
                          ${(plan.amount / 100).toFixed(0)}
                        </span>
                        <span className="text-sm text-slate-400">/ {plan.interval}</span>
                      </div>
                    </div>

                    <ul className="space-y-2 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <i className="fas fa-check text-emerald-500 text-[10px] mt-1 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center text-sm font-semibold text-slate-400">
                        Current plan
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={!billing.stripeConfigured || !plan.available || checkoutLoading !== null}
                        className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2
                          ${isPopular
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/25'
                            : 'bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-100 text-white dark:text-slate-900'
                          }`}
                      >
                        {checkoutLoading === plan.id
                          ? <><div className="spinner" /> Redirecting…</>
                          : !plan.available
                            ? 'Coming soon'
                            : `Upgrade to ${plan.name}`
                        }
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Trial CTA for free users who haven't used trial */}
            {!isActive && !billing.hasUsedTrial && (
              <div className="neo-card rounded-2xl p-6 text-center space-y-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Start your 14-day Pro trial</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  No credit card required. Get full access to AI synthesis, case mode, systematic review tools, and more.
                </p>
                <Button
                  variant="gradient"
                  size="md"
                  isLoading={trialLoading}
                  onClick={handleStartTrial}
                  className="mx-auto"
                >
                  Start free trial
                </Button>
              </div>
            )}

            {/* Free tier reminder */}
            {!isActive && (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                Free tier includes: multi-source search, saved articles, and basic search history.
                Upgrade for unlimited AI features.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
