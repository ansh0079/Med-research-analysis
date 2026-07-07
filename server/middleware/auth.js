'use strict';

const { revokeAllUserRefreshTokens } = require('../services/refreshTokenService');

const tokens = require('../lib/auth/tokens');
const trial = require('../lib/auth/trial');
const oauth = require('../lib/auth/oauth');
const security = require('../lib/auth/security');
const accessTokenVersion = require('../lib/auth/accessTokenVersion');
const middleware = require('../lib/auth/middleware');

module.exports = {
    ...tokens,
    ...trial,
    ...oauth,
    ...security,
    ...accessTokenVersion,
    ...middleware,
    revokeAllUserRefreshTokens,
};
