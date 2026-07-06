import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, type Location, type To } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { Button } from '@components/ui/Button';
import { useNavigatePage } from '@contexts/SearchContext';
import { api } from '@services/api';

type Mode = 'login' | 'register' | 'forgot';

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-400' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-amber-400' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-400' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const AuthPage: React.FC = () => {
  const { login, register, forgotPassword } = useAuth();
  const setCurrentPage = useNavigatePage();
  const location = useLocation();
  const navigate = useNavigate();
  const fromState = (location.state as { from?: Partial<Location> })?.from;
  const returnTo: To = fromState?.pathname
    ? { pathname: fromState.pathname, search: fromState.search ?? '', hash: fromState.hash ?? '' }
    : '/';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [oauthLoading, setOAuthLoading] = useState<'google' | 'orcid' | null>(null);
  const [oauthConfig, setOauthConfig] = useState<{ google?: boolean; orcid?: boolean }>({});
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  useEffect(() => {
    const configPromise = api.search.getClientConfig?.();
    configPromise?.then((c) => {
      setOauthConfig((c as { oauth?: { google?: boolean; orcid?: boolean } }).oauth || {});
    }).catch(() => {});
  }, []);

  // Surface OAuth errors returned via query param (e.g. ?error=oauth_failed)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('error');
    if (oauthError) {
      setError(decodeURIComponent(oauthError).replace(/_/g, ' '));
      // Clean the URL so the error doesn't persist on refresh
      navigate(location.pathname, { replace: true, state: location.state });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const strength = getPasswordStrength(password);
  const emailError = emailTouched && email && !isValidEmail(email) ? 'Enter a valid email address' : '';
  const passwordError = passwordTouched && mode === 'register' && password && password.length < 8
    ? 'Password must be at least 8 characters'
    : '';

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setSuccess('');
    setEmailTouched(false);
    setPasswordTouched(false);
    setInviteCode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'forgot') {
      if (!isValidEmail(email)) { setError('Enter a valid email address'); return; }
      setLoading(true);
      try {
        await forgotPassword(email);
        setSuccess('If an account exists for that email, a reset link has been sent. Check your inbox.');
      } catch {
        setSuccess('If an account exists for that email, a reset link has been sent. Check your inbox.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!isValidEmail(email)) { setError('Enter a valid email address'); return; }
    if (mode === 'register' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        navigate(returnTo, { replace: true });
      } else {
        const trimmedInviteCode = inviteCode.trim();
        const result = trimmedInviteCode
          ? await register(email, password, name || undefined, trimmedInviteCode)
          : await register(email, password, name || undefined);
        if (result?.message) {
          setSuccess(result.message);
        } else {
          navigate(returnTo, { replace: true });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const startOAuth = (provider: 'google' | 'orcid') => {
    setOAuthLoading(provider);
    window.location.href = `/api/auth/oauth/${provider}/start`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">
            <i className="fas fa-microscope text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
              Signal MD
            </h1>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-indigo-100/50 dark:shadow-slate-900/50 p-8">

          {/* Mode toggle (only for login/register) */}
          {mode !== 'forgot' && (
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1 mb-8">
              <button type="button"
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                onClick={() => switchMode('login')}
              >
                Sign In
              </button>
              <button type="button"
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'register' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                onClick={() => switchMode('register')}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Forgot password header */}
          {mode === 'forgot' && (
            <div className="mb-6">
              <button type="button" onClick={() => switchMode('login')}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors mb-4">
                <i className="fas fa-arrow-left text-xs" /> Back to sign in
              </button>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reset your password</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Enter your email and we'll send you a reset link.
              </p>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                <i className="fas fa-check-circle mt-0.5 shrink-0" />
                {success}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Name (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Jane Smith"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            )}

            {/* Invite code (register only — beta gate) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Invite Code <span className="text-red-400 font-normal">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX-XXXXXX"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono tracking-widest transition-all"
                />
                <p className="mt-1.5 text-xs text-slate-400">Signal MD is currently invite-only. Check your invite email.</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="you@institution.edu"
                className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all ${
                  emailError
                    ? 'border-red-300 dark:border-red-700 focus:ring-red-400'
                    : 'border-gray-200 dark:border-slate-600 focus:ring-indigo-500'
                }`}
              />
              {emailError && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <i className="fas fa-exclamation-circle" /> {emailError}
                </p>
              )}
            </div>

            {/* Password (not shown for forgot mode) */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => switchMode('forgot')}
                      className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    placeholder={mode === 'register' ? 'Minimum 8 characters' : '••••••••'}
                    className={`w-full px-4 py-2.5 pr-10 rounded-xl border bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm transition-all ${
                      passwordError
                        ? 'border-red-300 dark:border-red-700 focus:ring-red-400'
                        : 'border-gray-200 dark:border-slate-600 focus:ring-indigo-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} aria-hidden="true" />
                  </button>
                </div>

                {/* Password strength (register only) */}
                {mode === 'register' && password && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1 h-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            strength.score >= i ? strength.color : 'bg-slate-200 dark:bg-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 dark:text-slate-400 space-x-2">
                        <span className={password.length >= 8 ? 'text-emerald-500' : ''}>
                          <i className={`fas ${password.length >= 8 ? 'fa-check' : 'fa-times'} mr-1`} />8+ chars
                        </span>
                        <span className={/[A-Z]/.test(password) ? 'text-emerald-500' : ''}>
                          <i className={`fas ${/[A-Z]/.test(password) ? 'fa-check' : 'fa-times'} mr-1`} />Uppercase
                        </span>
                        <span className={/[0-9]/.test(password) ? 'text-emerald-500' : ''}>
                          <i className={`fas ${/[0-9]/.test(password) ? 'fa-check' : 'fa-times'} mr-1`} />Number
                        </span>
                      </p>
                      {strength.label && (
                        <span className={`text-xs font-medium ${
                          strength.label === 'Strong' ? 'text-emerald-500'
                          : strength.label === 'Good' ? 'text-yellow-500'
                          : strength.label === 'Fair' ? 'text-amber-500'
                          : 'text-red-400'
                        }`}>{strength.label}</span>
                      )}
                    </div>
                  </div>
                )}

                {passwordError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <i className="fas fa-exclamation-circle" /> {passwordError}
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  <i className="fas fa-exclamation-circle" />
                  {error}
                </p>
              </div>
            )}

            <Button
              type="submit"
              variant="gradient"
              fullWidth
              isLoading={loading}
              className="mt-2"
            >
              {mode === 'login' ? 'Sign In'
                : mode === 'register' ? 'Create Account'
                : 'Send Reset Link'}
            </Button>
          </form>

          {mode !== 'forgot' && (oauthConfig.google || oauthConfig.orcid) && (
            <div className="mt-6 space-y-2">
              <div className="relative text-center">
                <span className="bg-white px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-800">
                  or
                </span>
              </div>
              <div className={`grid grid-cols-1 gap-2 ${oauthConfig.google && oauthConfig.orcid ? 'sm:grid-cols-2' : ''}`}>
                {oauthConfig.google && (
                  <button
                    type="button"
                    disabled={Boolean(oauthLoading)}
                    onClick={() => startOAuth('google')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-60 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-200 dark:hover:bg-red-950/20 dark:hover:border-red-800 dark:hover:text-red-300"
                    aria-label="Continue with Google"
                  >
                    {oauthLoading === 'google' ? (
                      <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                    ) : (
                      <i className="fab fa-google text-red-500" />
                    )}
                    Google
                  </button>
                )}
                {oauthConfig.orcid && (
                  <button
                    type="button"
                    disabled={Boolean(oauthLoading)}
                    onClick={() => startOAuth('orcid')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-200 dark:hover:bg-emerald-950/20 dark:hover:border-emerald-800 dark:hover:text-emerald-300"
                    aria-label="Continue with ORCID"
                  >
                    {oauthLoading === 'orcid' ? (
                      <span className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                    ) : (
                      <i className="fab fa-orcid text-emerald-600" />
                    )}
                    ORCID
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 text-center">
            <button
              type="button"
              onClick={() => setCurrentPage('search')}
              className="text-sm text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
            >
              Continue without signing in →
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
          By signing in you agree to our{' '}
          <button type="button" onClick={() => navigate('/legal/terms')}
            className="underline hover:text-indigo-500 transition-colors">Terms</button>
          {' '}and{' '}
          <button type="button" onClick={() => navigate('/legal/privacy')}
            className="underline hover:text-indigo-500 transition-colors">Privacy Policy</button>.
        </p>
      </div>
    </div>
  );
};
