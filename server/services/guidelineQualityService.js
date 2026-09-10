'use strict';

const { TRUSTED_GUIDELINE_SOURCES } = require('../config/trustedGuidelineSources');

function sourceNeedles(source) {
    return [source.id, source.name, source.fullName, ...(source.aliases || [])]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase().trim())
        .filter(Boolean);
}

const TRUSTED_NEEDLES = TRUSTED_GUIDELINE_SOURCES
    .flatMap((source) => sourceNeedles(source).map((needle) => ({ needle, source })))
    .sort((a, b) => b.needle.length - a.needle.length);

const TRUSTED_SOURCE_NAMES = new Set(TRUSTED_NEEDLES.map((row) => row.needle));

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textHasNeedle(normalized, needle) {
    if (!normalized || !needle) return false;
    if (normalized === needle) return true;
    if (needle.length <= 3) {
        return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(needle)}(?:$|[^a-z0-9])`, 'i').test(normalized);
    }
    return normalized.includes(needle);
}

function resolveTrustedSource(sourceBody) {
    const normalized = String(sourceBody || '').toLowerCase().trim();
    if (!normalized) return null;
    for (const row of TRUSTED_NEEDLES) {
        if (textHasNeedle(normalized, row.needle)) return row.source;
    }
    return null;
}

function isTrustedSource(sourceBody) {
    return Boolean(resolveTrustedSource(sourceBody));
}

function daysSince(value, now = new Date()) {
    if (!value) return null;
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return null;
    return Math.max(0, Math.floor((now.getTime() - time) / 86400000));
}

function assessGuidelineQuality(guideline, { now = new Date() } = {}) {
    const status = String(guideline?.status || guideline?.reviewStatus || 'ai_extracted');
    const lastCheckedAt = guideline?.lastCheckedAt || guideline?.last_checked_at;
    const sourceYear = Number(guideline?.sourceYear ?? guideline?.source_year ?? 0) || null;
    const checkedAgeDays = daysSince(lastCheckedAt, now);
    const currentYear = now.getFullYear();
    const sourceAgeYears = sourceYear ? Math.max(0, currentYear - sourceYear) : null;
    const resolved = resolveTrustedSource(guideline?.sourceBody || guideline?.source_body);

    const checks = {
        trustedSource: Boolean(resolved),
        humanReviewed: status === 'human_reviewed',
        methodologyPresent: Boolean(guideline?.recommendationStrength || guideline?.recommendation_strength || guideline?.recommendationCertainty || guideline?.recommendation_certainty),
        evidenceGradePresent: Boolean(guideline?.recommendationCertainty || guideline?.recommendation_certainty),
        sourceLinked: Boolean(guideline?.sourceUrl || guideline?.source_url),
        recentlyChecked: checkedAgeDays == null ? false : checkedAgeDays <= 365,
        currentVersion: sourceAgeYears == null ? false : sourceAgeYears <= 5,
        superseded: status === 'superseded' || Boolean(guideline?.supersededById || guideline?.superseded_by_id),
        stale: status === 'stale' || (checkedAgeDays != null && checkedAgeDays > 365),
    };

    let score = 0;
    if (checks.trustedSource) score += 20;
    if (checks.humanReviewed) score += 20;
    else if (status === 'ai_extracted') score += 8;
    if (checks.methodologyPresent) score += 15;
    if (checks.evidenceGradePresent) score += 10;
    if (checks.sourceLinked) score += 10;
    if (checks.recentlyChecked) score += 15;
    if (checks.currentVersion) score += 10;
    if (checks.stale) score -= 15;
    if (checks.superseded) score -= 30;
    score = Math.max(0, Math.min(100, score));

    const flags = [];
    if (!checks.trustedSource) flags.push('source_not_in_trusted_registry');
    if (!checks.humanReviewed) flags.push('not_human_reviewed');
    if (!checks.methodologyPresent) flags.push('methodology_or_strength_not_recorded');
    if (!checks.evidenceGradePresent) flags.push('certainty_not_recorded');
    if (!checks.sourceLinked) flags.push('source_url_missing');
    if (checks.stale) flags.push('stale_check_required');
    if (checks.superseded) flags.push('superseded');

    const level = score >= 80 ? 'high' : score >= 55 ? 'moderate' : 'low';
    return {
        score,
        level,
        checks,
        flags,
        resolvedSource: resolved
            ? { id: resolved.id, name: resolved.name, region: resolved.region, specialty: resolved.specialty }
            : null,
        summary: level === 'high'
            ? 'Trusted, current guideline metadata with review and grading signals.'
            : level === 'moderate'
                ? 'Usable guideline metadata, but verify missing review, grading, or recency details.'
                : 'Low-confidence guideline metadata; verify source, version, and local policy before use.',
    };
}

module.exports = {
    assessGuidelineQuality,
    isTrustedSource,
    resolveTrustedSource,
    daysSince,
    TRUSTED_SOURCE_NAMES,
};
