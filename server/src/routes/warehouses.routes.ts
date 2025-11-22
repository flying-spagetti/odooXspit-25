import express from 'express';
import {
  getWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
} from '../controllers/warehouses.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getWarehouses);
router.get('/:id', getWarehouse);
router.post('/', createWarehouse);
router.put('/:id', updateWarehouse);

export default router;

