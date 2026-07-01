import express from 'express';
import { authMiddleware, isAdmin } from '../middleware/authMiddleware.js';
import { listOrders, getOrderById, createOrder, updateOrder, updateOrderStatus, getValidTransitions, addComment, deleteComment, softDeleteOrder, listDeletedOrders, restoreOrder, permanentDeleteOrder } from '../controllers/orderController.js';

const router = express.Router();

router.get('/', authMiddleware, listOrders);
router.get('/transitions/:status', authMiddleware, getValidTransitions);
router.get('/trash/list', authMiddleware, listDeletedOrders);
router.get('/:id', authMiddleware, getOrderById);
router.post('/', authMiddleware, createOrder);
router.put('/:id', authMiddleware, updateOrder);
router.post('/:id/comments', authMiddleware, addComment);
router.delete('/:id/comments/:commentId', authMiddleware, deleteComment);
router.patch('/:id/status', authMiddleware, updateOrderStatus);
router.patch('/:id/restore', authMiddleware, restoreOrder);
router.delete('/:id/permanent', authMiddleware, permanentDeleteOrder);
router.delete('/:id', authMiddleware, softDeleteOrder);

export default router;
