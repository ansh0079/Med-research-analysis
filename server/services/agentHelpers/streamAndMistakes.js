function isTransientStreamError(err) {
    if (!err) return false;
    const code = String(err.code || '').toUpperCase();
    const msg = String(err.message || '').toLowerCase();
    const statusMatch = msg.match(/\b(\d{3})\b/);
    const status = statusMatch ? Number(statusMatch[1]) : 0;
    if (['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
        return true;
    }
    if (status >= 500 || status === 429) return true;
    if (msg.includes('timeout')) return true;
    if (msg.includes('rate limit')) return true;
    if (msg.includes('temporarily unavailable')) return true;
    return false;
}

function formatAgentMistakesBlock(agentMistakes = []) {
    const rows = (Array.isArray(agentMistakes) ? agentMistakes : [])
        .filter((m) => m && (m.avoidClaim || m.correctVersion))
        .slice(0, 5);
    if (!rows.length) return '';
    const lines = rows.map((m, i) => {
        const avoid = String(m.avoidClaim || '').slice(0, 220);
        const correct = String(m.correctVersion || '').slice(0, 220);
        const times = m.timesRepeated != null ? ` (seen ${m.timesRepeated}×)` : '';
        return `${i + 1}. Avoid: ${avoid}${correct ? `\n   Prefer: ${correct}` : ''}${times}`;
    });
    return `\nAVOID PRIOR MISTAKES (user-corrected in past chats on this topic):\n${lines.join('\n')}\nDo not repeat these incorrect framings.`;
}

module.exports = {
    isTransientStreamError,
    formatAgentMistakesBlock,
};
