import { connection } from '../config/db.js';
import { NOTIFICATION_TYPES, archiveOldRead } from '../services/notificationService.js';

function dbQuery(sql, params) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// GET /notifications - listar com filtros
export const listNotifications = async (req, res) => {
  await archiveOldRead().catch(() => {});

  const { type, status, search, date_from, date_to, limit } = req.query;
  const params = [req.user.id];
  const wheres = ['user_id = ?'];

  if (status === 'unread') {
    wheres.push('read_at IS NULL AND archived_at IS NULL');
  } else if (status === 'read') {
    wheres.push('read_at IS NOT NULL AND archived_at IS NULL');
  } else if (status === 'archived') {
    wheres.push('archived_at IS NOT NULL');
  } else {
    wheres.push('archived_at IS NULL');
  }

  if (type && type !== 'todos') {
    wheres.push('type = ?');
    params.push(type);
  }
  if (search) {
    wheres.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (date_from) {
    wheres.push('created_at >= ?');
    params.push(date_from);
  }
  if (date_to) {
    wheres.push('created_at <= ?');
    params.push(date_to + ' 23:59:59');
  }

  const where = `WHERE ${wheres.join(' AND ')}`;
  const limitClause = limit ? `LIMIT ${parseInt(limit, 10)}` : '';

  try {
    const rows = await dbQuery(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC ${limitClause}`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar notificações', error: err.message });
  }
};

// GET /notifications/unread-count - badge do sino (RF10.1, RF10.9)
export const unreadCount = async (req, res) => {
  try {
    const rows = await dbQuery(
      'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read_at IS NULL AND archived_at IS NULL',
      [req.user.id]
    );
    res.json({ count: rows[0].total });
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
};

// PATCH /notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const result = await dbQuery(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notificação marcada como lida', changed: result.affectedRows });
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
};

// PATCH /notifications/:id/unread
export const markAsUnread = async (req, res) => {
  try {
    await dbQuery(
      'UPDATE notifications SET read_at = NULL WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notificação marcada como não lida' });
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
};

// PATCH /notifications/mark-all-read
export const markAllAsRead = async (req, res) => {
  try {
    await dbQuery(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL AND archived_at IS NULL',
      [req.user.id]
    );
    res.json({ message: 'Todas as notificações marcadas como lidas' });
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
};

// PATCH /notifications/:id/archive
export const archiveNotification = async (req, res) => {
  try {
    await dbQuery(
      'UPDATE notifications SET archived_at = NOW() WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notificação arquivada' });
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
};

// POST /notifications/archive-bulk { ids: [] }
export const archiveBulk = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'IDs obrigatórios' });
  try {
    await dbQuery(
      'UPDATE notifications SET archived_at = NOW() WHERE id IN (?) AND user_id = ?',
      [ids, req.user.id]
    );
    res.json({ message: 'Notificações arquivadas' });
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
};

// GET /notifications/preferences
export const getPreferences = async (req, res) => {
  try {
    const rows = await dbQuery(
      'SELECT event_type, enabled FROM notification_preferences WHERE user_id = ?',
      [req.user.id]
    );
    const map = {};
    for (const t of NOTIFICATION_TYPES) map[t] = true;
    for (const row of rows) map[row.event_type] = Boolean(row.enabled);
    res.json(map);
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
};

// PATCH /notifications/preferences { event_type, enabled }
export const updatePreference = async (req, res) => {
  const { event_type, enabled } = req.body;
  if (!NOTIFICATION_TYPES.includes(event_type)) {
    return res.status(400).json({ message: 'Tipo de evento inválido' });
  }
  try {
    await dbQuery(
      `INSERT INTO notification_preferences (user_id, event_type, enabled) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
      [req.user.id, event_type, enabled ? 1 : 0]
    );
    res.json({ message: 'Preferência salva' });
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
};

// POST /notifications/preferences/reset - voltar para defaults
export const resetPreferences = async (req, res) => {
  try {
    await dbQuery('DELETE FROM notification_preferences WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Preferências restauradas' });
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
};
