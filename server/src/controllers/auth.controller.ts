import { Response } from 'express';
import pool from '../config/database.js';
import { hashPassword, comparePassword, generateOTP, hashOTP, verifyOTP } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { isValidEmail, isStrongPassword, sanitizeString, isValidRole } from '../utils/validation.js';
import { sendOTPEmail } from '../utils/email.js';

export const signup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, name, password, role } = req.body;

  if (!email || !name || !password || !role) {
    return res.status(400).json({
      status: 'error',
      message: 'All fields are required',
    });
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid email format',
    });
  }

  // Validate password strength
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      status: 'error',
      message: 'Password must be at least 8 characters with uppercase, lowercase, and a number',
    });
  }

  // Validate role
  if (!isValidRole(role)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid role. Must be inventory_manager or warehouse_staff',
    });
  }

  // Sanitize inputs
  const sanitizedEmail = sanitizeString(email).toLowerCase();
  const sanitizedName = sanitizeString(name);

  // Check if user exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [sanitizedEmail]
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
    [sanitizedEmail, sanitizedName, passwordHash, role]
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

  // Validate email format
  if (!isValidEmail(email)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid email format',
    });
  }

  // Sanitize email
  const sanitizedEmail = sanitizeString(email).toLowerCase();

  // Find user
  const result = await pool.query(
    'SELECT id, email, name, password_hash, role FROM users WHERE email = $1',
    [sanitizedEmail]
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

// Request OTP for login
export const requestLoginOTP = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format',
      });
    }

    // Sanitize email
    const sanitizedEmail = sanitizeString(email).toLowerCase();

    // Find user
    const userResult = await pool.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [sanitizedEmail]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if user exists for security
      return res.json({
        status: 'success',
        message: 'If the email exists, an OTP has been sent',
      });
    }

    const user = userResult.rows[0];

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Hash OTP before storing
    const otpHash = await hashOTP(otp);

    // Store hashed OTP
    await pool.query(
      `INSERT INTO login_otps (user_id, otp_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, otpHash, expiresAt]
    );

    // Send OTP via email
    const emailSent = await sendOTPEmail(user.email, otp);

    if (!emailSent && process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send OTP email. Please try again.',
      });
    }

    res.json({
      status: 'success',
      message: 'OTP sent to email',
      // Only return OTP in development mode for testing
      ...(process.env.NODE_ENV === 'development' && { otp }),
    });
  }
);

// Verify OTP and login
export const verifyLoginOTP = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and OTP are required',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format',
      });
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        status: 'error',
        message: 'OTP must be 6 digits',
      });
    }

    // Sanitize email
    const sanitizedEmail = sanitizeString(email).toLowerCase();

    // Find user
    const userResult = await pool.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      [sanitizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      });
    }

    const user = userResult.rows[0];

    // Find valid, unused OTP
    const otpResult = await pool.query(
      `SELECT id, otp_hash FROM login_otps
       WHERE user_id = $1 AND expires_at > NOW() AND used = FALSE
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (otpResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired OTP',
      });
    }

    const storedOTP = otpResult.rows[0];

    // Verify OTP
    const isValid = await verifyOTP(otp, storedOTP.otp_hash);

    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid OTP',
      });
    }

    // Mark OTP as used
    await pool.query(
      'UPDATE login_otps SET used = TRUE WHERE id = $1',
      [storedOTP.id]
    );

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
  }
);

