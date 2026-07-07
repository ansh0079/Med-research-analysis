'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../server/middleware/auth', () => ({
    requireAuthJwt: (req, res, next) => {
        req.user = global.__testUser || { id: 'u1', email: 'owner@test.com' };
        next();
    },
}));

function buildApp(db) {
    // team.js's in-memory rate limiter buckets by user id only, shared across
    // every route on the router — reset the module per test so one test's
    // calls don't exhaust another test's budget for the same mock user.
    jest.resetModules();
    jest.doMock('../../server/middleware/auth', () => ({
        requireAuthJwt: (req, res, next) => {
            req.user = global.__testUser || { id: 'u1', email: 'owner@test.com' };
            next();
        },
    }));
    const { registerTeamRoutes } = require('../../server/routes/team');
    const app = express();
    app.use(express.json());
    registerTeamRoutes(app, { db });
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
    return app;
}

function makeDb(overrides = {}) {
    return {
        getUserTeams: jest.fn().mockResolvedValue([{ id: 'team-1', name: 'Oncology Group', member_count: 1 }]),
        createTeam: jest.fn().mockResolvedValue({ changes: 1 }),
        addTeamMember: jest.fn().mockResolvedValue({ changes: 1 }),
        getTeamById: jest.fn().mockResolvedValue({
            id: 'team-1', name: 'Oncology Group', owner_id: 'u1', plan: 'free', member_limit: 3,
        }),
        getTeamMembers: jest.fn().mockResolvedValue([
            { user_id: 'u1', role: 'owner', name: 'Owner', email: 'owner@test.com' },
        ]),
        createTeamActivity: jest.fn().mockResolvedValue({ changes: 1 }),
        getTeamActivity: jest.fn().mockResolvedValue([
            { id: 1, message: 'Created team "Oncology Group"', created_at: '2026-07-06T00:00:00.000Z', user_id: 'u1', user_name: 'Owner' },
        ]),
        createTeamAssignment: jest.fn().mockResolvedValue({ changes: 1 }),
        getTeamAssignments: jest.fn().mockResolvedValue([]),
        deleteTeamAssignment: jest.fn().mockResolvedValue({ changes: 1 }),
        ...overrides,
    };
}

describe('team routes', () => {
    afterEach(() => {
        delete global.__testUser;
    });

    // ── the app.locals.db injection bug ──────────────────────────────────────

    test('registerTeamRoutes wires deps.db onto app.locals.db so getDb(req) resolves', async () => {
        const db = makeDb();
        const app = buildApp(db);

        const res = await request(app).get('/api/teams');

        expect(res.status).toBe(200);
        expect(db.getUserTeams).toHaveBeenCalledWith('u1');
    });

    test('team routes 500 cleanly (not a TypeError) when no db is injected', async () => {
        const app = buildApp(undefined); // no db

        const res = await request(app).get('/api/teams');
        expect(res.status).toBe(500);
    });

    // ── existing routes (regression check for the fix above) ────────────────

    test('GET /api/teams lists teams for authenticated user', async () => {
        const db = makeDb();
        const app = buildApp(db);

        const res = await request(app).get('/api/teams');

        expect(res.status).toBe(200);
        expect(res.body.teams).toHaveLength(1);
    });

    test('POST /api/teams creates a team and adds the owner as a member', async () => {
        const db = makeDb();
        const app = buildApp(db);

        const res = await request(app).post('/api/teams').send({ name: 'New Lab' });

        expect(res.status).toBe(201);
        expect(db.createTeam).toHaveBeenCalled();
        expect(db.addTeamMember).toHaveBeenCalledWith(expect.any(String), 'u1', 'owner');
    });

    // ── new: activity feed ───────────────────────────────────────────────────

    describe('GET /api/teams/:teamId/activity', () => {
        test('returns the server-backed activity feed', async () => {
            const db = makeDb();
            const app = buildApp(db);

            const res = await request(app).get('/api/teams/team-1/activity');

            expect(res.status).toBe(200);
            expect(res.body.activity[0].message).toContain('Created team');
            expect(db.getTeamActivity).toHaveBeenCalledWith('team-1', 50);
        });

        test('403s for a non-member', async () => {
            const db = makeDb({
                getTeamById: jest.fn().mockResolvedValue({ id: 'team-1', owner_id: 'someone-else', member_limit: 3 }),
                getTeamMembers: jest.fn().mockResolvedValue([]),
            });
            const app = buildApp(db);

            const res = await request(app).get('/api/teams/team-1/activity');
            expect(res.status).toBe(403);
        });
    });

    // ── new: review assignments ──────────────────────────────────────────────

    describe('assignments', () => {
        test('GET /api/teams/:teamId/assignments lists assignments', async () => {
            const db = makeDb({
                getTeamAssignments: jest.fn().mockResolvedValue([
                    { id: 'a1', title: 'Screen ARDS trials', assignee_user_id: 'u1', assignee_name: 'Owner', due_date: '2026-08-01', status: 'open', created_at: '2026-07-06T00:00:00.000Z', created_by: 'u1' },
                ]),
            });
            const app = buildApp(db);

            const res = await request(app).get('/api/teams/team-1/assignments');

            expect(res.status).toBe(200);
            expect(res.body.assignments).toHaveLength(1);
            expect(res.body.assignments[0].assigneeName).toBe('Owner');
        });

        test('POST /api/teams/:teamId/assignments persists the assignment and logs activity', async () => {
            const db = makeDb();
            const app = buildApp(db);

            const res = await request(app)
                .post('/api/teams/team-1/assignments')
                .send({ title: 'Screen ARDS trials', assigneeUserId: 'u1', dueDate: '2026-08-01' });

            expect(res.status).toBe(201);
            expect(db.createTeamAssignment).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Screen ARDS trials',
                assigneeUserId: 'u1',
                dueDate: '2026-08-01',
                createdBy: 'u1',
            }));
            expect(db.createTeamActivity).toHaveBeenCalled();
        });

        test('POST rejects an assignee who is not a team member', async () => {
            const db = makeDb();
            const app = buildApp(db);

            const res = await request(app)
                .post('/api/teams/team-1/assignments')
                .send({ title: 'Screen trials', assigneeUserId: 'not-a-member' });

            expect(res.status).toBe(400);
            expect(db.createTeamAssignment).not.toHaveBeenCalled();
        });

        test('POST requires a non-empty title', async () => {
            const db = makeDb();
            const app = buildApp(db);

            const res = await request(app).post('/api/teams/team-1/assignments').send({ title: '  ' });
            expect(res.status).toBe(400);
        });

        test('DELETE /api/teams/:teamId/assignments/:id requires admin role', async () => {
            const db = makeDb({
                getTeamMembers: jest.fn().mockResolvedValue([
                    { user_id: 'u1', role: 'member', name: 'Member', email: 'm@test.com' },
                ]),
                getTeamById: jest.fn().mockResolvedValue({ id: 'team-1', owner_id: 'someone-else', member_limit: 3 }),
            });
            const app = buildApp(db);

            const res = await request(app).delete('/api/teams/team-1/assignments/a1');
            expect(res.status).toBe(403);
            expect(db.deleteTeamAssignment).not.toHaveBeenCalled();
        });

        test('DELETE succeeds for the team owner and logs activity', async () => {
            const db = makeDb();
            const app = buildApp(db);

            const res = await request(app).delete('/api/teams/team-1/assignments/a1');

            expect(res.status).toBe(204);
            expect(db.deleteTeamAssignment).toHaveBeenCalledWith('team-1', 'a1');
            expect(db.createTeamActivity).toHaveBeenCalled();
        });
    });
});
