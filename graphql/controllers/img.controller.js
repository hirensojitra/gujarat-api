const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;
const sharp = require("sharp");
const pool = require("../../database");

// ─── Role Helpers ─────────────────────────────────────────────
const getUserRole = (user) => user?.role || "VIEWER";
const getUserId = (user) => user?.userid;

const isAdmin = (user) => getUserRole(user) === "ADMINISTRATOR";
const isOwner = (user) => getUserRole(user) === "OWNER";
const isViewer = (user) => getUserRole(user) === "VIEWER";
const isPremiumUser = (user) => getUserRole(user) === "PREMIUM_USER";

const getUploadPathForAdmin = (user) => {
  const userId = getUserId(user);
  return path.join(__dirname, "../uploads/users", userId);
};
function generateAlphanumericId(length = 5) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Recursively generate and verify a unique alphanumeric ID for both folders and images
async function generateUniqueId(tableName, columnName) {
  const newId = generateAlphanumericId();
  const result = await pool.query(
    `SELECT ${columnName} FROM ${tableName} WHERE ${columnName} = $1`,
    [newId]
  );
  if (result.rows.length > 0) {
    return generateUniqueId(tableName, columnName); // Recursive call
  }
  return newId;
}

// ─── File System Helpers ─────────────────────────────────────
const ensureDirectoryExists = async (dir) => {
  if (!fs.existsSync(dir)) {
    await fsPromises.mkdir(dir, { recursive: true });
  }
};

const saveFile = async (uploadDir, fileObj) => {
  const { createReadStream, filename } = fileObj;
  const filepath = path.join(uploadDir, filename);
  const stream = createReadStream();
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filepath);

    stream.pipe(writeStream);

    stream.on("error", (err) => {
      console.error("Stream error:", err);
      reject(err);
    });

    writeStream.on("finish", () => {
      resolve(filepath); // Return full path to saved file
    });

    writeStream.on("error", (err) => {
      console.error("Write stream error:", err);
      reject(err);
    });
  });
};

// ─── Image Controller ────────────────────────────────────────
const imageController = {
  createFolderGraphQL: async (_, { name }, user) => {
    if (!name || name.trim().length === 0) {
      throw new Error("Folder name is required");
    }
    const folderId = await generateUniqueId("folders", "id");
    console.log("Generated folder ID:", folderId);
    console.log("Generated folder User ID:", getUserId(user));
    await pool.query(
      "INSERT INTO folders (id, name, user_id) VALUES ($1, $2, $3)",
      [folderId, name.trim(), getUserId(user)]
    );

    return {
      id: folderId,
      name: name.trim(),
      created_at: new Date(),
    };
  },
  deleteFolderGraphQL: async (_, { folderId }, user) => {
    const userId = getUserId(user);
    const folder = await pool.query(
      "SELECT * FROM folders WHERE id = $1 AND user_id = $2",
      [folderId, userId]
    );

    if (folder.rows.length === 0) {
      throw new Error("Folder not found or not owned by user");
    }

    const uploadDir = path.join(__dirname, `../../uploads/${folderId}`);
    await pool.query("DELETE FROM user_images WHERE folder_id = $1", [
      folderId,
    ]);
    await pool.query("DELETE FROM folders WHERE id = $1", [folderId]);

    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }

    return true;
  },
  renameFolderGraphQL: async (_, { folderId, name }, user) => {
    if (!name || name.trim().length === 0) {
      throw new Error("New folder name is required");
    }

    const result = await pool.query(
      "UPDATE folders SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING id",
      [name.trim(), folderId, getUserId(user)]
    );

    if (result.rowCount === 0) {
      throw new Error("Folder not found or not owned by user");
    }

    return true;
  },

  uploadImageGraphQL: async (_, { folderId, image, metadata = "" }, user) => {
    if (!user || isViewer(user) || isPremiumUser(user)) {
      throw new Error("You do not have permission to upload images.");
    }

    if (!image) throw new Error("No image file provided.");

    let uploadDir = path.join(__dirname, `../../uploads/${folderId}`);
    if (isAdmin(user)) {
      // uploadDir = getUploadPathForAdmin(user);
    }
    await ensureDirectoryExists(uploadDir);

    const resolvedImage = await image; // ✅ Await the upload promise
    const savedPath = await saveFile(uploadDir, resolvedImage); // ✅ Pass the resolved object
    const fileId = await generateUniqueId(`user_images`, "id");
    const imageUrl = `/uploads/${path.basename(savedPath)}`;

    await pool.query(
      "INSERT INTO user_images (id, folder_id, image_url, metadata) VALUES ($1, $2, $3, $4)",
      [fileId, folderId, imageUrl, metadata]
    );

    return {
      id: fileId,
      folder_id: folderId,
      image_url: imageUrl,
      metadata,
    };
  },
  getFoldersGraphQL: async (_, args, user) => {
    if (getUserRole(user) === "VIEWER") throw new Error("Not authorized.");

    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "created_at",
      order = "ASC",
    } = args;

    const validSortFields = ["created_at", "updated_at", "name"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "created_at";
    const sortOrder = order.toLowerCase() === "asc" ? "ASC" : "DESC";
    const offset = (page - 1) * limit;

    const values = [];
    let whereClause = "";

    if (search) {
      whereClause = ` WHERE name ILIKE $1`;
      values.push(`%${search}%`);
    }

    const limitOffsetClause = ` LIMIT $${values.length + 1} OFFSET $${
      values.length + 2
    }`;
    values.push(limit, offset);

    const query = `SELECT * FROM folders${whereClause} ORDER BY ${sortField} ${sortOrder}${limitOffsetClause}`;
    const countQuery = `SELECT COUNT(*) FROM folders${whereClause}`;

    const dataRes = await pool.query(query, values);
    const countRes = await pool.query(
      countQuery,
      values.slice(0, whereClause ? 1 : 0)
    );

    return {
      folders: dataRes.rows,
      total: parseInt(countRes.rows[0].count, 10),
    };
  },

  getImagesInFolderGraphQL: async (
    _,
    { folderId, page = 1, limit = 10, search = "", sort = "DESC" },
    user
  ) => {
    if (!folderId) throw new Error("folderId is required");

    const offset = (page - 1) * limit;
    const orderBy = sort.toLowerCase() === "desc" ? "DESC" : "ASC";
    const values = [folderId, limit, offset];
    const searchFilter = search ? " AND metadata ILIKE $4" : "";
    if (search) values.push(`%${search}%`);

    const baseQuery = `
      SELECT * FROM user_images
      WHERE folder_id = $1${searchFilter}
      ORDER BY created_at ${orderBy}
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM user_images
      WHERE folder_id = $1${searchFilter}
    `;

    const imagesRes = await pool.query(baseQuery, values);
    const countRes = await pool.query(
      countQuery,
      values.slice(0, search ? 4 : 1)
    );

    return {
      images: imagesRes.rows || [],
      total: parseInt(countRes.rows[0].count, 10),
    };
  },

  deleteImageGraphQL: async (_, { folderId, imageId }, user) => {
    if (!isOwner(user) && !isAdmin(user)) {
      throw new Error("Only owners or admins can delete images.");
    }

    const result = await pool.query(
      "SELECT image_url FROM user_images WHERE id = $1 AND folder_id = $2",
      [imageId, folderId]
    );
    if (result.rows.length === 0) throw new Error("Image not found");

    const filePath = path.join(__dirname, `../${result.rows[0].image_url}`);

    await pool.query("DELETE FROM user_images WHERE id = $1", [imageId]);
    if (fs.existsSync(filePath)) {
      await fsPromises.unlink(filePath);
    }

    return true;
  },

  refreshImageGraphQL: async (_, { imageId, folderId, image }, user) => {
    if (!user || isViewer(user)) throw new Error("Unauthorized access");

    const userId = getUserId(user);

    // 1. Verify folder ownership
    const folderResult = await pool.query(
      "SELECT * FROM folders WHERE id = $1 AND user_id = $2",
      [folderId, userId]
    );
    if (folderResult.rows.length === 0 && !isAdmin(user)) {
      throw new Error("Folder not found or not owned by the user");
    }

    // 2. Get old image info
    const imageResult = await pool.query(
      "SELECT image_url FROM user_images WHERE id = $1 AND folder_id = $2",
      [imageId, folderId]
    );
    if (imageResult.rows.length === 0) {
      throw new Error("Image not found");
    }

    const oldImageUrl = imageResult.rows[0].image_url;
    const oldImagePath = path.join(
      __dirname,
      `../../uploads/${folderId}/${path.basename(oldImageUrl)}`
    );

    // 3. Delete old image if it exists
    if (fs.existsSync(oldImagePath)) {
      await fsPromises.unlink(oldImagePath);
    } else {
      throw new Error("Old image not found on filesystem");
    }

    // 4. Save new image
    const uploadDir = path.join(__dirname, `../../uploads/${folderId}`);
    await ensureDirectoryExists(uploadDir);

    const resolvedImage = await image;
    resolvedImage.filename = `${path.basename(oldImageUrl)}`;
    const savedPath = await saveFile(uploadDir, resolvedImage);
    const newImageUrl = `/uploads/${path.basename(savedPath)}`;

    // 5. Update DB record
    await pool.query("UPDATE user_images SET image_url = $1 WHERE id = $2", [
      newImageUrl,
      imageId,
    ]);

    return {
      id: imageId,
      image_url: newImageUrl,
      message: "Image replaced successfully",
    };
  },

  getImageUrlGraphQL: async (imageId, user) => {
    if (isViewer(user)) throw new Error("Not authorized.");
    const result = await pool.query(
      "SELECT image_url FROM user_images WHERE id = $1",
      [imageId]
    );
    if (result.rows.length === 0) throw new Error("Image not found");

    return result.rows[0].image_url;
  },
};

module.exports = imageController;
