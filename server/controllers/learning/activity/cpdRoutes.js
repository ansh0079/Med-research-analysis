'use strict';

const { limitBodySize, requireJson } = require('../../../utils/validation');

const CPD_PDF_LABELS = {
    quiz: 'Quiz',
    synthesis: 'Evidence review',
    case: 'Case',
    search: 'Search',
    study_run: 'Topic run',
    manual: 'Manual',
};

function registerCpdRoutes(app, deps) {
    const { db, requireAuthJwt, rateLimit } = deps;

    app.post('/api/learning/cpd', limitBodySize(32 * 1024), requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { activityType, topic = '', durationMinutes = 0, questionCount = 0, accuracyPct = null, notes = '', source = 'auto' } = req.body;
            const VALID_TYPES = ['quiz', 'synthesis', 'case', 'search', 'study_run', 'manual'];
            if (!VALID_TYPES.includes(activityType)) {
                return res.status(400).json({ error: `activityType must be one of: ${VALID_TYPES.join(', ')}` });
            }
            const result = await db.createCpdSession(req.user.id, { activityType, topic, durationMinutes, questionCount, accuracyPct, notes, source });
            res.status(201).json({ id: result.id });
        } catch (error) {
            req.log.error({ err: error }, 'Create CPD session error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/cpd', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { limit = 100, offset = 0, startDate = '', endDate = '', activityType = '' } = req.query;
            const sessions = await db.listCpdSessions(req.user.id, {
                limit: Math.min(parseInt(limit, 10) || 100, 200),
                offset: parseInt(offset, 10) || 0,
                startDate: String(startDate),
                endDate: String(endDate),
                activityType: String(activityType),
            });
            res.json({ sessions });
        } catch (error) {
            req.log.error({ err: error }, 'List CPD sessions error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/cpd/summary', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const year = parseInt(req.query.year, 10) || new Date().getFullYear();
            const summary = await db.getCpdSummary(req.user.id, { year });
            res.json({ summary });
        } catch (error) {
            req.log.error({ err: error }, 'CPD summary error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/cpd/export-pdf', requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const PDFDocument = require('pdfkit');
            const year = parseInt(req.query.year, 10) || new Date().getFullYear();
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;
            const sessionsRaw = await db.listCpdSessions(req.user.id, {
                startDate,
                endDate,
                limit: 500,
                offset: 0,
            });
            const sessions = [...sessionsRaw].reverse();
            if (!sessions.length) {
                return res.status(400).json({ error: 'No CPD sessions in this year to export' });
            }
            const summary = await db.getCpdSummary(req.user.id, { year });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="cpd-record-${year}.pdf"`);

            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            doc.pipe(res);

            doc.fontSize(18).text(`CPD / CME activity record — ${year}`, { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(11).fillColor('#444').text(
                `Total recorded time: ${(summary?.totalHours ?? 0).toFixed(1)} hours · ${sessions.length} activities`,
            );
            doc.moveDown();
            doc.fillColor('#000');

            const tableTop = doc.y;
            const colX = [50, 105, 215, 300, 360, 420];
            doc.fontSize(9).font('Helvetica-Bold');
            ['Date', 'Type', 'Topic', 'Mins', 'Q#', 'Acc'].forEach((h, i) => {
                doc.text(h, colX[i], tableTop, { width: i === 2 ? 200 : 50, continued: false });
            });
            doc.font('Helvetica');
            let rowY = tableTop + 16;
            const maxY = 780;
            for (const s of sessions) {
                if (rowY > maxY) {
                    doc.addPage();
                    rowY = 50;
                }
                const typeLabel = CPD_PDF_LABELS[s.activityType] || s.activityType;
                const dateStr = s.createdAt ? String(s.createdAt).slice(0, 10) : '—';
                doc.fontSize(8).text(dateStr, colX[0], rowY, { width: 52 });
                doc.text(typeLabel, colX[1], rowY, { width: 105 });
                doc.text(String(s.topic || '—').slice(0, 48), colX[2], rowY, { width: 200 });
                doc.text(String(s.durationMinutes ?? '—'), colX[3], rowY, { width: 48 });
                doc.text(s.questionCount != null ? String(s.questionCount) : '—', colX[4], rowY, { width: 40 });
                doc.text(s.accuracyPct != null ? `${s.accuracyPct}%` : '—', colX[5], rowY, { width: 40 });
                rowY += 14;
            }

            doc.moveDown(2);
            doc.fontSize(8).fillColor('#666').text(
                `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · Signal MD · For your professional portfolio or regulatory return; verify against your local college requirements.`,
                { align: 'left' },
            );
            doc.end();
        } catch (error) {
            req.log.error({ err: error }, 'CPD PDF export error');
            if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerCpdRoutes };
