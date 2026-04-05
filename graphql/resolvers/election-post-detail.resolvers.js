const { GraphQLUpload } = require("graphql-upload");
const { GraphQLScalarType } = require("graphql");
const { Kind } = require("graphql/language");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const pool = require("../../database");

const JWT_SECRET = process.env.JWT_SECRET;

const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON scalar for JSON support",
  parseValue: (v) => v,
  serialize: (v) => v,
  parseLiteral(ast) {
    if (ast.kind === Kind.OBJECT) {
      const value = Object.create(null);
      ast.fields.forEach((field) => {
        value[field.name.value] = this.parseLiteral(field.value);
      });
      return value;
    }
    if (ast.kind === Kind.LIST) {
      return ast.values.map((v) => this.parseLiteral(v));
    }
    return ast.value;
  },
});

/** Helper: ensure the request is from an ADMIN user */
async function ensureAdmin(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    throw new Error("Not authenticated");
  }
  let payload;
  try {
    payload = jwt.verify(auth.slice(7), JWT_SECRET);
  } catch (err) {
    throw new Error("Invalid or expired token");
  }
  const { rows } = await pool.query(
    `SELECT r.code
       FROM users_info ui
       JOIN roles r ON ui.role_id = r.id
      WHERE ui.id = $1`,
    [payload.user_id]
  );
  if (!rows.length || (rows[0].code !== "ADMIN" && rows[0].code !== "OWNER")) {
    throw new Error("Not authorized: ADMIN role required");
  }
}

/** Build dynamic WHERE clauses for list queries */
function buildFilters({ search, published, info_show, subcategory_id }) {
  const clauses = ["deleted = false", "LOWER(title) LIKE $1"];
  const params = [`%${search.toLowerCase()}%`];
  let idx = 2;
  if (published !== undefined) {
    clauses.push(`published = $${idx++}`);
    params.push(Boolean(published));
  }
  if (info_show !== undefined) {
    clauses.push(`info_show = $${idx++}`);
    params.push(Boolean(info_show));
  }
  if (subcategory_id !== undefined) {
    clauses.push(`subcategory_id = $${idx++}`);
    params.push(subcategory_id);
  }
  return { where: clauses.join(" AND "), params, nextIndex: idx };
}

const resolvers = {
  JSON: JSONScalar,
  Upload: GraphQLUpload,
  ElectionPostDetails: {
    async subcategory(post, _, { pool }) {
      const subcategoryIdStr = post.subcategoryId || post.subcategory_id;
      if (!subcategoryIdStr) return null;
      const subcategoryId = parseInt(subcategoryIdStr, 10);
      if (isNaN(subcategoryId)) {
        return null;
      }
      const { rows } = await pool.query(
        "SELECT * FROM poster_subcategories WHERE id = $1",
        [subcategoryId]
      );
      return rows[0];
    },
    async category(post, _, { pool }) {
      const subcategoryIdStr = post.subcategoryId || post.subcategory_id;
      if (!subcategoryIdStr) return null;
      const subcategoryId = parseInt(subcategoryIdStr, 10);
      if (isNaN(subcategoryId)) {
        return null;
      }
      const { rows } = await pool.query(
        `SELECT c.* FROM poster_categories c
      JOIN poster_subcategories sc ON c.id = sc.category_id
      WHERE sc.id = $1
    `,
        [subcategoryId]
      );
      return rows[0];
    },
  },

  Query: {
    async getAllElectionPosts(
      _,
      {
        page = 1,
        limit = 12,
        search = "",
        sortBy = "created_at",
        order = "desc",
        published,
        info_show,
        subcategory_id,
      }
    ) {
      const offset = (page - 1) * limit;
      const validOrder = order.toLowerCase() === "desc" ? "DESC" : "ASC";
      const validSortColumns = ["id", "title", "created_at"];
      const sortColumn = validSortColumns.includes(sortBy)
        ? sortBy
        : "created_at";

      const { where, params, nextIndex } = buildFilters({
        search,
        published,
        info_show,
        subcategory_id,
      });
      const listSql = `
        SELECT *, apidata AS "apiData", target_organization_type AS "target_organization_type", "templateType" AS "templateType" FROM election_post_details
        WHERE ${where}
        ORDER BY ${sortColumn} ${validOrder}
        LIMIT $${nextIndex} OFFSET $${nextIndex + 1};
      `;
      const listParams = [...params, limit, offset];
      const { rows: posts } = await pool.query(listSql, listParams);

      const countSql = `
        SELECT COUNT(*) AS count FROM election_post_details
        WHERE ${where};
      `;
      const { rows: cntRows } = await pool.query(countSql, params);
      const total = parseInt(cntRows[0].count, 10);

      return {
        posts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalPosts: total,
        },
      };
    },

    async getElectionPostById(_, { id }) {
      const { rows } = await pool.query(
        `SELECT *, apidata AS "apiData", subcategory_id AS "subcategory_id", target_organization_type AS "target_organization_type", "templateType" AS "templateType" FROM election_post_details WHERE id = $1`,
        [id]
      );
      return rows[0];
    },

    async getAllSoftDeletedElectionPosts(
      _,
      {
        page = 1,
        limit = 12,
        search = "",
        sortBy = "deleted_at",
        order = "desc",
      }
    ) {
      const offset = (page - 1) * limit;
      const validOrder = order.toLowerCase() === "desc" ? "DESC" : "ASC";
      const validSortColumns = ["id", "title", "deleted_at"];
      const sortColumn = validSortColumns.includes(sortBy)
        ? sortBy
        : "deleted_at";

      const searchQ = `%${search.toLowerCase()}%`;
      const listSql = `
        SELECT *, apidata AS "apiData" FROM election_post_details
        WHERE deleted = true
          AND LOWER(title) LIKE $1
        ORDER BY ${sortColumn} ${validOrder}
        LIMIT $2 OFFSET $3;
      `;
      const { rows: posts } = await pool.query(listSql, [
        searchQ,
        limit,
        offset,
      ]);

      const countSql = `
        SELECT COUNT(*) AS count FROM election_post_details
        WHERE deleted = true
          AND LOWER(title) LIKE $1;
      `;
      const { rows: cnt } = await pool.query(countSql, [searchQ]);
      const total = parseInt(cnt[0].count, 10);

      return {
        posts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalPosts: total,
        },
      };
    },

    async getTotalElectionPostLength() {
      const { rows } = await pool.query(
        `SELECT COUNT(*) AS count FROM election_post_details WHERE deleted = false`
      );
      return parseInt(rows[0].count, 10);
    },

    async getTotalDeletedElectionPostLength() {
      const { rows } = await pool.query(
        `SELECT COUNT(*) AS count FROM election_post_details WHERE deleted = true`
      );
      return parseInt(rows[0].count, 10);
    },

    async getElectionDownloadCounter(_, { id }) {
      const { rows } = await pool.query(
        `SELECT download_counter FROM election_post_details WHERE id = $1`,
        [id]
      );
      return rows[0]?.download_counter ?? 0;
    },

    async updateElectionDownloadCounter(_, { id }) {
      const now = new Date().toISOString();
      const { rows } = await pool.query(
        `SELECT download_counter FROM election_post_details WHERE id = $1`,
        [id]
      );
      const curr = rows[0]?.download_counter ?? 0;
      const next = curr + 1;
      await pool.query(
        `UPDATE election_post_details SET download_counter = $1, updated_at = $2 WHERE id = $3`,
        [next, now, id]
      );
      return next;
    },

    async getTemplateAssignments(_, { templateId }) {
      const orgQuery = await pool.query('SELECT organization_id FROM election_template_organizations WHERE template_id = $1', [templateId]);
      const candQuery = await pool.query('SELECT candidate_id FROM election_template_candidates WHERE template_id = $1', [templateId]);
      
      return {
        organizationIds: orgQuery.rows.map(r => r.organization_id),
        candidateIds: candQuery.rows.map(r => r.candidate_id)
      };
    },
  },

  Mutation: {
    async updateElectionPost(_, { input }, { req }) {
      await ensureAdmin(req);

      const {
        id,
        h,
        w,
        title,
        info,
        info_show,
        backgroundurl,
        data,
        download_counter,
        published,
        track,
        subcategory_id,
        apiData,
        target_organization_type,
        templateType,
      } = input;

      const now = new Date().toISOString();
      const normalizedSubcategoryId = subcategory_id || null;

      // --- Normalize JSON fields before query ---
      let normalizedData = data;
      if (data !== null && data !== undefined) {
        if (typeof data === "string") {
          try {
            normalizedData = JSON.parse(data);
          } catch {
            throw new Error("Invalid JSON format in 'data' field");
          }
        }
      }

      if (!id) {
        // --- ADD POST ---
        const newId = Math.random().toString(36).substr(2, 9);
        const sql = `
      INSERT INTO election_post_details
        (id, deleted, h, w, title, info, info_show,
         backgroundurl, data, download_counter,
         created_at, updated_at, published, track, subcategory_id, apidata,
         target_organization_type, "templateType")
      VALUES
        ($1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10,
         $11, $12, $13, $14, $15, $16,
         $17, $18)
      RETURNING *, apidata AS "apiData", target_organization_type AS "target_organization_type", "templateType" AS "templateType";
    `;
        const { rows } = await pool.query(sql, [
          newId,
          false,
          h,
          w,
          title,
          info,
          info_show,
          backgroundurl,
          normalizedData ? JSON.stringify(normalizedData) : null,
          download_counter || 0,
          now,
          now,
          published,
          track,
          normalizedSubcategoryId,
          apiData ? JSON.stringify(apiData) : null,
          target_organization_type || null,
          templateType || null,
        ]);
        return rows[0];
      } else {
        // --- UPDATE POST ---
        const fields = {
          h,
          w,
          title,
          info,
          info_show,
          backgroundurl,
          data: normalizedData,
          download_counter,
          published,
          track,
          subcategory_id: normalizedSubcategoryId,
          apidata: apiData,
          target_organization_type,
          templateType,
        };

        const sets = [];
        const vals = [];
        let idx = 1;
        const jsonFields = new Set(["data", "apidata"]);

        for (const [k, v] of Object.entries(fields)) {
          if (v === null || v === undefined) continue;

          if (jsonFields.has(k)) {
            vals.push(JSON.stringify(v));
          } else {
            vals.push(v);
          }
          sets.push(`"${k}" = $${idx++}`);
        }

        if (!sets.length) {
          throw new Error("No fields provided for update");
        }

        sets.push(`updated_at = $${idx++}`);
        vals.push(now);

        vals.push(id);

        const sql = `
      UPDATE election_post_details
         SET ${sets.join(", ")}
       WHERE id = $${idx}
      RETURNING *, apidata AS "apiData", target_organization_type AS "target_organization_type", "templateType" AS "templateType";
    `;

        const { rows } = await pool.query(sql, vals);
        return rows[0];
      }
    },
    async softDeleteElectionPost(_, { id }, { req }) {
      await ensureAdmin(req);
      const now = new Date().toISOString();
      await pool.query(
        `UPDATE election_post_details
            SET deleted = true,
                published = false,
                deleted_at = $1
          WHERE id = $2`,
        [now, id]
      );
      return true;
    },

    async recoverElectionPost(_, { id }, { req }) {
      await ensureAdmin(req);
      await pool.query(
        `UPDATE election_post_details
            SET deleted = false,
                deleted_at = NULL
          WHERE id = $1`,
        [id]
      );
      return true;
    },

    async hardDeleteElectionPost(_, { id }, { req }) {
      await ensureAdmin(req);
      await pool.query(`DELETE FROM election_post_details WHERE id = $1`, [id]);
      return true;
    },

    // thumbnail upload
    async uploadElectionThumbnail(_, { postId, file }, { req }) {
      await ensureAdmin(req);

      const { createReadStream, filename } = await file;
      const ext = path.extname(filename);
      const dest = path.join(
        __dirname,
        "../../uploads/thumb",
        `${postId}.tmp${ext}`
      );
      
      const finalDest = path.join(
        __dirname,
        "../../uploads/thumb",
        `${postId}${ext}`
      );
      
      await new Promise((res, rej) => {
        createReadStream()
          .pipe(fs.createWriteStream(dest))
          .on("finish", () => {
             // Rename after finish
             fs.rename(dest, finalDest, (err) => {
                if (err) console.error("Rename failed", err);
                res();
             });
          })
          .on("error", rej);
      });
      return `/thumb-images/${postId}${ext}`;
    },

    async assignElectionTemplate(_, { input }, { req }) {
      await ensureAdmin(req);
      const { templateId, organizationIds, candidateIds } = input;
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Remove existing assignments
        await client.query('DELETE FROM election_template_organizations WHERE template_id = $1', [templateId]);
        await client.query('DELETE FROM election_template_candidates WHERE template_id = $1', [templateId]);
        
        // Insert organizations
        for (const orgId of organizationIds) {
          await client.query('INSERT INTO election_template_organizations (template_id, organization_id) VALUES ($1, $2)', [templateId, orgId]);
        }
        
        // Insert candidates
        for (const candId of candidateIds) {
          await client.query('INSERT INTO election_template_candidates (template_id, candidate_id) VALUES ($1, $2)', [templateId, candId]);
        }
        
        await client.query('COMMIT');
        return true;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  },
};

module.exports = { resolvers };
