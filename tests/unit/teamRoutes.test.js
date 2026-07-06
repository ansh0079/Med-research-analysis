const express = require('express');
const request = require('supertest');
const { registerTeamRoutes } = require('../../server/controllers/teamRoutes');

const requireAuthJwt = (req, _res, next) => {
  req.user = { id: 'u1', email: 't@test.com', role: 'user', emailVerified: true };
  next();
};

describe('team routes', () => {
  let app;
  let db;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';

    app = express();
    app.use(express.json());

    db = {
      createTeam: jest.fn().mockResolvedValue({ changes: 1 }),
      addTeamMember: jest.fn().mockResolvedValue({ changes: 1 }),
      getTeamById: jest.fn().mockResolvedValue({
        id: 'team-1',
        name: 'Oncology Group',
        owner_id: 'u1',
        plan: 'free',
        member_limit: 3,
      }),
      getUserTeams: jest.fn().mockResolvedValue([{ id: 'team-1', name: 'Oncology Group', member_count: 1 }]),
      getTeamMembers: jest.fn().mockResolvedValue([
        { user_id: 'u1', role: 'owner', name: 'Owner', email: 'owner@test.com' },
      ]),
      createTeamActivity: jest.fn().mockResolvedValue({ changes: 1 }),
      getTeamActivity: jest.fn().mockResolvedValue([
        { id: 1, message: 'Created team "Oncology Group"', created_at: '2026-07-06T00:00:00.000Z', user_id: 'u1', user_name: 'Owner' },
      ]),
      createTeamAssignment: jest.fn().mockResolvedValue({ changes: 1 }),
      getTeamAssignments: jest.fn().mockResolvedValue([]),
    };

    registerTeamRoutes(app, { db, requireAuthJwt });
  });

  test('GET /api/teams lists teams for authenticated user', async () => {
    const res = await request(app).get('/api/teams');

    expect(res.status).toBe(200);
    expect(res.body.teams).toHaveLength(1);
    expect(db.getUserTeams).toHaveBeenCalledWith('u1');
  });

  test('POST /api/teams creates a team and logs activity', async () => {
    const res = await request(app)
      .post('/api/teams')
      .send({ name: 'New Lab' });

    expect(res.status).toBe(201);
    expect(db.createTeam).toHaveBeenCalled();
    expect(db.addTeamMember).toHaveBeenCalled();
    expect(db.createTeamActivity).toHaveBeenCalled();
  });

  test('GET /api/teams/:teamId/activity returns server-backed feed', async () => {
    const res = await request(app).get('/api/teams/team-1/activity');

    expect(res.status).toBe(200);
    expect(res.body.activity[0].message).toContain('Created team');
    expect(db.getTeamActivity).toHaveBeenCalledWith('team-1', 50);
  });

  test('POST /api/teams/:teamId/assignments persists assignment', async () => {
    const res = await request(app)
      .post('/api/teams/team-1/assignments')
      .send({ title: 'Screen ARDS trials', assigneeUserId: 'u1', dueDate: '2026-08-01' });

    expect(res.status).toBe(201);
    expect(db.createTeamAssignment).toHaveBeenCalled();
    expect(db.createTeamActivity).toHaveBeenCalled();
  });
});
