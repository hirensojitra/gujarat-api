/* resolvers/user.resolvers.js ------------------------------------------- */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../../database");

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = "7d"; // change in one place
const REFRESH_CUSHION_SEC = 24 * 60 * 60; // refresh if <24 h remain

/* ───────────────────────── helpers ────────────────────────────────────── */
// pull in birthday, gender, marital_status, plus look up language
const LOGIN_SQL = `
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
WHERE   LOWER(ue.email) = LOWER($1)
LIMIT 1;
`;

/** Same SELECT but lookup by user_id instead of email */
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

/* ───────────────────────── resolvers ──────────────────────────────────── */
const resolvers = {
  Mutation: {
    async login(_, { input: { login_id, pass_key } }) {
      const { rows, rowCount } = await pool.query(LOGIN_SQL, [login_id]);
      if (!rowCount) throw new Error("Invalid email or password.");

      const u = rows[0];
      const match = await bcrypt.compare(pass_key, u.pass_key);
      if (!match) throw new Error("Invalid email or password.");
      if (!u.email_verified) {
        throw new Error("Please verify your email before logging in.");
      }

      return {
        token: signToken(u),
        user: normaliseUser(u),
      };
    },
  },

  Query: {
    async validateToken(_, { token }, { req }) {
      let jwtToken = token;
      if (!jwtToken && req?.headers.authorization?.startsWith("Bearer ")) {
        jwtToken = req.headers.authorization.split(" ")[1];
      }
      if (!jwtToken) return null;

      let decoded;
      try {
        decoded = jwt.verify(jwtToken, JWT_SECRET);
      } catch (err) {
        if (err.name === "TokenExpiredError") return null;
        throw err;
      }

      const { rows, rowCount } = await pool.query(GET_USER_BY_ID_SQL, [
        decoded.user_id,
      ]);
      if (!rowCount) return null;

      const u = rows[0];
      return {
        token: signToken(u),
        user: normaliseUser(u),
      };
    },
  },
};

module.exports = { resolvers };
