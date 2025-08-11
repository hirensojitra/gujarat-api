const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const pool = require("../../database");

const JWT_SECRET = process.env.JWT_SECRET;
const uploadDir = path.join(__dirname, "../../uploads/profile");

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
    async updateUserProfile(_, { input, image }, { req }) {
      const auth = req.headers.authorization || "";
      if (!auth.startsWith("Bearer ")) throw new Error("Not authenticated");

      let payload;
      try {
        payload = jwt.verify(auth.slice(7), JWT_SECRET);
      } catch {
        throw new Error("Invalid or expired token");
      }

      const userId = payload.userId || payload.user_id;

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

        const dbVal =
          key === "gender" || key === "marital_status"
            ? String(val).toLowerCase()
            : val;

        sets.push(`${key} = $${idx}`);
        vals.push(dbVal);

        if (key === "number") numberUpdated = true;
        idx++;
      }

      if (numberUpdated) {
        sets.push(`number_verified = ${idx}`);
        vals.push(false);
        idx++;
      }

      if (image) {
        const resolvedImage = await image;

        const allowedImageTypes = ["image/jpeg", "image/png", "image/jpg"];
        const allowedExtensions = [".jpg", ".jpeg", ".png"];

        const filename = resolvedImage?.filename?.toLowerCase() || "";
        const mimetype = resolvedImage?.mimetype?.toLowerCase() || "";
        const ext = path.extname(filename);

        const isDeleteRequest =
          resolvedImage === "delete" ||
          mimetype === "text/plain" ||
          filename === "delete.txt";

        const isAllowedImage =
          allowedImageTypes.includes(mimetype) &&
          allowedExtensions.includes(ext);

        if (!isDeleteRequest && !isAllowedImage) {
          throw new Error(
            "Only image files (jpg, jpeg, png) or delete.txt are allowed."
          );
        }

        const existingFiles = fs.readdirSync(uploadDir);
        for (const file of existingFiles) {
          if (file.startsWith(userId)) {
            try {
              fs.unlinkSync(path.join(uploadDir, file));
            } catch {}
          }
        }

        if (isDeleteRequest) {
          sets.push(`image = $${idx}`);
          vals.push(null);
          idx++;
        } else {
          const newImageName = `${userId}${ext}`;
          const newImagePath = path.join(
            uploadDir,
            path.basename(newImageName)
          );

          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          try {
            await new Promise((resolve, reject) => {
              const inputStream = resolvedImage.createReadStream();
              if (!inputStream || typeof inputStream.pipe !== "function") {
                return reject(new Error("Invalid file stream"));
              }

              const writeStream = fs.createWriteStream(newImagePath);
              inputStream.pipe(writeStream).on("error", reject);
              writeStream.on("finish", resolve);
              writeStream.on("error", reject);
            });

            const buffer = fs.readFileSync(newImagePath);

            try {
              await sharp(buffer).metadata();
            } catch {
              fs.unlinkSync(newImagePath);
              throw new Error(
                "Invalid image format. Please upload a valid image."
              );
            }
            sets.push(`image = $${idx}`);
            vals.push(newImageName);
            idx++;
          } catch {
            throw new Error("Image upload failed");
          }
        }
      }

      if (!sets.length) throw new Error("No valid fields provided for update");

      vals.push(userId);
      const updateSQL = `UPDATE users_info SET ${sets.join(
        ", "
      )} WHERE id = $${idx}`;
      await pool.query(updateSQL, vals);

      const { rows, rowCount } = await pool.query(GET_USER_BY_ID_SQL, [userId]);
      if (!rowCount) throw new Error("Failed to fetch updated user");
      const data = normaliseUser(rows[0])
      console.log("User updated successfully:", data);
      return normaliseUser(data);
    },
  },
};

module.exports = { resolvers };
