import React from 'react';

export function CaseQuizActionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-violet-500"
    >
      <i className="fas fa-brain text-[10px]" />
      Quiz this decision point
    </button>
  );
}
