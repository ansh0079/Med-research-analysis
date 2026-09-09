import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@services/api';
import type { Article, GuidelineEntry } from '@types';

/**
 * What the clinician sees before scrolling: how much evidence there is, how
 * current the guidelines are, and whether anything disagrees.
 *
 * The search page carries everything a decision needs, but measured on
 * production a 22-result page renders ~59,000px tall with the Guideline
 * Snapshot ~27,000px down -- past any realistic between-patients scroll. The
 * evidence was present and effectively unreachable.
 *
 * So this is the answer layer and everything below it is the drill-down. It
 * deliberately states coverage rather than implying completeness: "as much as
 * we could find, and here is how much that was" is a claim the product can
 * stand behind, where silence reads as "this is everything".
 */

export interface EvidenceVerdictStripProps {
    query: string;
    results: Article[];
    /** Trial-vs-guideline conflicts already computed for the synthesis, if any. */
    conflictCount?: number | null;
    onJumpToGuidelines?: () => void;
}

const RCT_PATTERN = /randomized controlled trial|randomised controlled trial|clinical trial, phase/i;
const REVIEW_PATTERN = /systematic review|meta-analysis/i;
const GUIDELINE_PATTERN = /practice guideline|guideline/i;

function countByPubtype(results: Article[], pattern: RegExp): number {
    return results.filter((a) => (a.pubtype || []).some((t) => pattern.test(String(t || '')))).length;
}

/** Vancouver-ish and deliberately plain: it has to survive a paste into notes. */
export function formatCitation(article: Article): string {
    const authors = (article.authors || []).slice(0, 3).map((a) => a.name).filter(Boolean);
    const authorPart = authors.length
        ? `${authors.join(', ')}${(article.authors || []).length > 3 ? ', et al.' : ''}. `
        : '';
    const title = article.title ? `${article.title.replace(/\.$/, '')}. ` : '';
    const journal = article.journal || article.source || '';
    const year = article.year || (article.pubdate ? String(article.pubdate).slice(0, 4) : '');
    const journalPart = journal ? `${journal}${year ? `. ${year}` : ''}. ` : (year ? `${year}. ` : '');
    const id = article.pmid
        ? `PMID: ${article.pmid}`
        : article.doi
            ? `doi:${article.doi}`
            : '';
    return `${authorPart}${title}${journalPart}${id}`.trim();
}

export const EvidenceVerdictStrip: React.FC<EvidenceVerdictStripProps> = ({
    query,
    results,
    conflictCount = null,
    onJumpToGuidelines,
}) => {
    const [guidelines, setGuidelines] = useState<GuidelineEntry[] | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!query) return;
        let cancelled = false;
        api.collaboration.getGuidelinesForTopic(query)
            .then((r) => { if (!cancelled) setGuidelines(r.guidelines || []); })
            .catch(() => { if (!cancelled) setGuidelines([]); });
        return () => { cancelled = true; };
    }, [query]);

    const stats = useMemo(() => {
        const rcts = countByPubtype(results, RCT_PATTERN);
        const reviews = countByPubtype(results, REVIEW_PATTERN);
        const guidelinePapers = countByPubtype(results, GUIDELINE_PATTERN);
        // source_body frequently holds a journal rather than an issuing
        // organisation -- production returns "Dig Dis Sci" and "Vnitr Lek" as
        // the guideline bodies for hepatorenal syndrome. Counting those as
        // guidelines here would put a journal where a clinician expects EASL or
        // NICE, at the top of the page. The server flags the real ones.
        const issuing = (guidelines || []).filter((g) => g.isIssuingBody);
        const years = issuing.map((g) => g.sourceYear).filter((y): y is number => typeof y === 'number');
        const newestGuideline = years.length ? Math.max(...years) : null;
        const bodies = Array.from(new Set(issuing.map((g) => g.sourceBody).filter(Boolean))).slice(0, 3);
        return { rcts, reviews, guidelinePapers, newestGuideline, bodies, issuingCount: issuing.length };
    }, [results, guidelines]);

    // "Thin" is deliberately generous: the honest failure here is implying
    // completeness we do not have, not under-selling a well-covered topic.
    const guidelineCount = stats.issuingCount;
    const isThin = results.length < 5 || (guidelines !== null && guidelineCount === 0 && stats.reviews === 0);

    const copyCitations = async () => {
        const lines = results.slice(0, 10).map((a, i) => `${i + 1}. ${formatCitation(a)}`);
        const header = `Evidence for: ${query}\n(${results.length} results; top ${Math.min(10, results.length)} cited below)\n\n`;
        try {
            await navigator.clipboard?.writeText(header + lines.join('\n'));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2200);
        } catch {
            // Clipboard can be blocked; the citations are still readable on the page.
        }
    };

    if (!results.length) return null;

    return (
        <section
            aria-label="Evidence summary"
            className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <Stat label="papers" value={results.length} />
                {stats.rcts > 0 && <Stat label="RCTs" value={stats.rcts} />}
                {stats.reviews > 0 && <Stat label="reviews / meta-analyses" value={stats.reviews} />}
                <Stat
                    label={stats.newestGuideline ? `guidelines (latest ${stats.newestGuideline})` : 'guidelines'}
                    value={guidelines === null ? '…' : guidelineCount}
                    onClick={guidelineCount > 0 ? onJumpToGuidelines : undefined}
                />
                {typeof conflictCount === 'number' && conflictCount > 0 && (
                    <Stat label="trial vs guideline conflicts" value={conflictCount} tone="warn" />
                )}

                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={copyCitations}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-600 dark:text-slate-200 dark:hover:text-indigo-300"
                    >
                        {copied ? 'Copied' : 'Copy citations'}
                    </button>
                </div>
            </div>

            {stats.bodies.length > 0 && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Guideline bodies: {stats.bodies.join(', ')}
                </p>
            )}

            {isThin && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    Thin coverage for this query — this is what we could find, not necessarily all that exists.
                    Verify against primary sources before acting.
                </p>
            )}
        </section>
    );
};

const Stat: React.FC<{ label: string; value: number | string; tone?: 'warn'; onClick?: () => void }> = ({
    label, value, tone, onClick,
}) => {
    const body = (
        <>
            <span className={`text-lg font-bold tabular-nums ${tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {value}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
        </>
    );
    if (onClick) {
        return (
            <button type="button" onClick={onClick} className="flex items-baseline gap-1.5 rounded transition-colors hover:text-indigo-700 dark:hover:text-indigo-300">
                {body}
            </button>
        );
    }
    return <span className="flex items-baseline gap-1.5">{body}</span>;
};
