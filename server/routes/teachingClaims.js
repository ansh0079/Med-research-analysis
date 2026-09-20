'use strict';

const { findContradictionsForClaim } = require('../services/contradictionFinderService');
const { getSourcePassages } = require('../services/search/searchEvidenceSnapshot');

function registerTeachingClaimRoutes(app, deps) {
    const { db, serverConfig, rateLimit, requireAuthJwt, fetch: fetchImpl } = deps;

    app.get('/api/teaching-claims/:claimKey', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const claimKey = String(req.params.claimKey || '').trim();
            const claim = await db.getTeachingClaimByKey(claimKey);
            if (!claim) return res.status(404).json({ error: 'Claim not found' });
            res.json({ claim });
        } catch (error) {
            req.log.error({ err: error }, 'Get teaching claim error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // The evidence behind a claim: the passage it rests on (from the immutable source version, never
    // re-fetched), how well it is supported and on what basis, its review state (a withdrawn claim says
    // so), and the lineage of the object it belongs to.
    app.get('/api/teaching-claims/:claimKey/evidence', requireAuthJwt, rateLimit(60, 60), async (req, res) => {
        try {
            const claimKey = String(req.params.claimKey || '').trim();
            const claim = await db.getTeachingClaimByKey(claimKey);
            if (!claim) return res.status(404).json({ error: 'Claim not found' });
            const object = claim.objectKey ? await db.getTeachingObjectByKey(claim.objectKey) : null;
            const claimSupport = object?.payload?.claimSupport || null;
            const support = claimSupport?.claims?.find((c) => c.claimKey === claimKey) || null;
            const { version, passages } = support?.passageIds?.length
                ? await getSourcePassages(db, claimSupport.sourceVersionId, support.passageIds)
                : { version: null, passages: [] };
            res.json({
                claim: {
                    claimKey: claim.claimKey,
                    claimText: claim.claimText,
                    verificationStatus: claim.verificationStatus,
                    verificationReason: claim.verificationReason,
                    reviewState: claim.reviewState,
                },
                support,
                // 'unsupported' and 'partially_supported' are shown to the reader as such; 'unjudged' means
                // consistent with the source with entailment not established.
                evidence: {
                    quote: claim.evidenceQuote || null,
                    sourceVersion: version,
                    passages,
                    accessState: claimSupport?.accessState || null,
                },
                lineage: object ? { snapshotId: object.evidenceSnapshotId || null, status: object.lineageStatus || null } : null,
            });
        } catch (error) {
            req.log.error({ err: error }, 'Get teaching claim evidence error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/teaching-claims/:claimKey/find-contradictions', requireAuthJwt, rateLimit(15, 60), async (req, res) => {
        try {
            const claimKey = String(req.params.claimKey || '').trim();
            const topic = String(req.body?.topic || '').trim();
            let claimText = String(req.body?.claimText || '').trim();
            const claim = await db.getTeachingClaimByKey(claimKey);
            if (!claim) return res.status(404).json({ error: 'Claim not found' });
            if (!claimText) claimText = claim.claimText;
            if (!topic && !claim.normalizedTopic) {
                return res.status(400).json({ error: 'topic is required' });
            }
            const result = await findContradictionsForClaim(db, {
                claimKey,
                topic: topic || claim.topic || claim.normalizedTopic,
                claimText,
                serverConfig,
                fetchImpl,
            });
            res.json(result);
        } catch (error) {
            req.log.error({ err: error }, 'Contradiction search error');
            res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    });
}

module.exports = { registerTeachingClaimRoutes };
