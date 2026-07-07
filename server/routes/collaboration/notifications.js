'use strict';

function registerNotificationRoutes(router, ctx) {
  const {
    db,
    requireAuth,
  } = ctx;

  router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.all(
      'SELECT * FROM collab_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      body: r.body,
      isRead: Boolean(r.is_read),
      relatedCollectionId: r.related_collection_id || null,
      createdAt: r.created_at,
    })));
  } catch (err) {
    next(err);
  }
});

  router.post('/notifications/:notificationId/read', requireAuth, async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const row = await db.get('SELECT * FROM collab_notifications WHERE id = ?', [notificationId]);

    if (!row) return res.status(404).json({ error: 'Notification not found' });
    if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Not your notification' });

    await db.run('UPDATE collab_notifications SET is_read = 1 WHERE id = ?', [notificationId]);
    res.json({ ...row, isRead: true });
  } catch (err) {
    next(err);
  }
});

}

module.exports = { registerNotificationRoutes };
