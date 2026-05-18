/**
 * Same ranking as client synthesis / quiz/CASE seeds: EBM → quality grade → preprint, cap at n.
 * @param {Array<Record<string, unknown>>} articles
 * @param {number} [n=5]
 * @param {{ bouquetUids?: Set<string> }} [opts]
 */
function selectTopEvidence(articles, n = 5, { bouquetUids } = {}) {
    const cap = Math.min(Math.max(parseInt(String(n), 10) || 5, 1), 50);
    const gradeOrder = { A: 4, B: 3, C: 2, D: 1 };
    return [...(articles || [])]
        .filter((a) => !a._retraction?.isRetracted)
        .sort((a, b) => {
            const ebmA = a._ebmScore ?? 0;
            const ebmB = b._ebmScore ?? 0;
            if (ebmB !== ebmA) return ebmB - ebmA;
            const gA = gradeOrder[(a._quality && a._quality.grade) || ''] ?? 0;
            const gB = gradeOrder[(b._quality && b._quality.grade) || ''] ?? 0;
            if (gB !== gA) return gB - gA;
            if (a._isPreprint !== b._isPreprint) return a._isPreprint ? 1 : -1;
            // Tiebreaker: prefer articles previously validated by the bouquet scorer
            if (bouquetUids) {
                const aInBouquet = bouquetUids.has(String(a.uid || '')) || bouquetUids.has(String(a.pmid || '')) || bouquetUids.has(String(a.doi || ''));
                const bInBouquet = bouquetUids.has(String(b.uid || '')) || bouquetUids.has(String(b.pmid || '')) || bouquetUids.has(String(b.doi || ''));
                if (aInBouquet !== bInBouquet) return aInBouquet ? -1 : 1;
            }
            return 0;
        })
        .slice(0, cap);
}

module.exports = { selectTopEvidence };
