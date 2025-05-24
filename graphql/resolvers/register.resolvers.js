// src/graphql/resolvers/auth.resolvers.js
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const pool = require("../../database");
const nodemailer = require("nodemailer");

// Config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = process.env.TOKEN_TTL || "7d";
const DEFAULT_ROLE_ID = process.env.DEFAULT_ROLE_ID || "4ef32db9";

// Pre-built queries
const GET_USER_BY_ID_SQL = `
SELECT
  ui.id AS user_id,
  ui.pass_key,
  ui.firstname, ui.middlename, ui.lastname,
  ui.number, ui.number_verified,
  ui.role_id,
  ue.email, ue.is_verified AS email_verified,
  uu.username,
  ui.birthday,
  ui.gender,
  ui.marital_status,
  lang.id AS language_id,
  lang.name AS language_name
FROM users_info ui
JOIN user_emails ue ON ue.user_id = ui.id AND ue.is_primary = TRUE
LEFT JOIN user_usernames uu ON uu.user_id = ui.id AND uu.status = 'active'
LEFT JOIN languages lang ON ui.language_id = lang.id
WHERE ui.id = $1
LIMIT 1;
`;

// Helpers
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const formatDate = (date = new Date()) => date.toISOString().split("T")[0];

function normalizeUser(r) {
  const clean = (v) => (v && !/^unknown/i.test(v) ? v : null);
  return {
    id: r.user_id,
    firstname: clean(r.firstname),
    middlename: clean(r.middlename),
    lastname: clean(r.lastname),
    number: clean(r.number),
    number_verified: r.number_verified,
    role_id: r.role_id,
    email: r.email,
    email_verified: r.email_verified,
    username: r.username || null,
    birthday: r.birthday ? formatDate(new Date(r.birthday)) : null,
    gender: r.gender?.toUpperCase() || null,
    marital_status: r.marital_status?.toUpperCase() || null,
    language: {
      id: r.language_id,
      name: r.language_name,
    },
  };
}

function signJwt(payload, expiresIn = TOKEN_TTL) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

async function sendOtp(email, userId) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const token = signJwt({ userId, email, otp }, "15m");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Email Verification OTP Code",
    html: `<p>Your OTP Code is: <strong>${otp}</strong></p><p>Valid for 15 minutes.</p>`,
  });

  return { token, expiresAt };
}

async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT ui.id, ui.pass_key FROM users_info ui
     JOIN user_emails ue ON ue.user_id = ui.id AND ue.is_primary = TRUE
     WHERE LOWER(ue.email) = LOWER($1)`,
    [email]
  );
  return rows[0] || null;
}

const resolvers = {
  Mutation: {
    async register(
      _,
      { input: { email, pass_key, role_id = DEFAULT_ROLE_ID } }
    ) {
      const lowerEmail = email.toLowerCase();
      const { rowCount } = await pool.query(
        `SELECT 1 FROM user_emails WHERE LOWER(email)=LOWER($1)`,
        [lowerEmail]
      );
      if (rowCount) throw new Error("Email already registered.");

      const userId = uuidv4().replace(/-/g, "");
      const passHash = await bcrypt.hash(pass_key, 10);
      await pool.query(
        `INSERT INTO users_info (id, pass_key, role_id, number, created_at)
         VALUES ($1,$2,$3,$4,NOW())`,
        [userId, passHash, role_id, `unknown-${Date.now()}`]
      );

      await pool.query(
        `INSERT INTO user_emails (user_id,email,is_primary,is_verified,created_at)
         VALUES ($1,$2,TRUE,FALSE,NOW())`,
        [userId, lowerEmail]
      );

      const { token: email_otp_token, expiresAt: otp_expires_at } =
        await sendOtp(lowerEmail, userId);
      return {
        token: "",
        user_id: userId,
        role_id,
        username: null,
        is_email_verified: false,
        email_otp_token,
        otp_expires_at,
      };
    },

    async verifyEmailOtp(_, { token, otp_code }) {
      let payload;
      try {
        payload = jwt.verify(token, JWT_SECRET);
      } catch {
        throw new Error("Invalid or expired OTP token.");
      }
      const { userId, otp } = payload;
      if (otp_code !== otp) throw new Error("Incorrect OTP code.");

      await pool.query(
        `UPDATE user_emails SET is_verified = TRUE WHERE user_id = $1 AND is_primary = TRUE`,
        [userId]
      );
      const { rows, rowCount } = await pool.query(GET_USER_BY_ID_SQL, [userId]);
      if (!rowCount) throw new Error("User not found after verification.");

      const userObj = normalizeUser(rows[0]);
      return {
        token: signJwt({
          user_id: userId,
          role_id: rows[0].role_id,
          is_email_verified: true,
        }),
        user: userObj,
      };
    },

    async resendEmailOtp(_, { email }) {
      const lowerEmail = email.toLowerCase();
      const { rows, rowCount } = await pool.query(
        `SELECT user_id FROM user_emails WHERE LOWER(email)=LOWER($1) AND is_primary=TRUE`,
        [lowerEmail]
      );
      if (!rowCount) throw new Error("Email not found.");

      const userId = rows[0].user_id;
      await pool.query(
        `UPDATE user_emails SET is_verified = FALSE WHERE user_id = $1`,
        [userId]
      );
      const { token: email_otp_token, expiresAt: otp_expires_at } =
        await sendOtp(lowerEmail, userId);
      return { email_otp_token, otp_expires_at };
    },

    async googleAuth(_, { idToken }) {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      const { email, email_verified, given_name, family_name,picture } = ticket.getPayload();
      if (!email_verified) throw new Error("Google email not verified");

      const lowerEmail = email.toLowerCase();
      let user = await findUserByEmail(lowerEmail);
      if (!user) {
        const userId = uuidv4().replace(/-/g, "");
        const dummyHash = await bcrypt.hash(uuidv4(), 10);
        await pool.query(
          `INSERT INTO users_info (id, pass_key, role_id, number, firstname, lastname,image, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
          [userId, dummyHash, DEFAULT_ROLE_ID, `unknown-${Date.now()}`, given_name || "Unknown", family_name || "Unknown", picture || null]
        );
        await pool.query(
          `INSERT INTO user_emails (user_id,email,is_primary,is_verified,created_at)
           VALUES ($1,$2,TRUE,TRUE,NOW())`,
          [userId, lowerEmail]
        );
        user = { id: userId, pass_key: null };
      }
      const hasPassword = !!user.pass_key; // true if pass_key is a non‐empty string
      const requiresPassword = !hasPassword; // true if they still need to set one
      const { rows, rowCount } = await pool.query(GET_USER_BY_ID_SQL, [
        user.id,
      ]);
      if (!rowCount) throw new Error("User not found after verification.");
      const userObj = normalizeUser(rows[0]);
      return {
        requiresPassword,
        token: signJwt({
          user_id: user.id,
          role_id: user.role_id,
          is_email_verified: true,
        }),
        user: userObj,
      };
    },
    async setPassword(_, { userId, newPassword }) {
      const hash = await bcrypt.hash(newPassword, 10);
      await pool.query(`UPDATE users_info SET pass_key = $1 WHERE id = $2`, [
        hash,
        userId,
      ]);
      const { rows, rowCount } = await pool.query(GET_USER_BY_ID_SQL, [userId]);
      if (!rowCount) throw new Error("User not found");
      return {
        token: signJwt({ user_id: userId, is_email_verified: true }),
        user: normalizeUser(rows[0]),
      };
    },
  },
};

module.exports = { resolvers };
