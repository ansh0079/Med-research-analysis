'use strict';

const authSecurityStore = require('../../services/authSecurityStore');

const revokeToken = (token) => authSecurityStore.revokeToken(token);
const isTokenRevoked = (token) => authSecurityStore.isTokenRevoked(token);
const recordFailedLogin = (email) => authSecurityStore.recordFailedLogin(email);
const isLoginLocked = (email) => authSecurityStore.isLoginLocked(email);
const getLoginThrottleState = (email) => authSecurityStore.getLoginThrottleState(email);
const clearLoginAttempts = (email) => authSecurityStore.clearLoginAttempts(email);
const timingSafeEqualStrings = (a, b) => authSecurityStore.timingSafeEqualStrings(a, b);
const recordResetAttempt = (email) => authSecurityStore.recordResetAttempt(email);
const isResetLimited = (email) => authSecurityStore.isResetLimited(email);

module.exports = {
    revokeToken,
    isTokenRevoked,
    recordFailedLogin,
    isLoginLocked,
    getLoginThrottleState,
    clearLoginAttempts,
    timingSafeEqualStrings,
    recordResetAttempt,
    isResetLimited,
};
