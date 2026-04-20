import express from 'express';
import { getCapsules, getCapsuleById, createCapsule, deleteCapsule } from '../controllers/capsuleController.js';

const router = express.Router();

// Defined routes for /api/capsules
router.get('/', getCapsules);
router.get('/:id', getCapsuleById);
router.post('/', createCapsule);
router.delete('/:id', deleteCapsule);

export default router;
