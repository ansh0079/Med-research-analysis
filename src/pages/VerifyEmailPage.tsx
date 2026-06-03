import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/Button';
import { api } from '@services/api';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing verification link.');
      setLoading(false);
      return;
    }
    api.verifyEmail(token)
      .then(() => {
        setSuccess(true);
        setTimeout(() => navigate('/search'), 2000);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Verification failed');
      })
      .finally(() => setLoading(false));
  }, [token, navigate]);

  return (
    <div className="min-h-screen aurora-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm neo-card rounded-2xl p-8 space-y-6 text-center">
        <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <i className="fas fa-envelope text-white text-sm" />
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Email verification</h1>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <div className="spinner" />
            <p className="text-sm">Verifying your email…</p>
          </div>
        )}

        {!loading && success && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
              <i className="fas fa-check-circle" />
              <p className="text-sm font-semibold">Email verified successfully!</p>
            </div>
            <p className="text-xs text-slate-400">Redirecting…</p>
          </div>
        )}

        {!loading && error && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
              <i className="fas fa-exclamation-circle" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate('/auth')}>
              Go to sign in
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
