import express from 'express';
import {
  getDeliveries,
  getDelivery,
  createDelivery,
  updateDelivery,
  validateDelivery,
} from '../controllers/deliveries.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getDeliveries);
router.get('/:id', getDelivery);
router.post('/', createDelivery);
router.put('/:id', updateDelivery);
router.post('/:id/validate', validateDelivery);

export default router;

