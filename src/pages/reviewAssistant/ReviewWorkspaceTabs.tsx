import type { GRADETable, PrismaCounts, ROBResult } from '@types';
import type { WorkspaceTab } from './types';

export function ReviewWorkspaceTabs({
  tab,
  prisma,
  robById,
  gradeTable,
  onTabChange,
}: {
  tab: WorkspaceTab;
  prisma: PrismaCounts;
  robById: Record<string, ROBResult>;
  gradeTable: GRADETable | null;
  onTabChange: (tab: WorkspaceTab) => void;
}) {
  const tabs = [
    { key: 'screening' as const, label: 'Screening', icon: 'fa-filter', badge: prisma.pending > 0 ? String(prisma.pending) : undefined },
    { key: 'data' as const, label: 'Data Extraction', icon: 'fa-table' },
    { key: 'rob' as const, label: 'Risk of Bias', icon: 'fa-shield-alt', badge: Object.keys(robById).length > 0 ? String(Object.keys(robById).length) : undefined },
    { key: 'grade' as const, label: 'GRADE', icon: 'fa-chart-bar', badge: gradeTable ? '✓' : undefined },
    { key: 'export' as const, label: 'Export', icon: 'fa-download' },
  ];

  return (
    <div className="flex gap-1 border-b border-gray-100 dark:border-slate-800 pb-0.5">
      {tabs.map((t) => (
        <button key={t.key} type="button" onClick={() => onTabChange(t.key)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg border-b-2 transition-colors ${
            tab === t.key
              ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}>
          <i className={`fas ${t.icon} text-[10px]`} aria-hidden="true" />
          {t.label}
          {t.badge && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[9px] font-bold">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
