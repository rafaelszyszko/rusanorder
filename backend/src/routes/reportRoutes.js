import express from 'express';
import { authMiddleware, isAdmin } from '../middleware/authMiddleware.js';
import { getDashboardStats, getAdminDashboardStats, globalSearch } from '../controllers/reportController.js';

const router = express.Router();

router.get('/dashboard', authMiddleware, getDashboardStats);
router.get('/search', authMiddleware, globalSearch);
router.get('/admin-dashboard', authMiddleware, isAdmin, getAdminDashboardStats);

export default router;
