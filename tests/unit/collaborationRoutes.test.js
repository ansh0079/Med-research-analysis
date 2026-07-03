// ==========================================
// Unit Tests for Collaboration Routes
// ==========================================

const express = require('express');
const request = require('supertest');

jest.mock('../../server/middleware/auth', () => ({
    requireAuthJwt: (req, res, next) => {
        req.user = global.__testUser || { id: 'u1', name: 'Test User', email: 'u1@test.com' };
        next();
    },
}));

const mockDb = {
    get: jest.fn(),
    all: jest.fn(),
    run: jest.fn(),
};
jest.mock('../../database', () => mockDb);

const { collaborationRoutes } = require('../../server/collaboration-routes');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/collaboration', collaborationRoutes);
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
    return app;
}

describe('collaborationRoutes', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        global.__testUser = { id: 'u1', name: 'Test User', email: 'u1@test.com' };
        app = buildApp();
        mockDb.run.mockResolvedValue({ changes: 1 });
        mockDb.all.mockResolvedValue([]); // e.g. getCommentReactions/enrichCollection sub-queries
    });

    describe('POST /comments/:commentId/reactions — ON CONFLICT idempotency', () => {
        test('adding the same reaction twice does not throw', async () => {
            mockDb.get.mockImplementation((sql) => {
                if (sql.includes('FROM collab_comments WHERE id')) {
                    return Promise.resolve({ id: 'c1', user_id: 'other-user', collection_id: null });
                }
                return Promise.resolve(null);
            });

            const first = await request(app).post('/api/collaboration/comments/c1/reactions').send({ emoji: '👍' });
            const second = await request(app).post('/api/collaboration/comments/c1/reactions').send({ emoji: '👍' });

            expect(first.status).toBe(200);
            expect(second.status).toBe(200);

            const reactionInsertCall = mockDb.run.mock.calls.find(([sql]) => sql.includes('INSERT INTO collab_comment_reactions'));
            expect(reactionInsertCall[0]).toContain('ON CONFLICT');
            expect(reactionInsertCall[0]).not.toContain('INSERT OR IGNORE');
        });
    });

    describe('POST /invitations/:invitationId/accept — idempotency', () => {
        test('accepting when the collaborator row already exists does not throw', async () => {
            mockDb.get.mockImplementation((sql) => {
                if (sql.includes('FROM collab_invitations WHERE id')) {
                    return Promise.resolve({
                        id: 'inv1',
                        collection_id: 'col1',
                        collection_name: 'My Collection',
                        invited_by: 'owner1',
                        invitee_email: 'u1@test.com',
                        permission: 'read',
                        status: 'pending',
                        expires_at: new Date(Date.now() + 86400000).toISOString(),
                    });
                }
                return Promise.resolve(null);
            });

            const res = await request(app).post('/api/collaboration/invitations/inv1/accept');

            expect(res.status).toBe(200);
            const collaboratorInsertCall = mockDb.run.mock.calls.find(([sql]) => sql.includes('INSERT INTO collab_collection_collaborators'));
            expect(collaboratorInsertCall[0]).toContain('ON CONFLICT');
            expect(collaboratorInsertCall[0]).not.toContain('INSERT OR IGNORE');
        });
    });

    describe('GET/POST /comments — permission gating', () => {
        test('GET with a collectionId the user has no access to returns 403', async () => {
            mockDb.get.mockImplementation((sql) => {
                if (sql.includes('FROM collab_collections WHERE id')) {
                    return Promise.resolve({ id: 'col1', owner_id: 'someone-else' });
                }
                if (sql.includes('FROM collab_collection_collaborators WHERE collection_id')) {
                    return Promise.resolve(null); // not a collaborator
                }
                return Promise.resolve(null);
            });

            const res = await request(app).get('/api/collaboration/comments?collectionId=col1');
            expect(res.status).toBe(403);
        });

        test('POST with a collectionId the user only has read access to returns 403', async () => {
            mockDb.get.mockImplementation((sql) => {
                if (sql.includes('FROM collab_collections WHERE id')) {
                    return Promise.resolve({ id: 'col1', owner_id: 'someone-else', name: 'Col' });
                }
                if (sql.includes('FROM collab_collection_collaborators WHERE collection_id')) {
                    return Promise.resolve({ user_id: 'u1', permission: 'read' });
                }
                return Promise.resolve(null);
            });

            const res = await request(app)
                .post('/api/collaboration/comments')
                .send({ collectionId: 'col1', content: 'hello' });
            expect(res.status).toBe(403);
        });

        test('GET/POST with no collectionId (article-only scope) stays open', async () => {
            mockDb.all.mockResolvedValue([]);
            mockDb.get.mockResolvedValue(null);

            const res = await request(app).get('/api/collaboration/comments?articleId=art1');
            expect(res.status).toBe(200);
        });
    });

    describe('POST /comments — sanitization', () => {
        test('script content is escaped, not stored raw', async () => {
            mockDb.get.mockImplementation((sql) => {
                if (sql.includes('FROM collab_comments WHERE id')) {
                    return Promise.resolve({ id: 'new-id', article_id: 'art1', content: '&lt;script&gt;alert(1)&lt;/script&gt;', user_id: 'u1' });
                }
                return Promise.resolve(null);
            });

            const res = await request(app)
                .post('/api/collaboration/comments')
                .send({ articleId: 'art1', content: '<script>alert(1)</script>' });

            expect(res.status).toBe(201);
            const insertCall = mockDb.run.mock.calls.find(([sql]) => sql.includes('INSERT INTO collab_comments'));
            const insertedContent = insertCall[1][6]; // content param position in the VALUES list
            expect(insertedContent).not.toContain('<script>');
        });

        test('POST with only collectionId (no articleId) succeeds via the sentinel placeholder', async () => {
            mockDb.get.mockImplementation((sql) => {
                if (sql.includes('FROM collab_collections WHERE id')) {
                    return Promise.resolve({ id: 'col1', owner_id: 'u1', name: 'Col' });
                }
                if (sql.includes('FROM collab_comments WHERE id')) {
                    return Promise.resolve({ id: 'new-id', article_id: 'collection:col1', content: 'hi', user_id: 'u1' });
                }
                return Promise.resolve(null);
            });

            const res = await request(app)
                .post('/api/collaboration/comments')
                .send({ collectionId: 'col1', content: 'hi' });

            expect(res.status).toBe(201);
            const insertCall = mockDb.run.mock.calls.find(([sql]) => sql.includes('INSERT INTO collab_comments'));
            expect(insertCall[1][1]).toBe('collection:col1'); // article_id param
        });
    });

    describe('Notification creation', () => {
        test('POST /collections/:id/share inserts a notification when the invitee has an account', async () => {
            mockDb.get.mockImplementation((sql) => {
                if (sql.includes('FROM collab_collections WHERE id')) {
                    return Promise.resolve({ id: 'col1', owner_id: 'u1', name: 'Col' });
                }
                if (sql.includes('FROM collab_invitations WHERE collection_id')) {
                    return Promise.resolve(null); // no existing pending invite
                }
                if (sql.includes('FROM users WHERE email')) {
                    return Promise.resolve({ id: 'invitee-1' });
                }
                if (sql.includes('FROM collab_invitations WHERE id')) {
                    return Promise.resolve({ id: 'inv1', collection_id: 'col1', invitee_email: 'friend@test.com' });
                }
                return Promise.resolve(null);
            });

            const res = await request(app)
                .post('/api/collaboration/collections/col1/share')
                .send({ userEmail: 'friend@test.com', permission: 'read' });

            expect(res.status).toBe(201);
            const notificationInsert = mockDb.run.mock.calls.find(([sql]) => sql.includes('INSERT INTO collab_notifications'));
            expect(notificationInsert).toBeTruthy();
            expect(notificationInsert[1][1]).toBe('invitee-1');
        });

        test('POST /comments with a parentId notifies the parent comment author', async () => {
            mockDb.get.mockImplementation((sql) => {
                if (sql.includes("SELECT user_id FROM collab_comments WHERE id = ?")) {
                    return Promise.resolve({ user_id: 'parent-author' });
                }
                if (sql.includes('FROM collab_comments WHERE id')) {
                    return Promise.resolve({ id: 'reply-1', article_id: 'art1', content: 'a reply', user_id: 'u1' });
                }
                return Promise.resolve(null);
            });

            const res = await request(app)
                .post('/api/collaboration/comments')
                .send({ articleId: 'art1', content: 'a reply', parentId: 'parent-1' });

            expect(res.status).toBe(201);
            const notificationInsert = mockDb.run.mock.calls.find(([sql]) => sql.includes('INSERT INTO collab_notifications'));
            expect(notificationInsert).toBeTruthy();
            expect(notificationInsert[1][1]).toBe('parent-author');
        });
    });
});
