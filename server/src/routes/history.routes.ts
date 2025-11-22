import express from 'express';
import { getHistory } from '../controllers/history.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getHistory);

export default router;

