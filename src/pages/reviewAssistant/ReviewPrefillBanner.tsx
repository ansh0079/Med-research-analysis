export function ReviewPrefillBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl animate-fade-in">
      <p className="text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
        <i className="fas fa-clipboard-check text-indigo-400" />
        Pre-filled from your evidence project. Criteria and articles added automatically on review creation.
      </p>
      <button type="button" aria-label="Dismiss" onClick={onDismiss}
        className="text-indigo-400 hover:text-indigo-600 transition-colors shrink-0">
        <i className="fas fa-times text-xs" aria-hidden="true" />
      </button>
    </div>
  );
}
