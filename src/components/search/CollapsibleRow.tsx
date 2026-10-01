import React from 'react';

interface CollapsibleRowProps {
  id?: string;
  icon: string;
  title: string;
  summary?: React.ReactNode;
  children: React.ReactNode;
}

/** Children stay mounted while closed so their data loads in the background and opens instantly. */
export const CollapsibleRow: React.FC<CollapsibleRowProps> = ({
  id,
  icon,
  title,
  summary,
  children,
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <section id={id} className="mb-4 scroll-mt-28 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900"
      >
        <span className="flex min-w-0 items-center gap-2">
          <i className={`fas ${icon} text-[11px] text-slate-400`} />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</span>
          {summary && <span className="hidden truncate text-xs text-slate-400 sm:inline">{summary}</span>}
        </span>
        <i className={`fas fa-chevron-down text-[11px] text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div hidden={!open} className="border-t border-slate-100 p-3 dark:border-slate-800">
        {children}
      </div>
    </section>
  );
};
