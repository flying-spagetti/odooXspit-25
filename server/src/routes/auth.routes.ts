import express from 'express';
import {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  requestLoginOTP,
  verifyLoginOTP,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/login/request-otp', requestLoginOTP);
router.post('/login/verify-otp', verifyLoginOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);

export default router;

