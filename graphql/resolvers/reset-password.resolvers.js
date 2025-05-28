// src/graphql/resolvers/resetPassword.resolvers.js

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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
const RESET_PASSWORD_SQL = `
  SELECT pass_key
    FROM users_info
   WHERE id = $1
`;

const UPDATE_PASSWORD_SQL = `
  UPDATE users_info
     SET pass_key = $1
   WHERE id = $2
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

// Mailer setup (same as your register flow)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/** Helper: generate & send OTP, return { token, expiresAt } */
async function sendResetOtp(email, userId) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const token = jwt.sign({ userId, email, otp_code: otp }, JWT_SECRET, {
    expiresIn: "15m",
  });
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Password Reset OTP Code",
    html: `
      <p>You requested a password reset. Your OTP is: <strong>${otp}</strong></p>
      <p>It expires in 15 minutes.</p>
    `,
  });

  return { token, expiresAt };
}

const resolvers = {
  Mutation: {
    // ─── Step 1: requestPasswordReset ────────────────────────
    async requestPasswordReset(_, { email }) {
      // ensure the email exists
      const { rows, rowCount } = await pool.query(
        `SELECT user_id FROM user_emails
           WHERE LOWER(email)=LOWER($1)
             AND is_primary=TRUE`,
        [email]
      );
      if (!rowCount) {
        throw new Error("No user found with that email address.");
      }
      const userId = rows[0].user_id;

      // generate & send the OTP
      const { token: reset_otp_token, expiresAt: otp_expires_at } =
        await sendResetOtp(email, userId);

      return { reset_otp_token, otp_expires_at };
    },

    // ─── Step 2: resetPasswordByOtp ─────────────────────────
    async resetPasswordByOtp(_, { token, otp_code, new_pass_key }) {
      // 1) verify the OTP token
      let payload;
      try {
        payload = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        throw new Error("Invalid or expired reset OTP token.");
      }

      const { userId, email, otp_code: correctOtp } = payload;
      if (String(otp_code) !== String(correctOtp)) {
        throw new Error("Incorrect OTP code.");
      }

      // 2) hash & update the new password
      const newHash = await bcrypt.hash(new_pass_key, 10);
      await pool.query(
        `UPDATE users_info
            SET pass_key = $1
          WHERE id = $2`,
        [newHash, userId]
      );

      // 3) fetch the user & issue a real AuthPayload
      const { rows, rowCount } = await pool.query(GET_USER_BY_ID_SQL, [userId]);
      if (!rowCount) {
        throw new Error("User not found after password reset.");
      }
      const userRow = rows[0];
      const authToken = signToken(userRow);
      const userObj = normaliseUser(userRow);

      return {
        token: authToken,
        user: userObj,
      };
    },
    async resetPassword(_, { input: { oldPassword, newPassword } }, { req }) {
      // 1) Authenticate the request
      const auth = req.headers.authorization || "";
      if (!auth.startsWith("Bearer ")) {
        throw new Error("Not authenticated");
      }
      let payload;
      try {
        payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      } catch {
        throw new Error("Invalid or expired token");
      }
      const userId = payload.user_id;

      // 2) Fetch existing hash
      const { rows } = await pool.query(RESET_PASSWORD_SQL, [userId]);
      if (rows.length === 0) {
        throw new Error("User not found");
      }
      const currentHash = rows[0].pass_key;

      // 3) Verify old password
      const match = await bcrypt.compare(oldPassword, currentHash);
      if (!match) {
        throw new Error("Old password is incorrect");
      }

      // 4) Hash and save the new password
      const newHash = await bcrypt.hash(newPassword, 10);
      await pool.query(UPDATE_PASSWORD_SQL, [newHash, userId]);

      // 5) (Optional) Re-fetch the user, re-issue a JWT
      const { rows: updatedRows } = await pool.query(
        `SELECT * FROM users_info WHERE id = $1`,
        [userId]
      );
      const userObj = normalizeUser(updatedRows[0]);
      const token = jwt.sign(
        { user_id: userId, is_email_verified: payload.is_email_verified },
        process.env.JWT_SECRET,
        { expiresIn: process.env.TOKEN_TTL || "7d" }
      );

      return {
        success: true,
        token,
        user: userObj,
      };
    },
  },
};

module.exports = { resolvers };
