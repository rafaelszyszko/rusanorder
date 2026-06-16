import { connection } from '../config/db.js';

function dbQuery(sql, params) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

const VALID_TYPES = [
  'new_order',
  'status_change',
  'comment_received',
  'production_delay',
  'sample_return',
  'sample_no_return',
  'sample_acceptance',
];

export const NOTIFICATION_TYPES = VALID_TYPES;

async function userWantsType(userId, type) {
  if (!VALID_TYPES.includes(type)) return false;
  const rows = await dbQuery(
    'SELECT enabled FROM notification_preferences WHERE user_id = ? AND event_type = ?',
    [userId, type]
  );
  if (rows.length === 0) return true;
  return Boolean(rows[0].enabled);
}

export async function createNotification({ userId, type, title, description, resourceType, resourceId }) {
  if (!userId || !VALID_TYPES.includes(type)) return null;
  const wants = await userWantsType(userId, type);
  if (!wants) return null;
  const result = await dbQuery(
    `INSERT INTO notifications (user_id, type, title, description, resource_type, resource_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, title, description || null, resourceType, resourceId]
  );
  return result.insertId;
}

export async function createNotificationsForAdmins({ type, title, description, resourceType, resourceId, excludeUserId }) {
  const rows = await dbQuery(
    `SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL`
  );
  const targets = rows
    .map((r) => r.id)
    .filter((id) => id !== excludeUserId);
  for (const userId of targets) {
    await createNotification({ userId, type, title, description, resourceType, resourceId });
  }
}

// Auto-arquivar notificações lidas há mais de 30 dias (RF10.8)
export async function archiveOldRead() {
  await dbQuery(
    `UPDATE notifications
     SET archived_at = NOW()
     WHERE archived_at IS NULL
       AND read_at IS NOT NULL
       AND read_at < (NOW() - INTERVAL 30 DAY)`
  );
}
