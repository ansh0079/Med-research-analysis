import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@components/ui/Button';

export const LegalPrivacyPage: React.FC = () => (
  <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] px-4 py-10 pb-32">
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <Link to="/">
          <Button variant="ghost">← Home</Button>
        </Link>
      </div>
      <p className="text-sm text-[var(--c-text-muted)]">
        Last updated: {new Date().toISOString().slice(0, 10)}. Template only — align with your jurisdiction and counsel.
      </p>
      <section className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-[var(--c-text)]">
        <h2 className="text-lg font-semibold">1. What we process</h2>
        <p>
          We may process account identifiers (email, name), session identifiers, search queries you submit, usage
          analytics you opt into, and technical logs (IP, user agent) for security and operations. Third-party AI and
          literature providers process prompts according to their policies when you use those features.
        </p>
        <h2 className="text-lg font-semibold">2. PHI &amp; sensitive data</h2>
        <p>
          <strong>
            This product is not intended for entering patient-identifiable or other PHI.
          </strong>{' '}
          If you are a covered entity or business associate in the U.S., do not use the hosted service with PHI unless
          you have a Business Associate Agreement (BAA) or equivalent in place with the operator of your deployment.
        </p>
        <h2 className="text-lg font-semibold">3. Cookies &amp; storage</h2>
        <p>
          Authentication may use HTTP-only cookies. The app may store non-sensitive UI preferences in browser storage
          (e.g. theme). See your browser settings to clear storage.
        </p>
        <h2 className="text-lg font-semibold">4. Retention</h2>
        <p>
          Retention periods depend on deployment configuration (e.g. audit logs, search history, saved articles). Your
          administrator should document retention and deletion procedures.
        </p>
        <h2 className="text-lg font-semibold">5. Your rights</h2>
        <p>
          Depending on your region (GDPR, UK GDPR, CCPA, etc.), you may have rights to access, correct, or delete personal
          data. Contact the operator of this deployment to exercise those rights.
        </p>
        <h2 className="text-lg font-semibold">6. Billing audit</h2>
        <p>
          We may maintain audit records related to subscriptions and premium access (e.g. paywall checks) to resolve
          billing disputes and meet compliance obligations.
        </p>
      </section>
    </div>
  </div>
);
