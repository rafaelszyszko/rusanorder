import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  listNotifications,
  unreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  archiveNotification,
  archiveBulk,
  getPreferences,
  updatePreference,
  resetPreferences,
} from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', authMiddleware, listNotifications);
router.get('/unread-count', authMiddleware, unreadCount);
router.get('/preferences', authMiddleware, getPreferences);
router.patch('/preferences', authMiddleware, updatePreference);
router.post('/preferences/reset', authMiddleware, resetPreferences);
router.patch('/mark-all-read', authMiddleware, markAllAsRead);
router.post('/archive-bulk', authMiddleware, archiveBulk);
router.patch('/:id/read', authMiddleware, markAsRead);
router.patch('/:id/unread', authMiddleware, markAsUnread);
router.patch('/:id/archive', authMiddleware, archiveNotification);

export default router;
