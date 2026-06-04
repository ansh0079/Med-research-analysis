// ==========================================
// Digest Scheduler — Runs search alerts and emails results
// ==========================================

const cron = require('node-cron');
const crypto = require('crypto');
const { buildDigestHtml, sendDigestEmail } = require('./emailService');
const { digestQueue } = require('./jobQueue');
const spacedRep = require('./spacedRepService');

let scheduledJob = null;

/**
 * Generate a secure unsubscribe token.
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Run a live search query against the upstream APIs for each source.
 */
async function runSearchForAlert(query, sources, serverConfig, fetchImpl) {
  const results = [];
  
  // Advanced Query: Prioritize systematic reviews, clinical trials, and guidelines in PubMed
  // Using PubMed [sb] (Subset) and [pt] (Publication Type) filters for high-quality evidence
  const qualityFilter = ' AND (systematic[sb] OR clinical trial[pt] OR guideline[pt])';
  const pubmedQuery = encodeURIComponent(query + qualityFilter);
  const genericQuery = encodeURIComponent(query);
  
  const ncbiEmail = serverConfig?.keys?.ncbiEmail || 'digest@medsearch.app';

  const tasks = sources.map(async (source) => {
    try {
      if (source === 'pubmed') {
        const searchUrl =
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` +
          `?db=pubmed&retmode=json&term=${pubmedQuery}&retmax=10&sort=relevance` +
          `&tool=medsearch_digest&email=${encodeURIComponent(ncbiEmail)}`;
        const searchRes = await fetchImpl(searchUrl, { signal: AbortSignal.timeout(10000) });
        if (!searchRes.ok) return;
        const searchData = await searchRes.json();
        const ids = searchData.esearchresult?.idlist || [];
        if (!ids.length) return;

        const detailUrl =
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi` +
          `?db=pubmed&id=${ids.join(',')}&retmode=json`;
        const detailRes = await fetchImpl(detailUrl, { signal: AbortSignal.timeout(10000) });
        if (!detailRes.ok) return;
        const detailData = await detailRes.json();
        for (const id of ids) {
          const article = detailData.result?.[id];
          if (article && article.title) results.push({ ...article, uid: id, _source: 'pubmed' });
        }
      }

      if (source === 'semantic') {
        const url =
          `https://api.semanticscholar.org/graph/v1/paper/search` +
          `?query=${genericQuery}&limit=10&fields=title,authors,year,abstract,journal,influentialCitationCount&sort=relevance`;
        const headers = {};
        if (serverConfig?.keys?.semantic) headers['x-api-key'] = serverConfig.keys.semantic;
        const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(10000) });
        if (!res.ok) return;
        const data = await res.json();
        for (const p of data.data || []) {
          if (p.title) {
            results.push({
              uid: p.paperId,
              title: p.title,
              authors: p.authors?.map((a) => ({ name: a.name })),
              pubdate: p.year?.toString(),
              year: p.year,
              source: p.journal?.name || 'Semantic Scholar',
              abstract: p.abstract,
              _source: 'semantic',
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[Digest] Search failed for source ${source}:`, err.message);
    }
  });

  await Promise.allSettled(tasks);
  return results;
}

/**
 * Check if an alert should run based on its frequency.
 */
function shouldRunAlert(alert) {
  if (!alert.last_sent) return true;

  const lastSent = new Date(alert.last_sent).getTime();
  const now = Date.now();
  const diffDays = (now - lastSent) / (1000 * 60 * 60 * 24);

  switch (alert.frequency) {
    case 'daily': return diffDays >= 1;
    case 'weekly': return diffDays >= 7;
    case 'monthly': return diffDays >= 30;
    default: return diffDays >= 7;
  }
}

/**
 * Execute all pending alert digests.
 */
async function runAlertDigests(db, appUrl = '', serverConfig = {}, fetchImpl = fetch) {
  if (!db) {
    console.warn('[Digest] Database not available, skipping digest run.');
    return { sent: 0, errors: 0 };
  }

  try {
    const alerts = await db.all(
      `SELECT * FROM search_alerts WHERE active = 1 AND digest_enabled = 1`
    );

    let sentCount = 0;
    let errorCount = 0;

    for (const alert of alerts) {
      if (!shouldRunAlert(alert)) continue;

      try {
        const user = await db.getUserById(alert.user_id);
        if (!user || !user.email) {
          console.warn(`[Digest] No email for user ${alert.user_id}, skipping alert ${alert.id}`);
          continue;
        }

        // Ensure token exists
        let token = alert.unsubscribe_token;
        if (!token) {
          token = generateToken();
          await db.run(
            `UPDATE search_alerts SET unsubscribe_token = ? WHERE id = ?`,
            [token, alert.id]
          );
        }

        let sources = ['pubmed'];
        try {
          sources = alert.sources ? JSON.parse(alert.sources) : ['pubmed'];
        } catch {
          sources = ['pubmed'];
        }
        const articles = await runSearchForAlert(alert.query, sources, serverConfig, fetchImpl);

        // Show the top 5 most recent results. The eSearch sort=date already orders by
        // recency so slicing is sufficient — filtering by pubdate would drop most articles
        // since PubMed dates reflect publication year, not when we fetched them.
        const newArticles = articles.slice(0, 5);

        // Fetch spaced-repetition overdue cards for this user
        let spacedRepData = null;
        try {
          const dueCount = await spacedRep.countDueCards(db, alert.user_id);
          if (dueCount > 0) {
            const dueCards = await spacedRep.getDueCards(db, alert.user_id, 20);
            const topTopic = dueCards.length > 0 ? dueCards[0].topic : null;
            spacedRepData = { dueCount, topTopic };
          }
        } catch {
          spacedRepData = null;
        }

        const html = buildDigestHtml({
          userName: user.name,
          date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          alertResults: [{ alert, articles: newArticles }],
          appUrl: appUrl || process.env.APP_URL || 'http://localhost:5173',
          spacedRepData,
        });

        await sendDigestEmail({
          to: user.email,
          subject: `📚 Research Digest — ${alert.query}`,
          html,
        });

        await db.run(
          `UPDATE search_alerts SET last_sent = datetime('now') WHERE id = ?`,
          [alert.id]
        );

        sentCount++;
        console.log(`[Digest] Sent digest for alert ${alert.id} to ${user.email}`);
      } catch (err) {
        errorCount++;
        console.error(`[Digest] Failed to process alert ${alert.id}:`, err.message);
      }
    }

    console.log(`[Digest] Run complete. Sent: ${sentCount}, Errors: ${errorCount}`);
    return { sent: sentCount, errors: errorCount };
  } catch (err) {
    console.error('[Digest] Fatal error in runAlertDigests:', err.message);
    return { sent: 0, errors: 1 };
  }
}

/**
 * Start the digest cron scheduler.
 * @param {object} db
 * @param {string} appUrl
 * @param {object} serverConfig
 * @param {Function} fetchImpl
 * @param {import('pino').Logger} [logger] - optional pino logger; falls back to console
 */
function scheduleDigests(db, appUrl, serverConfig = {}, fetchImpl = fetch, logger = null) {
  const log = logger || { info: console.log, error: console.error, warn: console.warn };
  if (scheduledJob) {
    scheduledJob.stop();
  }

  // Run daily at 09:00
  scheduledJob = cron.schedule('0 9 * * *', async () => {
    log.info('Running scheduled digest job');
    digestQueue.enqueueNamed('run', {}, { label: 'scheduled-digest' }).catch((err) => {
      log.error({ err }, 'Scheduled digest failed');
    });
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC',
  });

  log.info('Digest scheduler active (daily at 09:00 UTC)');
}

/**
 * Stop the digest cron scheduler.
 */
function stopDigests() {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log('🛑 Digest scheduler stopped');
  }
}

module.exports = {
  runAlertDigests,
  scheduleDigests,
  stopDigests,
  generateToken,
};
