import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { uploadSampleImage } from '../middleware/uploadMiddleware.js';
import {
  listSamples,
  getSampleById,
  createSample,
  updateSample,
  updateSampleStatus,
  confirmAcceptance,
  getSamplePrefill,
  addSampleComment,
  deleteSampleComment,
  uploadSamplePhoto,
  downloadSamplePhoto,
  deleteSamplePhoto,
  getValidSampleTransitions,
  listSamplesByClient,
} from '../controllers/sampleController.js';

const router = express.Router();

router.get('/', authMiddleware, listSamples);
router.get('/transitions/:status', authMiddleware, getValidSampleTransitions);
router.get('/by-client/:clientId', authMiddleware, listSamplesByClient);
router.get('/photos/:id', authMiddleware, downloadSamplePhoto);
router.delete('/photos/:id', authMiddleware, deleteSamplePhoto);
router.get('/:id', authMiddleware, getSampleById);
router.get('/:id/prefill', authMiddleware, getSamplePrefill);
router.post('/', authMiddleware, createSample);
router.patch('/:id', authMiddleware, updateSample);
router.patch('/:id/status', authMiddleware, updateSampleStatus);
router.post('/:id/confirm-acceptance', authMiddleware, confirmAcceptance);
router.post('/:id/comments', authMiddleware, addSampleComment);
router.delete('/:sampleId/comments/:commentId', authMiddleware, deleteSampleComment);
router.post('/:id/photos', authMiddleware, uploadSampleImage.single('file'), uploadSamplePhoto);

export default router;
