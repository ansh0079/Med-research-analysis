'use strict';

function shouldAutoSeedFromSearch() {
    const flag = String(process.env.AUTO_SEED_ON_SEARCH || '').toLowerCase();
    if (flag === 'false' || flag === '0') return false;
    return true;
}

module.exports = { shouldAutoSeedFromSearch };
