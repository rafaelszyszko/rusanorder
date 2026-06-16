import express from 'express';
import { authMiddleware, isAdmin } from '../middleware/authMiddleware.js';
import { listClients, getClientById, createClient, updateClient, deleteClient, getClientHistory } from '../controllers/clientController.js';

const router = express.Router();

router.get('/', authMiddleware, listClients);
router.get('/:id', authMiddleware, getClientById);
router.get('/:id/history', authMiddleware, getClientHistory);
router.post('/', authMiddleware, createClient);
router.put('/:id', authMiddleware, updateClient);
router.delete('/:id', authMiddleware, isAdmin, deleteClient);

export default router;
