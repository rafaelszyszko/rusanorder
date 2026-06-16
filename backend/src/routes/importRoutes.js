import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { uploadPdf } from '../middleware/uploadMiddleware.js';
import {
  createSession,
  uploadPdf as uploadPdfHandler,
  getImport,
  downloadPdf,
  confirmImport,
  skipImport,
  reprocessImport,
  listImports,
  getImportByOrder,
} from '../controllers/importController.js';

const router = express.Router();

router.get('/', authMiddleware, listImports);
router.get('/order/:orderId', authMiddleware, getImportByOrder);
router.post('/sessions', authMiddleware, createSession);
router.post('/sessions/:sessionId/files', authMiddleware, uploadPdf.single('file'), uploadPdfHandler);
router.get('/:id', authMiddleware, getImport);
router.get('/:id/file', authMiddleware, downloadPdf);
router.post('/:id/confirm', authMiddleware, confirmImport);
router.patch('/:id/skip', authMiddleware, skipImport);
router.post('/:id/reprocess', authMiddleware, reprocessImport);

export default router;
