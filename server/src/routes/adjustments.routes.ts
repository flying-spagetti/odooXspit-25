import express from 'express';
import {
  getAdjustments,
  getAdjustment,
  createAdjustment,
  updateAdjustment,
  validateAdjustment,
} from '../controllers/adjustments.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAdjustments);
router.get('/:id', getAdjustment);
router.post('/', createAdjustment);
router.put('/:id', updateAdjustment);
router.post('/:id/validate', validateAdjustment);

export default router;

