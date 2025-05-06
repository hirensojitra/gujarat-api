const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const pool = require("../../database");
const nodemailer = require("nodemailer");
const JWT_SECRET = process.env.JWT_SECRET;
const DEFAULT_ROLE_ID = "4ef32db9"; // or fetch from DB/config

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const resolvers = {
  Mutation: {
    async register(_, { input }) {
      const { email, pass_key, role_id = DEFAULT_ROLE_ID } = input;
      // Check if email already exists
      const existingEmail = await pool.query(
        "SELECT 1 FROM user_emails WHERE email = $1",
        [email]
      );
      if (existingEmail.rowCount > 0) {
        throw new Error("Email already registered.");
      }
      // Generate user ID
      const userId = uuidv4().replace(/-/g, "");
      const hashedPassword = await bcrypt.hash(pass_key, 10);
      const randomSuffix = Math.floor(10000 + Math.random() * 90000); // 5 digit random number
      const numberValue = `unknown-${randomSuffix}`;
      // Insert user
      await pool.query(
        `INSERT INTO users_info (id, pass_key, role_id, number, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, hashedPassword, role_id, numberValue]
      );

      // Insert email
      await pool.query(
        `INSERT INTO user_emails (user_id, email, is_primary, is_verified, created_at)
         VALUES ($1, $2, true, false, NOW())`,
        [userId, email]
      );

      // Generate OTP and emailOtpToken
      const emailOtp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
      const emailOtpToken = jwt.sign(
        { userId, email, otp_code: emailOtp },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      // Send email with OTP only
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your Email Verification OTP Code",
        html: `<p>Your OTP Code is: <strong>${emailOtp}</strong></p><p>This code is valid for 15 minutes.</p>`
      });
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const response = {
        token: "",
        user_id: userId,
        role_id,
        username: "",
        is_email_verified: false,
        email_otp_token: emailOtpToken,
        otp_expires_at: expiresAt.toISOString()
      };
      
      return response;
      
    },
    async verifyEmailOtp(_, { token, otp_code }) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        const { userId, email, otp_code: correctOtp } = payload;

        if (otp_code !== String(correctOtp)) {
          throw new Error("Invalid OTP.");
        }

        // Update user's email to verified
        await pool.query(
          `UPDATE user_emails SET is_verified = true WHERE user_id = $1`,
          [userId]
        );

        return "Email verified successfully!";
      } catch (error) {
        throw new Error("Invalid or expired OTP token.");
      }
    }
  },
};

module.exports = { resolvers };
