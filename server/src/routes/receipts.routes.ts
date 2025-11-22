import express from 'express';
import {
  getReceipts,
  getReceipt,
  createReceipt,
  updateReceipt,
  validateReceipt,
} from '../controllers/receipts.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getReceipts);
router.get('/:id', getReceipt);
router.post('/', createReceipt);
router.put('/:id', updateReceipt);
router.post('/:id/validate', validateReceipt);

export default router;

