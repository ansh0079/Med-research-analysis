// ==========================================
// Email Service — Digest + Transactional
// ==========================================

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('⚠️  SMTP not configured. Emails will be logged to console only.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
}

/**
 * Build HTML digest email from alert results.
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildDigestHtml({ userName, date, alertResults, appUrl, spacedRepData }) {
  const spacedRepSection = spacedRepData && spacedRepData.dueCount > 0
    ? `
      <div style="margin-bottom:24px;padding:16px;background:#fff1f2;border-radius:12px;border:1px solid #fecdd3;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:36px;height:36px;border-radius:10px;background:#fda4af;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="font-size:16px;">🧠</span>
          </div>
          <div style="flex:1;min-width:0;">
            <p style="margin:0;font-size:14px;font-weight:bold;color:#9f1239;">${spacedRepData.dueCount} card${spacedRepData.dueCount > 1 ? 's' : ''} overdue for review</p>
            <p style="margin:4px 0 0;font-size:12px;color:#be123c;">
              ${spacedRepData.topTopic ? `Next up: <strong>${escapeHtml(spacedRepData.topTopic)}</strong> — ` : ''}
              Spaced repetition only works if you show up. <a href="${appUrl}/learning" style="color:#be123c;text-decoration:underline;font-weight:600;">Review now →</a>
            </p>
          </div>
        </div>
      </div>
    `
    : '';

  const sections = alertResults.map(({ alert, articles }) => {
    const articleRows = articles.map((art, idx) => {
      const qualityBadge = art._quality
        ? `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:bold;background:${art._quality.grade === 'A' ? '#d1fae5;color:#065f46' : art._quality.grade === 'B' ? '#dbeafe;color:#1e40af' : art._quality.grade === 'C' ? '#fef3c7;color:#92400e' : '#fee2e2;color:#991b1b'};">${art._quality.grade}</span>`
        : '';
      const retractedBadge = art._retraction?.isRetracted
        ? `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:bold;background:#dc2626;color:#fff;margin-left:4px;">RETRACTED</span>`
        : '';
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:600;color:#111827;font-size:14px;margin-bottom:4px;">${idx + 1}. ${escapeHtml(art.title)}</div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">
              ${art.source || art.journal || 'Unknown Journal'} • ${art.pubdate?.split(' ')[0] || art.year || 'N/A'}
              ${art.pmcrefcount !== undefined || art.citationCount !== undefined ? ` • ${art.pmcrefcount ?? art.citationCount} citations` : ''}
            </div>
            <div>${qualityBadge}${retractedBadge}</div>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="margin-bottom:32px;">
        <h3 style="font-size:16px;font-weight:bold;color:#1f2937;margin-bottom:8px;border-left:4px solid #4f46e5;padding-left:12px;">
          🔍 ${alert.query}
        </h3>
        <p style="font-size:12px;color:#6b7280;margin-bottom:12px;">Sources: ${(() => { try { const s = typeof alert.sources === 'string' ? JSON.parse(alert.sources) : (alert.sources || ['pubmed']); return Array.isArray(s) ? s.join(', ') : String(s); } catch { return 'pubmed'; } })()}</p>
        <table style="width:100%;border-collapse:collapse;">${articleRows || '<tr><td style="padding:12px 0;color:#9ca3af;font-size:13px;">No new articles this period.</td></tr>'}</table>
        <a href="${appUrl}/?q=${encodeURIComponent(alert.query)}&sources=${encodeURIComponent(alert.sources || 'pubmed')}" style="display:inline-block;margin-top:8px;font-size:13px;color:#4f46e5;text-decoration:none;font-weight:600;">View all results →</a>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Research Digest</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#4f46e5;padding:24px 32px;">
              <h1 style="color:#ffffff;font-size:20px;font-weight:bold;margin:0;">📚 Your Research Digest</h1>
              <p style="color:#c7d2fe;font-size:13px;margin:4px 0 0 0;">${date}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:14px;color:#374151;margin-bottom:24px;">Hi ${userName || 'there'}, here are the latest papers matching your saved searches.</p>
              ${spacedRepSection}
              ${sections}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="font-size:12px;color:#9ca3af;margin:0;">
                You're receiving this because you have active search alerts on Medical Research Intelligence.
              </p>
              <p style="font-size:12px;color:#9ca3af;margin-top:8px;">
                <a href="${appUrl}/history" style="color:#6b7280;text-decoration:underline;">Manage alerts</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send a digest email.
 */
async function sendDigestEmail({ to, subject, html, text }) {
  const t = getTransporter();
  const from = process.env.SMTP_FROM || 'Medical Research Digest <digest@localhost>';

  if (!t) {
    console.log('📧 [EMAIL LOG - SMTP not configured]');
    console.log('   To:', to);
    console.log('   Subject:', subject);
    console.log('   ---');
    return { success: true, logged: true };
  }

  const info = await t.sendMail({
    from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  });

  console.log(`📧 Digest sent to ${to}: ${info.messageId}`);
  return { success: true, messageId: info.messageId };
}

/**
 * Send an email verification link to a newly registered user.
 */
async function sendVerificationEmail({ to, name, token, appUrl }) {
  const t = getTransporter();
  const from = process.env.SMTP_FROM || 'MedResearch AI <noreply@localhost>';
  const link = `${appUrl}/verify-email?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <tr><td style="background:#4f46e5;padding:24px 32px;">
          <h1 style="color:#fff;font-size:20px;font-weight:bold;margin:0;">Verify your email</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:14px;color:#374151;margin:0 0 16px;">Hi ${escapeHtml(name || 'there')},</p>
          <p style="font-size:14px;color:#374151;margin:0 0 24px;">Click the button below to verify your email address. This link expires in 24 hours.</p>
          <a href="${link}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#fff;font-size:14px;font-weight:600;border-radius:8px;text-decoration:none;">Verify email address</a>
          <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;">Or copy this link: <span style="color:#4f46e5;">${link}</span></p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="font-size:12px;color:#9ca3af;margin:0;">If you didn't create an account, you can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  if (!t) {
    console.log('📧 [EMAIL LOG] Verification email for:', to);
    console.log('   Link:', link);
    return { success: true, logged: true };
  }

  const info = await t.sendMail({ from, to, subject: 'Verify your MedResearch AI account', html });
  return { success: true, messageId: info.messageId };
}

/**
 * Send a password reset link.
 */
async function sendPasswordResetEmail({ to, name, token, appUrl }) {
  const t = getTransporter();
  const from = process.env.SMTP_FROM || 'MedResearch AI <noreply@localhost>';
  const link = `${appUrl}/reset-password?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <tr><td style="background:#dc2626;padding:24px 32px;">
          <h1 style="color:#fff;font-size:20px;font-weight:bold;margin:0;">Reset your password</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:14px;color:#374151;margin:0 0 16px;">Hi ${escapeHtml(name || 'there')},</p>
          <p style="font-size:14px;color:#374151;margin:0 0 24px;">We received a request to reset your password. Click below to choose a new one. This link expires in <strong>1 hour</strong>.</p>
          <a href="${link}" style="display:inline-block;padding:12px 28px;background:#dc2626;color:#fff;font-size:14px;font-weight:600;border-radius:8px;text-decoration:none;">Reset password</a>
          <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;">Or copy this link: <span style="color:#dc2626;">${link}</span></p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="font-size:12px;color:#9ca3af;margin:0;">If you didn't request a password reset, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  if (!t) {
    console.log('📧 [EMAIL LOG] Password reset email for:', to);
    console.log('   Link:', link);
    return { success: true, logged: true };
  }

  const info = await t.sendMail({ from, to, subject: 'Reset your MedResearch AI password', html });
  return { success: true, messageId: info.messageId };
}

module.exports = {
  getTransporter,
  buildDigestHtml,
  sendDigestEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
