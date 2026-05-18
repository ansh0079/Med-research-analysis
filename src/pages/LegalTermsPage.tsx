import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@components/ui/Button';

export const LegalTermsPage: React.FC = () => (
  <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] px-4 py-10">
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">Terms of Use</h1>
        <Link to="/">
          <Button variant="ghost">← Home</Button>
        </Link>
      </div>
      <p className="text-sm text-[var(--c-text-muted)]">
        Last updated: {new Date().toISOString().slice(0, 10)}. This is a template for a research-assistant product — have
        counsel review before commercial use.
      </p>
      <section className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-[var(--c-text)]">
        <h2 className="text-lg font-semibold">1. Service</h2>
        <p>
          MedResearch·AI provides tools to search scholarly literature, summarize evidence themes, and support research
          workflows. It is <strong>not</strong> a medical device, diagnostic service, or substitute for professional
          clinical judgement.
        </p>
        <h2 className="text-lg font-semibold">2. Acceptable use</h2>
        <p>
          You agree not to misuse the service, attempt unauthorized access, or scrape the service in bulk beyond fair
          use. You must not submit protected health information (PHI) or other regulated personal data except as
          permitted by law and your agreements with us.
        </p>
        <h2 className="text-lg font-semibold">3. No warranty</h2>
        <p>
          The service and third-party data sources are provided &quot;as is&quot;. We do not warrant accuracy,
          completeness, or fitness for a particular purpose. Primary sources and local guidelines prevail over any
          AI-assisted summary.
        </p>
        <h2 className="text-lg font-semibold">4. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, we are not liable for indirect or consequential damages arising from
          use of the service.
        </p>
        <h2 className="text-lg font-semibold">5. Accounts &amp; billing</h2>
        <p>
          Paid features may require an active subscription. Fees, taxes, and refund policies will be stated at checkout
          or in an order form. We may log billing- and access-related events for audit and dispute resolution.
        </p>
        <h2 className="text-lg font-semibold">6. Contact</h2>
        <p>
          For legal or privacy questions, contact your deployment operator using the address published for your
          environment.
        </p>
      </section>
    </div>
  </div>
);
