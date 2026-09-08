import React, { useState } from 'react';
import { api } from '@services/api';

/**
 * The one way a beta tester can tell us something is wrong.
 *
 * Before this the app had no feedback channel at all: the only contact route
 * anywhere was a mailto: on the compliance page, pointing at a domain the
 * product does not own. Twenty-one invites were about to go out to people whose
 * only option, when something broke, was to say nothing.
 *
 * Posts to the existing /api/analytics/quality-feedback endpoint under the
 * 'beta' product type, which accepts anonymous sessions -- testers can report
 * before they sign in, which is exactly when the worst bugs show up. The current
 * route travels with the report so a vague "this is broken" is still actionable.
 */
export const BetaFeedbackWidget: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [comment, setComment] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const close = () => {
        setOpen(false);
        setStatus('idle');
        setComment('');
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim() || status === 'sending') return;
        setStatus('sending');
        try {
            await api.documents.submitQualityFeedback({
                productType: 'beta',
                comment: comment.trim(),
                metadata: {
                    path: window.location.pathname + window.location.search,
                    userAgent: navigator.userAgent.slice(0, 200),
                    viewport: `${window.innerWidth}x${window.innerHeight}`,
                },
            });
            setStatus('sent');
            setComment('');
            window.setTimeout(close, 2200);
        } catch {
            // Keep what they typed: losing a bug report to a failed request is
            // the same insult the report is probably about.
            setStatus('error');
        }
    };

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Send feedback"
                className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-lg transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-indigo-300"
            >
                <i className="fas fa-comment-dots text-indigo-500" aria-hidden />
                Feedback
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Tell us what happened</h2>
                <button
                    type="button"
                    onClick={close}
                    aria-label="Close feedback"
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                >
                    <i className="fas fa-xmark" aria-hidden />
                </button>
            </div>

            {status === 'sent' ? (
                <p className="py-4 text-sm text-emerald-700 dark:text-emerald-300">
                    <i className="fas fa-check mr-2" aria-hidden />
                    Thank you — that went straight to the team.
                </p>
            ) : (
                <form onSubmit={submit}>
                    <label htmlFor="beta-feedback-comment" className="sr-only">Your feedback</label>
                    <textarea
                        id="beta-feedback-comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        maxLength={1000}
                        autoFocus
                        placeholder="What went wrong, or what would make this more useful?"
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                        We include the page you are on. Please leave out patient identifiers.
                    </p>
                    {status === 'error' && (
                        <p role="alert" className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                            That didn&rsquo;t send. Your text is still here — try again.
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={!comment.trim() || status === 'sending'}
                        className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {status === 'sending' ? 'Sending…' : 'Send feedback'}
                    </button>
                </form>
            )}
        </div>
    );
};
