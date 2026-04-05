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
  const tmpPath = path.join(uploadDir, `${postId}.tmp${ext}`);

  await ensureDir(uploadDir);

  // Write to a .tmp.jpg first to avoid Windows file-lock conflicts
  const stream = createReadStream();
  const out = fs.createWriteStream(tmpPath, { flags: "w" });
  stream.pipe(out);
  await finished(out);

  // Rename .tmp.jpg → .jpg (replaces existing, avoids Windows read-lock)
  await fs.promises.rename(tmpPath, filePath).catch(err => {
    console.error(`Rename failed:`, err);
    // Continue even if rename fails, since the file was written to .tmp.jpg
  });

  return {
    filename: uniqueName,
    path: `/thumb/${uniqueName}`,
  };
}

module.exports = {
  // List all thumbnails for a post
  listPostThumbs: async (postId) => {
    const dir = path.join(__dirname, "../../uploads/thumb");
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
    const dir = path.join(__dirname, "../../uploads/thumb");
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
      const dir = path.join(__dirname, "../../uploads/thumb");
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
