import React, { useEffect, useState } from 'react';
import { api } from '@services/api';
import type { CpdSession, CpdSummary, CpdActivityType, PortfolioReflection } from '@types';
import { DailyReviewQueue } from '@components/learning/DailyReviewQueue';

const CPD_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  quiz:      { label: 'Quiz',       color: 'bg-indigo-500',  icon: 'fa-brain' },
  synthesis: { label: 'Evidence',   color: 'bg-violet-500',  icon: 'fa-flask' },
  case:      { label: 'Case',       color: 'bg-emerald-500', icon: 'fa-stethoscope' },
  search:    { label: 'Search',     color: 'bg-sky-500',     icon: 'fa-search' },
  study_run: { label: 'Topic Run',  color: 'bg-rose-500',    icon: 'fa-play-circle' },
  manual:    { label: 'Manual',     color: 'bg-slate-500',   icon: 'fa-pencil-alt' },
};

const REFLECTION_STATUSES = ['draft', 'discussed', 'exported', 'submitted'] as const;
type ReflectionStatus = typeof REFLECTION_STATUSES[number];

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export function LearningDashboardCpdTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<CpdSummary | null>(null);
  const [sessions, setSessions] = useState<CpdSession[]>([]);
  const [reflections, setReflections] = useState<PortfolioReflection[]>([]);
  const [selectedReflectionIds, setSelectedReflectionIds] = useState<number[]>([]);
  const [editingReflection, setEditingReflection] = useState<PortfolioReflection | null>(null);
  const [reflectionForm, setReflectionForm] = useState<Partial<PortfolioReflection>>({});
  const [reflectionSaveStatus, setReflectionSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loading, setLoading] = useState(true);
  const [logForm, setLogForm] = useState<{ activityType: CpdActivityType; topic: string; durationMinutes: number; notes: string }>({
    activityType: 'manual', topic: '', durationMinutes: 30, notes: '',
  });
  const [logStatus, setLogStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [exporting, setExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([
      api.getCpdSummary(year),
      api.getCpdSessions({ startDate: `${year}-01-01`, endDate: `${year}-12-31`, limit: 100 }),
      api.getPortfolioReflections({ limit: 50 }),
    ]).then(([{ summary: sum }, { sessions: sess }, { reflections: refs }]) => {
      if (cancelled) return;
      setSummary(sum);
      setSessions(sess);
      setReflections(refs);
      setSelectedReflectionIds((ids) => ids.filter((id) => refs.some((r) => r.id === id)));
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year]);

  const refreshData = async () => {
    const [{ summary: sum }, { sessions: sess }, { reflections: refs }] = await Promise.all([
      api.getCpdSummary(year),
      api.getCpdSessions({ startDate: `${year}-01-01`, endDate: `${year}-12-31`, limit: 100 }),
      api.getPortfolioReflections({ limit: 50 }),
    ]);
    setSummary(sum);
    setSessions(sess);
    setReflections(refs);
    setSelectedReflectionIds((ids) => ids.filter((id) => refs.some((r) => r.id === id)));
  };

  const handleManualLog = async () => {
    if (!logForm.topic.trim() || logForm.durationMinutes < 1) return;
    setLogStatus('saving');
    try {
      await api.logCpdSession({ ...logForm, source: 'manual' });
      await refreshData();
      setLogForm((f) => ({ ...f, topic: '', notes: '' }));
      setLogStatus('saved');
      setTimeout(() => setLogStatus('idle'), 2000);
    } catch {
      setLogStatus('error');
    }
  };

  const handleExport = () => {
    if (!summary) return;
    setExporting(true);
    const rows = sessions.map((s) => `
      <tr>
        <td>${new Date(s.createdAt).toLocaleDateString()}</td>
        <td>${CPD_TYPE_META[s.activityType]?.label ?? s.activityType}</td>
        <td style="text-transform:capitalize">${s.topic}</td>
        <td>${s.durationMinutes} min</td>
        <td>${s.questionCount ?? '—'}</td>
        <td>${s.accuracyPct != null ? `${s.accuracyPct}%` : '—'}</td>
        <td>${s.notes ?? ''}</td>
      </tr>`).join('');
    const byTypeHtml = Object.entries(summary.byType).filter(([, v]) => v.minutes > 0).map(([t, v]) =>
      `<div class="stat"><div class="val">${(v.minutes / 60).toFixed(1)}</div><div class="lbl">${CPD_TYPE_META[t]?.label ?? t}</div></div>`
    ).join('');
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>CPD Record ${year}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:960px;margin:40px auto;color:#1e293b}
  h1{font-size:1.5rem}h2{font-size:1rem;color:#64748b;margin-top:1.5rem}
  .summary{display:flex;gap:2rem;margin:1rem 0;flex-wrap:wrap}
  .stat{text-align:center}.stat .val{font-size:2rem;font-weight:900;color:#4f46e5}
  .stat .lbl{font-size:.75rem;color:#94a3b8;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;margin-top:1rem;font-size:.8rem}
  th{background:#f1f5f9;text-align:left;padding:.5rem;border-bottom:2px solid #e2e8f0}
  td{padding:.4rem .5rem;border-bottom:1px solid #f1f5f9}
  .footer{margin-top:2rem;font-size:.7rem;color:#94a3b8}
  @media print{body{margin:20px}}
</style></head><body>
<h1>CPD / CME Record — ${year}</h1>
<div class="summary">
  <div class="stat"><div class="val">${summary.totalHours.toFixed(1)}</div><div class="lbl">Total hours</div></div>
  ${byTypeHtml}
</div>
<h2>Activity log (${sessions.length} entries)</h2>
<table><thead><tr><th>Date</th><th>Type</th><th>Topic</th><th>Duration</th><th>Questions</th><th>Accuracy</th><th>Notes</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="footer">Generated ${new Date().toLocaleString()} · MedResearch Intelligence Platform</p>
</body></html>`;
    downloadHtml(`cpd-record-${year}.html`, html);
    setExporting(false);
  };

  const handleExportPdf = async () => {
    if (!summary || sessions.length === 0) return;
    setPdfExporting(true);
    try {
      const blob = await api.downloadCpdPdf(year);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cpd-record-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Could not generate PDF');
    } finally {
      setPdfExporting(false);
    }
  };

  const handlePortfolioBundleExport = () => {
    if (!summary) return;
    setExporting(true);
    const bundleReflections = selectedReflectionIds.length > 0
      ? reflections.filter((r) => selectedReflectionIds.includes(r.id))
      : reflections;
    const activityRows = sessions.map((s) => `
      <tr>
        <td>${escapeHtml(new Date(s.createdAt).toLocaleDateString())}</td>
        <td>${escapeHtml(CPD_TYPE_META[s.activityType]?.label ?? s.activityType)}</td>
        <td>${escapeHtml(s.topic)}</td>
        <td>${escapeHtml(s.durationMinutes)} min</td>
        <td>${escapeHtml(s.questionCount ?? '-')}</td>
        <td>${escapeHtml(s.accuracyPct != null ? `${s.accuracyPct}%` : '-')}</td>
        <td>${escapeHtml(s.notes ?? '')}</td>
      </tr>`).join('');
    const reflectionBlocks = bundleReflections.map((r) => `
      <section class="reflection">
        <h3>${escapeHtml(r.reflectionType)}: ${escapeHtml(r.topic)}</h3>
        <p class="meta">${escapeHtml(r.sourceType)} | ${escapeHtml(r.status)} | updated ${escapeHtml(new Date(r.updatedAt).toLocaleDateString())}</p>
        <h4>What happened</h4><p>${escapeHtml(r.whatHappened)}</p>
        <h4>What I learned</h4><p>${escapeHtml(r.whatILearned)}</p>
        <h4>What I will change</h4><p>${escapeHtml(r.whatIWillChange)}</p>
        <h4>Evidence used</h4><p>${escapeHtml(r.evidenceUsed)}</p>
        <h4>Supervisor discussion</h4><p>${escapeHtml(r.supervisorDiscussion)}</p>
      </section>`).join('');
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>ARCP Evidence Bundle ${year}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:980px;margin:40px auto;color:#1e293b;line-height:1.45}
  h1{font-size:1.6rem}h2{font-size:1.05rem;color:#475569;margin-top:1.75rem;border-bottom:1px solid #e2e8f0;padding-bottom:.35rem}
  h3{font-size:1rem;margin-bottom:.15rem}h4{font-size:.78rem;text-transform:uppercase;color:#64748b;margin:.9rem 0 .2rem}
  .summary{display:flex;gap:2rem;margin:1rem 0;flex-wrap:wrap}.stat .val{font-size:2rem;font-weight:900;color:#4f46e5}.stat .lbl{font-size:.75rem;color:#94a3b8;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;margin-top:1rem;font-size:.8rem}th{background:#f1f5f9;text-align:left;padding:.5rem;border-bottom:2px solid #e2e8f0}td{padding:.4rem .5rem;border-bottom:1px solid #f1f5f9;vertical-align:top}
  .reflection{break-inside:avoid;border:1px solid #e2e8f0;border-radius:10px;padding:1rem;margin:.8rem 0}.reflection p{white-space:pre-wrap;font-size:.84rem}.meta{color:#64748b;font-size:.76rem}
  .footer{margin-top:2rem;font-size:.7rem;color:#94a3b8}@media print{body{margin:20px}.reflection{border-color:#cbd5e1}}
</style></head><body>
<h1>ARCP / Appraisal Evidence Bundle - ${year}</h1>
<div class="summary">
  <div class="stat"><div class="val">${summary.totalHours.toFixed(1)}</div><div class="lbl">CPD hours</div></div>
  <div class="stat"><div class="val">${sessions.length}</div><div class="lbl">CPD activities</div></div>
  <div class="stat"><div class="val">${bundleReflections.length}</div><div class="lbl">Reflection drafts</div></div>
</div>
<h2>CPD activity log</h2>
<table><thead><tr><th>Date</th><th>Type</th><th>Topic</th><th>Duration</th><th>Questions</th><th>Accuracy</th><th>Notes</th></tr></thead>
<tbody>${activityRows || '<tr><td colspan="7">No CPD activities recorded.</td></tr>'}</tbody></table>
<h2>Structured reflection drafts</h2>
${reflectionBlocks || '<p>No reflection drafts saved yet.</p>'}
<p class="footer">Generated ${escapeHtml(new Date().toLocaleString())} | MedResearch Intelligence Platform</p>
</body></html>`;
    downloadHtml(`arcp-evidence-bundle-${year}.html`, html);
    setExporting(false);
  };

  const openReflectionEditor = (reflection: PortfolioReflection) => {
    setEditingReflection(reflection);
    setReflectionForm({ ...reflection });
    setReflectionSaveStatus('idle');
  };

  const updateReflectionField = (field: keyof PortfolioReflection, value: string) => {
    setReflectionForm((form) => ({ ...form, [field]: value }));
  };

  const saveReflectionEdit = async () => {
    if (!editingReflection) return;
    setReflectionSaveStatus('saving');
    try {
      const { reflection } = await api.updatePortfolioReflection(editingReflection.id, {
        reflectionType: reflectionForm.reflectionType as 'CBD' | 'mini-CEX' | 'DOPS',
        topic: String(reflectionForm.topic || ''),
        whatHappened: String(reflectionForm.whatHappened || ''),
        whatILearned: String(reflectionForm.whatILearned || ''),
        whatIWillChange: String(reflectionForm.whatIWillChange || ''),
        evidenceUsed: String(reflectionForm.evidenceUsed || ''),
        supervisorDiscussion: String(reflectionForm.supervisorDiscussion || ''),
        status: String(reflectionForm.status || 'draft') as ReflectionStatus,
      });
      setReflections((items) => items.map((item) => item.id === reflection.id ? reflection : item));
      setEditingReflection(reflection);
      setReflectionForm({ ...reflection });
      setReflectionSaveStatus('saved');
      setTimeout(() => setReflectionSaveStatus('idle'), 1800);
    } catch {
      setReflectionSaveStatus('error');
    }
  };

  const quickSetReflectionStatus = async (reflection: PortfolioReflection, status: ReflectionStatus) => {
    try {
      const { reflection: updated } = await api.updatePortfolioReflection(reflection.id, { status });
      setReflections((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch {
      // Keep card state unchanged if save fails.
    }
  };

  const toggleBundleReflection = (id: number) => {
    setSelectedReflectionIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  const statusCounts = REFLECTION_STATUSES.map((status) => ({
    status,
    count: reflections.filter((r) => r.status === status).length,
  }));
  const journeyTopics = Array.from(new Set([
    ...sessions.map((s) => s.topic).filter(Boolean),
    ...reflections.map((r) => r.topic).filter(Boolean),
  ])).slice(0, 4);
  const latestReflection = reflections[0];
  const weakReflectionTopics = reflections
    .filter((r) => /weak|incorrect|improve|review|repeat/i.test(`${r.whatILearned} ${r.whatIWillChange}`))
    .slice(0, 3);

  const maxMonthlyMinutes = Math.max(1, ...(summary?.monthly ?? []).map((m) => m.minutes));
  const monthLabel = (n: number) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][n - 1] ?? String(n);

  return (
    <div className="space-y-5">
      {/* Spaced repetition daily queue — shown at the top of the CPD tab */}
      <DailyReviewQueue />

      {/* Header + year selector */}
      <div className="neo-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <i className="fas fa-file-medical-alt text-emerald-500" /> CPD / CME Summary
          </h3>
          <div className="flex items-center gap-2">
            <button type="button" title="Previous year" onClick={() => setYear((y) => y - 1)}
              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs flex items-center justify-center transition-colors">
              <i className="fas fa-chevron-left" />
            </button>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-12 text-center">{year}</span>
            <button type="button" title="Next year" onClick={() => setYear((y) => y + 1)} disabled={year >= new Date().getFullYear()}
              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs flex items-center justify-center transition-colors disabled:opacity-30">
              <i className="fas fa-chevron-right" />
            </button>
            <button type="button" onClick={handleExport} disabled={exporting || pdfExporting || !summary || sessions.length === 0}
              className="ml-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center gap-1.5">
              <i className="fas fa-download" /> Download record (.html)
            </button>
            <button type="button" onClick={() => void handleExportPdf()} disabled={exporting || pdfExporting || !summary || sessions.length === 0}
              className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-40 transition-colors flex items-center gap-1.5">
              {pdfExporting ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-file-pdf" />}
              Download PDF (CPD)
            </button>
            <button type="button" onClick={handlePortfolioBundleExport} disabled={exporting || pdfExporting || !summary}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors flex items-center gap-1.5">
              <i className="fas fa-folder-open" /> ARCP bundle
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : summary ? (
          <>
            <div className="flex flex-wrap gap-6 mb-5">
              <div className="text-center">
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{summary.totalHours.toFixed(1)}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Total hours</div>
              </div>
              {Object.entries(summary.byType).filter(([, v]) => v.minutes > 0).map(([type, v]) => {
                const meta = CPD_TYPE_META[type] ?? { label: type, color: 'bg-slate-500', icon: 'fa-circle' };
                return (
                  <div key={type} className="text-center">
                    <div className="text-xl font-black text-slate-700 dark:text-slate-200">{(v.minutes / 60).toFixed(1)}h</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{meta.label}</div>
                  </div>
                );
              })}
            </div>

            {summary.monthly.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Monthly breakdown</p>
                <div className="flex items-end gap-1 h-20">
                  {summary.monthly.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5 group">
                      <div
                        className="w-full rounded-t bg-indigo-500 opacity-70 group-hover:opacity-100 transition-all duration-300 min-h-[2px]"
                        style={{ height: `${Math.max(2, Math.round((m.minutes / maxMonthlyMinutes) * 64))}px` }}
                        title={`${monthLabel(m.month)}: ${Math.round(m.minutes)} min`}
                      />
                      <span className="text-[8px] text-slate-400">{monthLabel(m.month)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-2">
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
              <i className="fas fa-file-medical-alt text-3xl text-slate-300 dark:text-slate-600 mb-3 block" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">No CPD recorded for {year}</p>
              <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto">
                Quizzes and evidence reviews are logged automatically. Use the form below to add conference attendance, ward teaching, or any other activity.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><i className="fas fa-brain text-indigo-400" /> Quizzes — auto</span>
                <span className="flex items-center gap-1.5"><i className="fas fa-flask text-violet-400" /> Evidence reviews — auto</span>
                <span className="flex items-center gap-1.5"><i className="fas fa-pencil-alt text-slate-400" /> Other — log below</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Journey summary */}
      <div className="neo-card p-5">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <i className="fas fa-route text-cyan-500" /> Clinical journey summary
        </h3>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: 'CPD activities', value: sessions.length, icon: 'fa-list-check', tone: 'text-indigo-500' },
            { label: 'Reflection drafts', value: reflections.length, icon: 'fa-folder-open', tone: 'text-emerald-500' },
            { label: 'Discussed/submitted', value: reflections.filter((r) => r.status === 'discussed' || r.status === 'submitted').length, icon: 'fa-user-check', tone: 'text-blue-500' },
            { label: 'Bundle selected', value: selectedReflectionIds.length || reflections.length, icon: 'fa-file-export', tone: 'text-violet-500' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <i className={`fas ${item.icon} ${item.tone} text-sm`} />
              <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{item.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent topics</p>
            <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{journeyTopics.length ? journeyTopics.join(', ') : 'No journey data yet.'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Portfolio status</p>
            <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
              {statusCounts.map((item) => `${item.status}: ${item.count}`).join(' | ')}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Latest learning action</p>
            <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">
              {latestReflection?.whatIWillChange || weakReflectionTopics[0]?.whatIWillChange || 'Complete a case or quiz, then save a reflection draft.'}
            </p>
          </div>
        </div>
      </div>

      {/* Manual log form */}
      <div className="neo-card p-5">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <i className="fas fa-plus-circle text-indigo-500" /> Log manual CPD activity
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Activity type</label>
            <select
              value={logForm.activityType}
              onChange={(e) => setLogForm((f) => ({ ...f, activityType: e.target.value as CpdActivityType }))}
              aria-label="Activity type"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="manual">Manual / self-study</option>
              <option value="quiz">Quiz / MCQ practice</option>
              <option value="synthesis">Evidence review</option>
              <option value="case">Clinical case</option>
              <option value="study_run">Topic review run</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Topic / activity name</label>
            <input
              value={logForm.topic}
              onChange={(e) => setLogForm((f) => ({ ...f, topic: e.target.value }))}
              placeholder="e.g. Atrial fibrillation, Journal club, Ward teaching"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Duration (minutes)</label>
            <input
              type="number" min={1} max={480}
              value={logForm.durationMinutes}
              onChange={(e) => setLogForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
              aria-label="Duration in minutes"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Notes (optional)</label>
            <input
              value={logForm.notes}
              onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Reflections, outcomes, sources…"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleManualLog}
          disabled={logStatus === 'saving' || !logForm.topic.trim() || logForm.durationMinutes < 1}
          className="mt-3 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center gap-2"
        >
          {logStatus === 'saving' ? <><i className="fas fa-circle-notch fa-spin" /> Saving…</>
            : logStatus === 'saved' ? <><i className="fas fa-check" /> Logged</>
            : <><i className="fas fa-plus" /> Log activity</>}
        </button>
        {logStatus === 'error' && <p className="text-xs text-red-500 mt-2">Failed to log — please try again.</p>}
      </div>

      {/* Portfolio reflection drafts */}
      <div className="neo-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <i className="fas fa-folder-open text-emerald-500" /> Portfolio drafts ({reflections.length})
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {reflections.length > 0 && (
              <button type="button" onClick={() => setSelectedReflectionIds(selectedReflectionIds.length === reflections.length ? [] : reflections.map((r) => r.id))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                {selectedReflectionIds.length === reflections.length ? 'Clear selection' : 'Select all'}
              </button>
            )}
            <button type="button" onClick={handlePortfolioBundleExport} disabled={exporting || !summary}
              className="px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-40 transition-colors flex items-center gap-1.5">
              <i className="fas fa-download" /> Evidence bundle
            </button>
          </div>
        </div>
        {reflections.length > 0 ? (
          <div className="space-y-2">
            {reflections.slice(0, 8).map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedReflectionIds.includes(r.id)}
                      onChange={() => toggleBundleReflection(r.id)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      aria-label={`Include ${r.topic} in evidence bundle`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate capitalize">{r.topic}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {r.reflectionType} | {r.sourceType} | {new Date(r.updatedAt).toLocaleDateString()}
                    </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={r.status}
                      onChange={(e) => void quickSetReflectionStatus(r, e.target.value as ReflectionStatus)}
                      className="h-7 rounded-lg border border-emerald-200 bg-white px-2 text-[10px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-200"
                      aria-label="Reflection status"
                    >
                      {REFLECTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <button type="button" onClick={() => openReflectionEditor(r)}
                      className="inline-flex h-7 items-center gap-1 rounded-lg bg-slate-900 px-2 text-[10px] font-bold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                      <i className="fas fa-pen text-[9px]" /> Edit
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2"><span className="font-bold text-slate-600 dark:text-slate-300">Learned:</span> {r.whatILearned || 'Draft awaiting notes.'}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2"><span className="font-bold text-slate-600 dark:text-slate-300">Change:</span> {r.whatIWillChange || 'Draft awaiting action.'}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2"><span className="font-bold text-slate-600 dark:text-slate-300">Evidence:</span> {r.evidenceUsed || 'Not added yet.'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 py-2">Saved quiz and case reflections will appear here as structured CBD, mini-CEX, or DOPS drafts.</p>
        )}
      </div>

      {editingReflection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Edit portfolio draft</p>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{editingReflection.topic}</h3>
              </div>
              <button type="button" onClick={() => setEditingReflection(null)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close reflection editor">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Type
                <select value={reflectionForm.reflectionType || 'CBD'} onChange={(e) => updateReflectionField('reflectionType', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="CBD">CBD</option>
                  <option value="mini-CEX">mini-CEX</option>
                  <option value="DOPS">DOPS</option>
                </select>
              </label>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Status
                <select value={reflectionForm.status || 'draft'} onChange={(e) => updateReflectionField('status', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  {REFLECTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Topic
                <input value={reflectionForm.topic || ''} onChange={(e) => updateReflectionField('topic', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>
            </div>
            {[
              ['whatHappened', 'What happened'],
              ['whatILearned', 'What I learned'],
              ['whatIWillChange', 'What I will change'],
              ['evidenceUsed', 'Evidence used'],
              ['supervisorDiscussion', 'Supervisor discussion'],
            ].map(([field, label]) => (
              <label key={field} className="mt-3 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {label}
                <textarea
                  value={String(reflectionForm[field as keyof PortfolioReflection] || '')}
                  onChange={(e) => updateReflectionField(field as keyof PortfolioReflection, e.target.value)}
                  rows={field === 'evidenceUsed' ? 5 : 4}
                  className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            ))}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {reflectionSaveStatus === 'error' && <span className="mr-auto text-xs font-semibold text-red-500">Could not save changes.</span>}
              {reflectionSaveStatus === 'saved' && <span className="mr-auto text-xs font-semibold text-emerald-600">Saved.</span>}
              <button type="button" onClick={() => setEditingReflection(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                Close
              </button>
              <button type="button" onClick={() => void saveReflectionEdit()} disabled={reflectionSaveStatus === 'saving'}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-60">
                {reflectionSaveStatus === 'saving' ? 'Saving...' : 'Save draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session list */}
      {sessions.length > 0 && (
        <div className="neo-card p-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <i className="fas fa-list text-slate-400" /> Activity log ({sessions.length})
          </h3>
          <div className="space-y-1.5">
            {sessions.map((s) => {
              const meta = CPD_TYPE_META[s.activityType] ?? { label: s.activityType, color: 'bg-slate-500', icon: 'fa-circle' };
              const iconColor = meta.color.replace('bg-', 'text-');
              return (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <i className={`fas ${meta.icon} ${iconColor} text-xs shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate capitalize">{s.topic}</p>
                    {s.notes && <p className="text-[10px] text-slate-400 truncate">{s.notes}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.durationMinutes} min</p>
                    <p className="text-[10px] text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                  {s.accuracyPct != null && (
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.accuracyPct >= 70 ? 'bg-emerald-100 text-emerald-700' : s.accuracyPct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {s.accuracyPct}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
