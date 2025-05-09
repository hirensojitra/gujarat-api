// update-user.resolvers.js
const jwt = require("jsonwebtoken");
const pool = require("../../database");

const JWT_SECRET = process.env.JWT_SECRET;

// Reusable SELECT to fetch a user’s public info
const GET_USER_BY_ID_SQL = `
SELECT
  ui.id              AS user_id,
  ui.firstname,
  ui.middlename,
  ui.lastname,
  ui.number,
  ui.number_verified,
  ui.role_id,
  ue.email,
  ue.is_verified     AS email_verified,
  uu.username,
  ui.birthday,
  ui.gender,
  ui.marital_status,
  lang.id            AS language_id,
  lang.name          AS language_name
FROM users_info ui
JOIN user_emails ue     ON ue.user_id = ui.id AND ue.is_primary = TRUE
LEFT JOIN user_usernames uu ON uu.user_id = ui.id AND uu.status = 'active'
LEFT JOIN languages      lang ON ui.language_id = lang.id
WHERE ui.id = $1
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

const resolvers = {
  Mutation: {
    async updateUserProfile(_, { input }, { req }) {
      // 1️⃣ Authenticate
      const auth = req.headers.authorization || "";
      if (!auth.startsWith("Bearer ")) {
        throw new Error("Not authenticated");
      }
      let payload;
      try {
        payload = jwt.verify(auth.slice(7), JWT_SECRET);
      } catch {
        throw new Error("Invalid or expired token");
      }
      const userId = payload.user_id;

      // 2️⃣ Build dynamic UPDATE
      const allowed = new Set([
        "firstname",
        "middlename",
        "lastname",
        "number",
        "birthday",
        "gender",
        "marital_status",
        "language_id",
      ]);

      const sets = [];
      const vals = [];
      let idx = 1;
      let numberUpdated = false;

      for (const [key, val] of Object.entries(input)) {
        if (!allowed.has(key)) continue;
        if (val === undefined || val === null || val === "") continue;

        // handle enums/lowercase for Postgres
        const dbVal =
          key === "gender" || key === "marital_status"
            ? String(val).toLowerCase()
            : val;

        sets.push(`${key} = $${idx}`);
        vals.push(dbVal);
        idx++;

        if (key === "number") {
          numberUpdated = true;
        }
      }

      // if mobile was updated, reset its verification flag
      if (numberUpdated) {
        sets.push(`number_verified = $${idx}`);
        vals.push(false);
        idx++;
      }

      if (sets.length === 0) {
        throw new Error("No valid fields provided for update");
      }

      // WHERE clause
      vals.push(userId);
      const updateSQL = `
        UPDATE users_info
        SET ${sets.join(", ")}
        WHERE id = $${idx}
      `;
      await pool.query(updateSQL, vals);

      // 3️⃣ Fetch and return
      const { rows, rowCount } = await pool.query(GET_USER_BY_ID_SQL, [userId]);
      if (!rowCount) {
        throw new Error("Failed to fetch updated user");
      }
      return normaliseUser(rows[0]);
    },
  },
};

module.exports = { resolvers };
