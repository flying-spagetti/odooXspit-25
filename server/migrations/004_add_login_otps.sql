-- Login OTPs table
CREATE TABLE IF NOT EXISTS login_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_login_otps_user_id ON login_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_login_otps_expires_at ON login_otps(expires_at);

-- Clean up expired OTPs (optional - can be done via cron job)
CREATE INDEX IF NOT EXISTS idx_login_otps_used ON login_otps(used);

