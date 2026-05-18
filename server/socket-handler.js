/**
 * Socket.io Handler for Real-time Collaboration
 */
const cookie = require('cookie');
const { verifyToken, COOKIE_NAME } = require('./middleware/auth');
const logger = require('./config/logger');

const MAX_ARTICLE_ID_LENGTH = 64;
const MAX_DISPLAY_NAME_LENGTH = 64;
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N}\s._-]+$/u;

function sanitizeArticleId(raw) {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > MAX_ARTICLE_ID_LENGTH) return null;
    // Allow PubMed IDs, DOIs, UUIDs, and common identifier characters
    if (!/^[\w\-:.]+$/.test(trimmed)) return null;
    return trimmed;
}

function sanitizeDisplayName(raw) {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > MAX_DISPLAY_NAME_LENGTH) return null;
    if (!DISPLAY_NAME_PATTERN.test(trimmed)) return null;
    return trimmed;
}

module.exports = function setupSocketHandlers(io) {
    const roomUsers = new Map();

    const emitPresence = (articleId) => {
        const room = `article:${articleId}`;
        const users = Array.from(roomUsers.get(room)?.values() || []);
        io.to(room).emit('presence:update', users);
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

        socket.on('join-article', (articleId, displayName) => {
            const sanitizedId = sanitizeArticleId(articleId);
            if (!sanitizedId) {
                socket.emit('error', { message: 'Invalid article ID' });
                return;
            }
            const name = sanitizeDisplayName(displayName) || userName;
            const room = `article:${sanitizedId}`;
            socket.join(room);
            socket.data.rooms.add(room);
            if (!roomUsers.has(room)) {
                roomUsers.set(room, new Map());
            }
            roomUsers.get(room).set(socket.id, { name, userId: socket.data.user?.id });
            logger.info({ userId: socket.data.user?.id, room: sanitizedId }, 'Socket user joined article room');
            emitPresence(sanitizedId);
        });

        socket.on('leave-article', (articleId) => {
            const sanitizedId = sanitizeArticleId(articleId);
            if (!sanitizedId) return;
            const room = `article:${sanitizedId}`;
            socket.leave(room);
            socket.data.rooms.delete(room);
            const users = roomUsers.get(room);
            if (users) {
                users.delete(socket.id);
                if (users.size === 0) {
                    roomUsers.delete(room);
                }
            }
            logger.info({ userId: socket.data.user?.id, room: sanitizedId }, 'Socket user left article room');
            emitPresence(sanitizedId);
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
            for (const room of socket.data.rooms || []) {
                const users = roomUsers.get(room);
                if (users) {
                    users.delete(socket.id);
                    if (users.size === 0) {
                        roomUsers.delete(room);
                    }
                    if (room.startsWith('article:')) {
                        emitPresence(room.replace('article:', ''));
                    }
                }
            }
            logger.info({ socketId: socket.id, userId: socket.data.user?.id }, 'Socket user disconnected');
        });
    });

    // Return a helper to broadcast from REST routes
    return {
        broadcastAnnotation: (articleId, annotation) => {
            const sanitizedId = sanitizeArticleId(articleId);
            if (!sanitizedId) return;
            io.to(`article:${sanitizedId}`).emit('annotation:new', annotation);
        }
    };
};
