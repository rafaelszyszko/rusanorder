import express from 'express';
import { authMiddleware, isAdmin } from '../middleware/authMiddleware.js';
import {
  getProfile,
  updateProfile,
  listUsers,
  listDeletedUsers,
  getUserById,
  getUserOrders,
  createUser,
  updateUser,
  deleteUser,
  restoreUser,
} from '../controllers/userController.js';

const router = express.Router();

// Perfil do próprio usuário
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

// Cadastro de usuários (qualquer autenticado)
router.post('/', authMiddleware, createUser);

// Admin - gerenciamento de usuários
router.get('/inactive', authMiddleware, isAdmin, listDeletedUsers);
router.get('/', authMiddleware, isAdmin, listUsers);
router.get('/:id', authMiddleware, isAdmin, getUserById);
router.get('/:id/orders', authMiddleware, isAdmin, getUserOrders);
router.put('/:id', authMiddleware, isAdmin, updateUser);
router.delete('/:id', authMiddleware, isAdmin, deleteUser);
router.patch('/:id/restore', authMiddleware, isAdmin, restoreUser);

export default router;
