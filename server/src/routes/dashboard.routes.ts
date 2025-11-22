import express from 'express';
import { getKPIs, getDashboardData } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/kpis', getKPIs);
router.get('/data', getDashboardData);

export default router;

