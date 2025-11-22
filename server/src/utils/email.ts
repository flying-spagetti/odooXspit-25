import nodemailer from 'nodemailer';

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

// Create transporter
let transporter: nodemailer.Transporter | null = null;

if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // If no email configuration, log to console in development
    if (!transporter) {
      if (process.env.NODE_ENV === 'development') {
        console.log('=== EMAIL (Development Mode - Not Sent) ===');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Body:', options.text || options.html);
        console.log('==========================================');
      }
      return true; // Return true in dev mode to allow testing
    }

    const mailOptions = {
      from: `"StockMaster" <${SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export const sendOTPEmail = async (email: string, otp: string): Promise<boolean> => {
  const subject = 'Your StockMaster Login OTP';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login OTP</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">StockMaster</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Login Verification Code</h2>
        <p>Hello,</p>
        <p>You have requested a login OTP for your StockMaster account. Use the code below to complete your login:</p>
        <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #667eea; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${otp}</h1>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">This is an automated message, please do not reply.</p>
      </div>
    </body>
    </html>
  `;
  const text = `Your StockMaster Login OTP is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`;

  return sendEmail({ to: email, subject, html, text });
};

