import express from 'express';
import {
  getTransfers,
  getTransfer,
  createTransfer,
  updateTransfer,
  validateTransfer,
} from '../controllers/transfers.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getTransfers);
router.get('/:id', getTransfer);
router.post('/', createTransfer);
router.put('/:id', updateTransfer);
router.post('/:id/validate', validateTransfer);

export default router;

