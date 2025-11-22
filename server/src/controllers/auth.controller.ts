import { Response } from 'express';
import pool from '../config/database.js';
import { hashPassword, comparePassword, generateOTP } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

export const signup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, name, password, role } = req.body;

  if (!email || !name || !password || !role) {
    return res.status(400).json({
      status: 'error',
      message: 'All fields are required',
    });
  }

  // Check if user exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'User already exists',
    });
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const result = await pool.query(
    `INSERT INTO users (email, name, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role, created_at`,
    [email, name, passwordHash, role]
  );

  const user = result.rows[0];

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  res.status(201).json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    },
  });
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email and password are required',
    });
  }

  // Find user
  const result = await pool.query(
    'SELECT id, email, name, password_hash, role FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid credentials',
    });
  }

  const user = result.rows[0];

  // Verify password
  const isValid = await comparePassword(password, user.password_hash);

  if (!isValid) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid credentials',
    });
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  res.json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    },
  });
});

export const forgotPassword = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required',
      });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if user exists for security
      return res.json({
        status: 'success',
        message: 'If the email exists, an OTP has been sent',
      });
    }

    const userId = userResult.rows[0].id;

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry

    // Store OTP
    await pool.query(
      `INSERT INTO password_resets (user_id, otp, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, otp, expiresAt]
    );

    // In production, send email here
    console.log(`OTP for ${email}: ${otp}`);

    res.json({
      status: 'success',
      message: 'OTP sent to email (check console for development)',
      // Remove this in production
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  }
);

export const resetPassword = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Email, OTP, and new password are required',
      });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const userId = userResult.rows[0].id;

    // Verify OTP
    const otpResult = await pool.query(
      `SELECT id FROM password_resets
       WHERE user_id = $1 AND otp = $2 AND expires_at > NOW() AND used = FALSE
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, otp]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired OTP',
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      passwordHash,
      userId,
    ]);

    // Mark OTP as used
    await pool.query(
      'UPDATE password_resets SET used = TRUE WHERE id = $1',
      [otpResult.rows[0].id]
    );

    res.json({
      status: 'success',
      message: 'Password reset successfully',
    });
  }
);

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authenticated',
    });
  }

  const result = await pool.query(
    'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );

  res.json({
    status: 'success',
    data: {
      user: result.rows[0],
    },
  });
});

