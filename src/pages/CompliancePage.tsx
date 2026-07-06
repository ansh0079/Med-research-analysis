import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@components/ui/Button';
import { useAuth } from '@contexts/AuthContext';
import { api } from '@services/api';

type ChecklistStatus = true | false | 'partial';

// Compliance checklist items for HIPAA/institutional deployments
const CHECKLIST: Array<{ done: ChecklistStatus; label: string }> = [
  { done: true,  label: 'End-to-end HTTPS / TLS 1.2+ enforced' },
  { done: true,  label: 'JWT-based auth with httpOnly cookies (XSS-hardened)' },
  { done: true,  label: 'CSRF protection on all state-changing endpoints' },
  { done: true,  label: 'SSRF guard blocks private-IP fetches' },
  { done: true,  label: 'Parameterised SQL via Kysely ORM (no injection surface)' },
  { done: true,  label: 'Audit log: every auth event, data change, and admin action recorded' },
  { done: true,  label: 'Rate limiting on all endpoints (Redis-backed in production)' },
  { done: true,  label: 'Helmet security headers (CSP, HSTS, X-Frame-Options)' },
  { done: true,  label: 'Self-hostable: deploy on your own servers — data never leaves your network' },
  { done: true,  label: 'No PHI notice shown to users at data-entry points' },
  { done: 'partial', label: 'Business Associate Agreement (BAA) — available for Institution tier on request' },
  { done: 'partial', label: 'SAML/SSO — Google OAuth active; enterprise IdP federation on Institution roadmap' },
  { done: false, label: 'SOC 2 Type II audit — not yet initiated' },
  { done: false, label: 'HITRUST certification — not yet initiated' },
];

const STATUS_ICON: Record<string, { icon: string; color: string; label: string }> = {
  'true':    { icon: 'fa-check-circle', color: 'text-emerald-500', label: 'Complete' },
  'partial': { icon: 'fa-circle-half-stroke', color: 'text-amber-500', label: 'Partial' },
  'false':   { icon: 'fa-circle', color: 'text-slate-300 dark:text-slate-600', label: 'Planned' },
};

function AuditLogExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const blob = await api.knowledge.exportAuditLog({ dateFrom, dateTo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoke on next tick so the click has time to resolve.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">From date</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">To date</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      <Button type="button" size="sm" isLoading={exporting} onClick={handleExport}>
        <i className="fas fa-download mr-1.5" /> Export audit log (CSV)
      </Button>
      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        Exports up to 10,000 records. Includes action, resource, user, IP address, and timestamp. Suitable for HIPAA access log requirements.
      </p>
    </div>
  );
}

export const CompliancePage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] px-4 py-10 pb-32">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Security & Compliance</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Architecture overview, HIPAA considerations, and institutional deployment guidance.
            </p>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm">← Home</Button>
          </Link>
        </div>

        {/* PHI notice */}
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-5 space-y-2">
          <div className="flex items-start gap-3">
            <i className="fas fa-triangle-exclamation text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Not a clinical decision support tool</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Signal MD is a research acceleration platform, not a clinical decision support system. AI-generated outputs must not be used as a substitute for clinical judgement. Do not enter patient-identifiable data (PHI) in the hosted service.
              </p>
            </div>
          </div>
        </div>

        {/* Self-hosting for HIPAA */}
        <div className="neo-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <i className="fas fa-server text-indigo-500 text-sm" /> HIPAA & Institutional Deployment
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            For institutions operating under HIPAA or equivalent regulations, we recommend the <strong>self-hosted Institution tier</strong>. Your deployment runs on your own infrastructure — search queries, AI prompts, and outputs never transit third-party servers outside your network.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: 'fa-building-shield', label: 'Self-hosted', desc: 'Deploy on your own servers or private cloud' },
              { icon: 'fa-file-contract', label: 'BAA available', desc: 'Business Associate Agreement for covered entities' },
              { icon: 'fa-lock', label: 'Data sovereignty', desc: 'Queries and outputs stay within your network' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <i className={`fas ${item.icon} text-indigo-500 mb-2 block`} />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              To request a BAA or discuss an institutional deployment, email <a href="mailto:compliance@medresearch.ai" className="text-indigo-600 dark:text-indigo-400 hover:underline">compliance@medresearch.ai</a> or contact us via the billing page.
            </p>
          </div>
        </div>

        {/* Security checklist */}
        <div className="neo-card rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <i className="fas fa-shield-halved text-emerald-500 text-sm" /> Security Controls
          </h2>
          <div className="space-y-2.5">
            {CHECKLIST.map((item) => {
              const s = STATUS_ICON[String(item.done)];
              return (
                <div key={item.label} className="flex items-start gap-3">
                  <i className={`fas ${s.icon} ${s.color} mt-0.5 shrink-0 text-sm`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{item.label}</p>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider shrink-0 ${s.color}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            Controls marked "Planned" are on the Institution-tier roadmap. Status is updated with each major release.
          </p>
        </div>

        {/* Data handling */}
        <div className="neo-card rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <i className="fas fa-database text-sky-500 text-sm" /> Data Handling
          </h2>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p><strong>What we store:</strong> Account identifiers (email, hashed password), search queries, saved articles, learning progress, and security audit events. We do not store the full text of papers — only metadata and your annotations.</p>
            <p><strong>AI providers:</strong> In the hosted service, search queries and article abstracts are sent to Gemini or Mistral for synthesis. In the self-hosted service, you control which AI providers are used and their data retention policies.</p>
            <p><strong>Data deletion:</strong> You can delete your account and all associated data at any time from Settings → Danger Zone. Admin exports are available for institutional data portability.</p>
            <p><strong>Retention:</strong> Audit logs are retained for 90 days by default in the hosted service. Self-hosted deployments can configure their own retention policies.</p>
          </div>
        </div>

        {/* Audit log export — admin only */}
        {isAdmin && (
          <div className="neo-card rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <i className="fas fa-scroll text-violet-500 text-sm" /> Audit Log Export
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded-full">Admin</span>
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Export a CSV of all recorded audit events for compliance reporting, HIPAA access log requirements, or incident investigation.
            </p>
            <AuditLogExport />
          </div>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-4 text-sm">
          <Link to="/legal/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">Privacy Policy</Link>
          <Link to="/legal/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline">Terms of Service</Link>
          <a href="mailto:compliance@medresearch.ai" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Contact for BAA / institutional queries
          </a>
        </div>
      </div>
    </div>
  );
};
