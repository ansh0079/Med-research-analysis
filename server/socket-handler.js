/**
 * Socket.io Handler for Real-time Collaboration
 */
const cookie = require('cookie');
const { verifyToken, COOKIE_NAME } = require('./middleware/auth');
const logger = require('./config/logger');

const MAX_ARTICLE_ID_LENGTH = 64;
const MAX_REVIEW_ID_LENGTH = 64;
const MAX_DISPLAY_NAME_LENGTH = 64;
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N}\s._-]+$/u;

function sanitizeArticleId(raw) {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > MAX_ARTICLE_ID_LENGTH) return null;
    if (!/^[\w\-:.]+$/.test(trimmed)) return null;
    return trimmed;
}

function sanitizeReviewId(raw) {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > MAX_REVIEW_ID_LENGTH) return null;
    if (!/^[\w-]+$/.test(trimmed)) return null;
    return trimmed;
}

function sanitizeDisplayName(raw) {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > MAX_DISPLAY_NAME_LENGTH) return null;
    if (!DISPLAY_NAME_PATTERN.test(trimmed)) return null;
    return trimmed;
}

module.exports = function setupSocketHandlers(io, options = {}) {
    const { canAccessReview = null } = options;
    const roomUsers = new Map();

    const emitPresence = (roomKey, eventName = 'presence:update') => {
        const users = Array.from(roomUsers.get(roomKey)?.values() || []).map((u) => u.name);
        io.to(roomKey).emit(eventName, users);
    };

    io.use((socket, next) => {
        try {
            const cookieHeader = socket.handshake.headers.cookie || '';
            const parsed = cookie.parse(cookieHeader);
            const token = parsed[COOKIE_NAME];
            if (!token) {
                return next(new Error('Authentication required'));
            }
            const decoded = verifyToken(token);
            if (!decoded) {
                return next(new Error('Invalid or expired token'));
            }
            socket.data.user = {
                id: decoded.id,
                name: decoded.name,
                email: decoded.email,
                role: decoded.role || 'user',
            };
            next();
        } catch {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        const userName = sanitizeDisplayName(socket.data.user?.name) || 'Researcher';
        logger.info({ socketId: socket.id, userId: socket.data.user?.id }, 'Socket user connected');
        socket.data.rooms = new Set();

        const joinRoom = (roomKey, displayName, presenceEvent) => {
            const name = sanitizeDisplayName(displayName) || userName;
            socket.join(roomKey);
            socket.data.rooms.add(roomKey);
            if (!roomUsers.has(roomKey)) {
                roomUsers.set(roomKey, new Map());
            }
            roomUsers.get(roomKey).set(socket.id, { name, userId: socket.data.user?.id });
            emitPresence(roomKey, presenceEvent);
        };

        const leaveRoom = (roomKey, presenceEvent) => {
            socket.leave(roomKey);
            socket.data.rooms.delete(roomKey);
            const users = roomUsers.get(roomKey);
            if (users) {
                users.delete(socket.id);
                if (users.size === 0) {
                    roomUsers.delete(roomKey);
                }
            }
            emitPresence(roomKey, presenceEvent);
        };

        socket.on('join-article', (articleId, displayName) => {
            const sanitizedId = sanitizeArticleId(articleId);
            if (!sanitizedId) {
                socket.emit('error', { message: 'Invalid article ID' });
                return;
            }
            joinRoom(`article:${sanitizedId}`, displayName, 'presence:update');
            logger.info({ userId: socket.data.user?.id, room: sanitizedId }, 'Socket user joined article room');
        });

        socket.on('leave-article', (articleId) => {
            const sanitizedId = sanitizeArticleId(articleId);
            if (!sanitizedId) return;
            leaveRoom(`article:${sanitizedId}`, 'presence:update');
            logger.info({ userId: socket.data.user?.id, room: sanitizedId }, 'Socket user left article room');
        });

        socket.on('join-review', async (reviewId, displayName) => {
            const sanitizedId = sanitizeReviewId(reviewId);
            if (!sanitizedId) {
                socket.emit('error', { message: 'Invalid review ID' });
                return;
            }
            if (canAccessReview) {
                try {
                    const allowed = await canAccessReview(socket.data.user?.id, sanitizedId);
                    if (!allowed) {
                        socket.emit('error', { message: 'Access denied' });
                        return;
                    }
                } catch (err) {
                    logger.warn({ err, reviewId: sanitizedId }, 'Review access check failed');
                    socket.emit('error', { message: 'Access check failed' });
                    return;
                }
            }
            joinRoom(`review:${sanitizedId}`, displayName, 'review:presence');
            logger.info({ userId: socket.data.user?.id, reviewId: sanitizedId }, 'Socket user joined review room');
        });

        socket.on('leave-review', (reviewId) => {
            const sanitizedId = sanitizeReviewId(reviewId);
            if (!sanitizedId) return;
            leaveRoom(`review:${sanitizedId}`, 'review:presence');
        });

        socket.on('typing:start', (articleId, displayName) => {
            const sanitizedId = sanitizeArticleId(articleId);
            if (!sanitizedId) return;
            const name = sanitizeDisplayName(displayName) || userName;
            socket.to(`article:${sanitizedId}`).emit('typing:status', { userName: name, isTyping: true });
        });

        socket.on('typing:stop', (articleId) => {
            const sanitizedId = sanitizeArticleId(articleId);
            if (!sanitizedId) return;
            socket.to(`article:${sanitizedId}`).emit('typing:status', { isTyping: false });
        });

        socket.on('disconnect', () => {
            for (const roomKey of socket.data.rooms || []) {
                const users = roomUsers.get(roomKey);
                if (users) {
                    users.delete(socket.id);
                    if (users.size === 0) {
                        roomUsers.delete(roomKey);
                    }
                    const event = roomKey.startsWith('review:') ? 'review:presence' : 'presence:update';
                    emitPresence(roomKey, event);
                }
            }
            logger.info({ socketId: socket.id, userId: socket.data.user?.id }, 'Socket user disconnected');
        });
    });

    return {
        broadcastAnnotation: (articleId, annotation) => {
            const sanitizedId = sanitizeArticleId(articleId);
            if (!sanitizedId) return;
            io.to(`article:${sanitizedId}`).emit('annotation:new', annotation);
        },
        broadcastScreeningUpdate: (reviewId, payload) => {
            const sanitizedId = sanitizeReviewId(reviewId);
            if (!sanitizedId) return;
            io.to(`review:${sanitizedId}`).emit('screening:update', payload);
        },
    };
};
