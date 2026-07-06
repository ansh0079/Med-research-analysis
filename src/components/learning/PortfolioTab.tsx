import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@services/api';
import type { PortfolioReflection } from '@types';

type ReflectionType = 'CBD' | 'mini-CEX' | 'DOPS';
type ReflectionStatus = 'draft' | 'discussed' | 'exported' | 'submitted';

const TYPE_LABEL: Record<ReflectionType, string> = {
  CBD: 'Case-Based Discussion',
  'mini-CEX': 'Mini-CEX',
  DOPS: 'DOPS',
};

const STATUS_STYLE: Record<ReflectionStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  discussed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  exported: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  submitted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const EMPTY_FORM = {
  reflectionType: 'CBD' as ReflectionType,
  topic: '',
  whatHappened: '',
  whatILearned: '',
  whatIWillChange: '',
  evidenceUsed: '',
  supervisorDiscussion: '',
  status: 'draft' as ReflectionStatus,
};

function FieldArea({
  label, hint, value, onChange, rows = 3,
}: { label: string; hint: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</label>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 -mt-0.5">{hint}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
      />
    </div>
  );
}

function ReflectionCard({
  r, onEdit, onStatusChange,
}: { r: PortfolioReflection; onEdit: (r: PortfolioReflection) => void; onStatusChange: (id: number, s: ReflectionStatus) => void }) {
  const nextStatus: Record<ReflectionStatus, ReflectionStatus | null> = {
    draft: 'discussed',
    discussed: 'submitted',
    submitted: null,
    exported: null,
  };
  const next = nextStatus[r.status as ReflectionStatus] ?? null;

  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{TYPE_LABEL[r.reflectionType as ReflectionType] ?? r.reflectionType}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status as ReflectionStatus] ?? STATUS_STYLE.draft}`}>
              {r.status}
            </span>
          </div>
          <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{r.topic || '(no topic)'}</p>
          {r.whatHappened && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{r.whatHappened}</p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">{new Date(r.updatedAt).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(r)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-900/40 transition-colors"
          >
            <i className="fas fa-edit mr-1" /> Edit
          </button>
          {next && (
            <button
              type="button"
              onClick={() => onStatusChange(r.id, next)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 transition-colors"
              title={`Mark as ${next}`}
            >
              <i className="fas fa-check mr-1" /> {next.charAt(0).toUpperCase() + next.slice(1)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PortfolioTab() {
  const [reflections, setReflections] = useState<PortfolioReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { reflections: data } = await api.learning.getPortfolioReflections({ limit: 100, status: filterStatus });
      setReflections(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reflections');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { void load(); }, [load]);

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setDraftError('');
    setShowForm(true);
  };

  const openEdit = (r: PortfolioReflection) => {
    setForm({
      reflectionType: (r.reflectionType as ReflectionType) ?? 'CBD',
      topic: r.topic,
      whatHappened: r.whatHappened,
      whatILearned: r.whatILearned,
      whatIWillChange: r.whatIWillChange,
      evidenceUsed: r.evidenceUsed,
      supervisorDiscussion: r.supervisorDiscussion,
      status: (r.status as ReflectionStatus) ?? 'draft',
    });
    setEditingId(r.id);
    setDraftError('');
    setShowForm(true);
  };

  const aiDraft = async () => {
    if (!form.topic.trim()) { setDraftError('Enter a topic first to generate an AI draft.'); return; }
    setDrafting(true);
    setDraftError('');
    try {
      const { draft } = await api.learning.draftPortfolioReflection(form.reflectionType, form.topic);
      setForm((f) => ({
        ...f,
        whatHappened: draft.whatHappened || f.whatHappened,
        whatILearned: draft.whatILearned || f.whatILearned,
        whatIWillChange: draft.whatIWillChange || f.whatIWillChange,
        evidenceUsed: draft.evidenceUsed || f.evidenceUsed,
      }));
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : 'AI draft failed — try again');
    } finally {
      setDrafting(false);
    }
  };

  const save = async () => {
    if (!form.topic.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.learning.updatePortfolioReflection(editingId, form);
      } else {
        await api.learning.createPortfolioReflection({
          reflectionType: form.reflectionType,
          topic: form.topic.trim(),
          whatHappened: form.whatHappened,
          whatILearned: form.whatILearned,
          whatIWillChange: form.whatIWillChange,
          evidenceUsed: form.evidenceUsed,
          supervisorDiscussion: form.supervisorDiscussion || undefined,
          status: form.status === 'submitted' || form.status === 'discussed' ? 'submitted' : 'draft',
        });
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: number, status: ReflectionStatus) => {
    try {
      await api.learning.updatePortfolioReflection(id, { status });
      setReflections((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    } catch {
      // silent — list will refresh on next load
    }
  };

  const f = (key: keyof typeof EMPTY_FORM) => (v: string) => setForm((prev) => ({ ...prev, [key]: v }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">Portfolio reflections</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">CBD, mini-CEX and DOPS drafts — linked to your evidence and quiz history</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center gap-2"
        >
          <i className="fas fa-plus" /> New reflection
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['', 'draft', 'discussed', 'submitted'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              {editingId ? 'Edit reflection' : 'New reflection'}
            </h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Type + topic row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Type</label>
              <select
                value={form.reflectionType}
                onChange={(e) => setForm((p) => ({ ...p, reflectionType: e.target.value as ReflectionType }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                {(['CBD', 'mini-CEX', 'DOPS'] as const).map((t) => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Topic</label>
              <input
                type="text"
                value={form.topic}
                onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))}
                placeholder="e.g. Heart failure, sepsis…"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* AI draft button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={aiDraft}
              disabled={drafting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-xs font-bold transition-colors"
            >
              {drafting
                ? <><i className="fas fa-spinner fa-spin" /> Generating draft…</>
                : <><i className="fas fa-magic" /> AI draft from quiz history</>}
            </button>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Generates a draft using your recent quiz performance and key evidence for this topic.
            </p>
          </div>
          {draftError && (
            <p className="text-xs text-red-600 dark:text-red-400"><i className="fas fa-exclamation-circle mr-1" />{draftError}</p>
          )}

          {/* Reflection fields */}
          <FieldArea
            label="What happened"
            hint="Describe the clinical encounter or learning event"
            value={form.whatHappened}
            onChange={f('whatHappened')}
            rows={3}
          />
          <FieldArea
            label="What I learned"
            hint="Specific insights — connect to evidence and quiz gaps"
            value={form.whatILearned}
            onChange={f('whatILearned')}
            rows={3}
          />
          <FieldArea
            label="What I will change"
            hint="Specific, actionable changes to future practice"
            value={form.whatIWillChange}
            onChange={f('whatIWillChange')}
            rows={2}
          />
          <FieldArea
            label="Evidence used"
            hint="Key papers, guidelines, or guidelines referenced"
            value={form.evidenceUsed}
            onChange={f('evidenceUsed')}
            rows={2}
          />
          <FieldArea
            label="Supervisor discussion (optional)"
            hint="Notes from discussion with your supervisor or assessor"
            value={form.supervisorDiscussion}
            onChange={f('supervisorDiscussion')}
            rows={2}
          />

          <div className="flex items-center justify-between pt-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ReflectionStatus }))}
                className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
              >
                {(['draft', 'discussed', 'submitted'] as const).map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving || !form.topic.trim()}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
            >
              {saving ? <i className="fas fa-spinner fa-spin" /> : editingId ? 'Save changes' : 'Save reflection'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-10 text-slate-400">
          <i className="fas fa-spinner fa-spin text-xl block mb-2" /> Loading reflections…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
      ) : reflections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 py-12 text-center text-slate-400">
          <i className="fas fa-file-alt text-3xl mb-3 block" />
          <p className="text-sm font-semibold mb-1">No reflections yet</p>
          <p className="text-xs">Click "New reflection" to draft your first CBD, mini-CEX, or DOPS.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reflections.map((r) => (
            <ReflectionCard key={r.id} r={r} onEdit={openEdit} onStatusChange={changeStatus} />
          ))}
        </div>
      )}
    </div>
  );
}
