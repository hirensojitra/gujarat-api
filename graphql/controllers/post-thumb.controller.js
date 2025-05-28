const fs = require("fs");
const path = require("path");
const { finished } = require("stream/promises");

// Helper: ensure directory exists
async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

// Store a single upload
async function storeFile(postId, file) {
  const { createReadStream, filename: originalName } = await file;
  const ext = path.extname(originalName);
  const uniqueName = `${postId}${ext}`;
  const uploadDir = path.join(__dirname, "../../uploads/thumb");
  const filePath = path.join(uploadDir, uniqueName);

  await ensureDir(uploadDir);

  // If you really want to remove the old file first:
  try {
    await fs.promises.access(filePath);
    // file exists → remove it
    await fs.promises.unlink(filePath);
    console.log(`Overwriting existing thumbnail: ${uniqueName}`);
  } catch (err) {
    // either doesn't exist or some other error → ignore
  }

  // Now write (this will create or overwrite)
  const stream = createReadStream();
  const out = fs.createWriteStream(filePath, { flags: "w" });
  stream.pipe(out);
  await finished(out);

  return {
    filename: uniqueName,
    path: `/thumb/${uniqueName}`,
  };
}

module.exports = {
  // List all thumbnails for a post
  listPostThumbs: async (postId) => {
    const dir = path.join(__dirname, "../uploads/thumb");
    await ensureDir(dir);
    return fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(`${postId}-`))
      .map((f) => ({ filename: f, path: `/thumb/${f}` }));
  },

  // Upload multiple thumbnails
  bulkUploadPostThumbs: async (postId, uploads) => {
    const results = [];
    for (const upload of uploads) {
      const saved = await storeFile(postId, upload);
      results.push(saved);
    }
    return results;
  },

  // Delete thumbnails by filename
  deletePostThumbs: async (postId, filenames) => {
    const dir = path.join(__dirname, "../uploads/thumb");
    const deleted = [];
    for (const name of filenames) {
      const filePath = path.join(dir, name);
      if (fs.existsSync(filePath) && name.startsWith(`${postId}-`)) {
        fs.unlinkSync(filePath);
        deleted.push(name);
      }
    }
    return deleted;
  },

  // Update (replace) existing thumbnails
  bulkUpdatePostThumbs: async (postId, updates) => {
    const results = [];
    for (const { filename, file } of updates) {
      const dir = path.join(__dirname, "../uploads/thumb");
      const oldPath = path.join(dir, filename);
      if (fs.existsSync(oldPath) && filename.startsWith(`${postId}-`)) {
        fs.unlinkSync(oldPath);
      }
      const saved = await storeFile(postId, file);
      results.push(saved);
    }
    return results;
  },
};
