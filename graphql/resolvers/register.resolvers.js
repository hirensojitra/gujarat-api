// src/graphql/resolvers/register.resolvers.js

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const pool = require("../../database");
const nodemailer = require("nodemailer");
const TOKEN_TTL = "7d"; // change in one place
const GET_USER_BY_ID_SQL = `
SELECT
  ui.id              AS user_id,
  ui.pass_key,
  ui.firstname, ui.middlename, ui.lastname,
  ui.number, ui.number_verified,
  ui.role_id,
  ue.email, ue.is_verified    AS email_verified,
  uu.username,
  ui.birthday,
  ui.gender,
  ui.marital_status,
  lang.id            AS language_id,
  lang.name          AS language_name
FROM    users_info      ui
JOIN    user_emails     ue   ON ue.user_id = ui.id AND ue.is_primary = TRUE
LEFT JOIN user_usernames uu  ON uu.user_id = ui.id AND uu.status = 'active'
LEFT JOIN languages      lang ON ui.language_id = lang.id
WHERE   ui.id = $1
LIMIT 1;
`;
const formatLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
function normaliseUser(r) {
  const unk = (v) => !v || v.toLowerCase() === "unknown";
  return {
    id: r.user_id,
    firstname: !unk(r.firstname) ? r.firstname : null,
    middlename: !unk(r.middlename) ? r.middlename : null,
    lastname: !unk(r.lastname) ? r.lastname : null,
    number: r.number && !r.number.startsWith("unknown-") ? r.number : null,
    number_verified: r.number_verified,
    role_id: r.role_id,
    email: r.email,
    email_verified: r.email_verified,
    username: r.username || null,
    birthday: r.birthday ? formatLocalDate(r.birthday) : null,
    gender: r.gender ? r.gender.toUpperCase() : null,
    marital_status: r.marital_status ? r.marital_status.toUpperCase() : null,

    language: {
      id: r.language_id || null,
      name: r.language_name || null,
    },
  };
}

function signToken({ user_id, role_id }) {
  return jwt.sign({ user_id, role_id, is_email_verified: true }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}
const JWT_SECRET = process.env.JWT_SECRET;
const DEFAULT_ROLE_ID = "4ef32db9"; // or fetch from your config

// configure your mail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Helper: generate a 6-digit OTP, sign it into a short-lived JWT,
 * email it to the user, and return { token, expiresAt }
 */
async function sendOtp(email, userId) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const token = jwt.sign({ userId, email, otp_code: otp }, JWT_SECRET, {
    expiresIn: "15m",
  });
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Email Verification OTP Code",
    html: `
      <p>Your OTP Code is: <strong>${otp}</strong></p>
      <p>This code is valid for 15 minutes.</p>
    `,
  });

  return { token, expiresAt };
}

const resolvers = {
  Mutation: {
    // ─── 1) REGISTER ───────────────────────────────────────────────
    async register(_, { input }) {
      const { email, pass_key, role_id = DEFAULT_ROLE_ID } = input;

      // a) ensure email not already taken
      const { rowCount: existing } = await pool.query(
        `SELECT 1 FROM user_emails WHERE LOWER(email)=LOWER($1)`,
        [email]
      );
      if (existing) {
        throw new Error("Email already registered.");
      }

      // b) create the user
      const userId = uuidv4().replace(/-/g, "");
      const passHash = await bcrypt.hash(pass_key, 10);
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const phonePlaceholder = `unknown-${randomNum}`;

      await pool.query(
        `INSERT INTO users_info 
           (id, pass_key, role_id, number, created_at)
         VALUES ($1,$2,$3,$4,NOW())`,
        [userId, passHash, role_id, phonePlaceholder]
      );

      // c) insert their email record (unverified)
      await pool.query(
        `INSERT INTO user_emails 
           (user_id,email,is_primary,is_verified,created_at)
         VALUES ($1,$2,TRUE,FALSE,NOW())`,
        [userId, email]
      );

      // d) send OTP
      const { token: email_otp_token, expiresAt: otp_expires_at } =
        await sendOtp(email, userId);

      // e) return the registration payload
      return {
        token: "", // no real auth token yet
        user_id: userId,
        role_id,
        username: "",
        is_email_verified: false,
        email_otp_token,
        otp_expires_at,
      };
    },

    // ─── 2) VERIFY OTP ─────────────────────────────────────────────
    async verifyEmailOtp(_, { token, otp_code }) {
      let payload;
      try {
        payload = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        throw new Error("Invalid or expired OTP token.");
      }

      // 2) Now do the DB work — if anything here fails, you'll see the real error
      const { userId, email, otp_code: correctOtp } = payload;
      if (String(otp_code) !== String(correctOtp)) {
        throw new Error("Incorrect OTP code.");
      }
      await pool.query(
        `UPDATE user_emails 
       SET is_verified = TRUE 
     WHERE user_id = $1 AND is_primary = TRUE`,
        [userId]
      );

      const { rows, rowCount } = await pool.query(GET_USER_BY_ID_SQL, [userId]);
      if (!rowCount) {
        throw new Error("User not found after verification.");
      }

      const userRow = rows[0];
      const authToken = signToken(userRow);
      const userObj = normaliseUser(userRow);

      return {
        token: authToken,
        user: userObj,
      };
    },
    // ─── 3) RESEND OTP ──────────────────────────────────────────────
    async resendEmailOtp(_, { email }) {
      // look up the user_id
      const { rows, rowCount } = await pool.query(
        `SELECT user_id 
           FROM user_emails 
          WHERE LOWER(email)=LOWER($1) 
            AND is_primary=TRUE`,
        [email]
      );
      if (!rowCount) {
        throw new Error("Email address not found.");
      }
      const userId = rows[0].user_id;

      // (re-)mark as unverified, in case they’d previously verified
      await pool.query(
        `UPDATE user_emails 
           SET is_verified = FALSE 
         WHERE user_id = $1`,
        [userId]
      );

      // send a fresh OTP
      const { token: email_otp_token, expiresAt: otp_expires_at } =
        await sendOtp(email, userId);
      return { email_otp_token, otp_expires_at };
    },
  },
};
module.exports = { resolvers };
