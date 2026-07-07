'use strict';

function registerInvitationRoutes(router, ctx) {
  const {
    db,
    requireAuth,
    logActivity,
    createNotification,
    randomUUID,
  } = ctx;

  router.get('/invitations', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.all(
      'SELECT * FROM collab_invitations WHERE invitee_email = ? OR invited_by = ? ORDER BY created_at DESC',
      [req.user.email, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

  router.post('/invitations', requireAuth, async (req, res, next) => {
  try {
    const { collectionId, inviteeEmail, permission = 'read', message } = req.body;

    if (!collectionId || !inviteeEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const collection = await db.get('SELECT * FROM collab_collections WHERE id = ?', [collectionId]);
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    if (collection.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can invite' });

    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO collab_invitations (id, collection_id, collection_name, invited_by, invited_by_name, invitee_email, permission, message, status, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [id, collectionId, collection.name, req.user.id, req.user.name, inviteeEmail, permission, message?.trim() || null, expiresAt, now]
    );

    const invitation = await db.get('SELECT * FROM collab_invitations WHERE id = ?', [id]);
    res.status(201).json(invitation);
  } catch (err) {
    next(err);
  }
});

  router.post('/invitations/:invitationId/accept', requireAuth, async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const invitation = await db.get('SELECT * FROM collab_invitations WHERE id = ?', [invitationId]);

    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (invitation.invitee_email !== req.user.email) return res.status(403).json({ error: 'Not your invitation' });
    if (invitation.status !== 'pending') return res.status(400).json({ error: 'Invitation already processed' });
    if (new Date(invitation.expires_at) < new Date()) {
      await db.run('UPDATE collab_invitations SET status = ? WHERE id = ?', ['expired', invitationId]);
      return res.status(400).json({ error: 'Invitation expired' });
    }

    await db.run(
      `INSERT INTO collab_collection_collaborators (collection_id, user_id, user_name, email, permission, added_at, added_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (collection_id, user_id) DO NOTHING`,
      [invitation.collection_id, req.user.id, req.user.name, req.user.email, invitation.permission, new Date().toISOString(), invitation.invited_by]
    );
    await db.run('UPDATE collab_invitations SET status = ? WHERE id = ?', ['accepted', invitationId]);
    await db.run('UPDATE collab_collections SET updated_at = ? WHERE id = ?', [new Date().toISOString(), invitation.collection_id]);

    await logActivity({ type: 'member_joined', userId: req.user.id, userName: req.user.name, collectionId: invitation.collection_id });

    await createNotification(
      invitation.invited_by,
      'invitation_accepted',
      'Invitation accepted',
      `${req.user.name || 'Someone'} joined "${invitation.collection_name || 'your collection'}"`,
      invitation.collection_id
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

  router.post('/invitations/:invitationId/decline', requireAuth, async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const invitation = await db.get('SELECT * FROM collab_invitations WHERE id = ?', [invitationId]);

    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (invitation.invitee_email !== req.user.email) return res.status(403).json({ error: 'Not your invitation' });

    await db.run('UPDATE collab_invitations SET status = ? WHERE id = ?', ['declined', invitationId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

}

module.exports = { registerInvitationRoutes };
