const { GraphQLUpload } = require("graphql-upload");
const { GraphQLScalarType, Kind } = require('graphql');
const jwt             = require('jsonwebtoken');
const fs              = require('fs');
const path            = require('path');
const pool            = require('../../database');

const JWT_SECRET = process.env.JWT_SECRET;

// Custom JSON scalar for JSONB support
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON scalar for JSONB',
  parseValue: value => value,
  serialize: value => value,
  parseLiteral(ast) {
    function parseLiteral(innerAst) {
      switch (innerAst.kind) {
        case Kind.STRING:
        case Kind.BOOLEAN:
          return innerAst.value;
        case Kind.INT:
        case Kind.FLOAT:
          return parseFloat(innerAst.value);
        case Kind.OBJECT: {
          const value = {};
          innerAst.fields.forEach(field => {
            value[field.name.value] = parseLiteral(field.value);
          });
          return value;
        }
        case Kind.LIST:
          return innerAst.values.map(parseLiteral);
        default:
          return null;
      }
    }
    return parseLiteral(ast);
  }
});

/** Helper: ensure the request is from an ADMIN user */
async function ensureAdmin(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    throw new Error('Not authenticated');
  }
  let payload;
  try {
    payload = jwt.verify(auth.slice(7), JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
  const { rows } = await pool.query(
    `SELECT r.code
       FROM users_info ui
       JOIN roles r ON ui.role_id = r.id
      WHERE ui.id = $1`,
    [payload.user_id]
  );
  if (!rows.length || rows[0].code !== 'ADMIN') {
    throw new Error('Not authorized: ADMIN role required');
  }
}

/** Build dynamic WHERE clauses for list queries */
function buildFilters({ search, published, info_show }) {
  const clauses = ['deleted = false', 'LOWER(title) LIKE $1'];
  const params  = [`%${search.toLowerCase()}%`];
  let idx = 2;

  if (published !== undefined) {
    clauses.push(`published = $${idx++}`);
    params.push(published);
  }
  if (info_show !== undefined) {
    clauses.push(`info_show = $${idx++}`);
    params.push(info_show);
  }

  return { where: clauses.join(' AND '), params, nextIndex: idx };
}

const resolvers = {
  JSON:   JSONScalar,
  Upload: GraphQLUpload,

  Query: {
    async getAllPosts(_, {
      page = 1, limit = 12, search = '',
      sortBy = 'created_at', order = 'desc',
      published, info_show
    }) {
      const offset = (page - 1) * limit;
      const validOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      const validSortColumns = ['id','title','created_at'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';

      const { where, params, nextIndex } = buildFilters({ search, published, info_show });
      const listSql = `
        SELECT * FROM post_details
        WHERE ${where}
        ORDER BY ${sortColumn} ${validOrder}
        LIMIT $${nextIndex} OFFSET $${nextIndex+1};
      `;
      const listParams = [...params, limit, offset];
      const { rows: posts } = await pool.query(listSql, listParams);

      const countSql = `
        SELECT COUNT(*) AS count FROM post_details
        WHERE ${where};
      `;
      const { rows: cntRows } = await pool.query(countSql, params);
      const total = parseInt(cntRows[0].count, 10);

      return {
        posts,
        pagination: {
          currentPage: page,
          totalPages:  Math.ceil(total/limit),
          totalPosts:  total
        }
      };
    },

    async getPostById(_, { id }) {
      const { rows } = await pool.query(
        `SELECT * FROM post_details WHERE id = $1`, [id]
      );
      return rows[0] || null;
    },

    async getAllSoftDeletedPosts(_, {
      page = 1, limit = 12, search = '',
      sortBy = 'deleted_at', order = 'desc'
    }) {
      const offset = (page - 1) * limit;
      const validOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      const validSortColumns = ['id','title','deleted_at'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'deleted_at';

      const searchQ = `%${search.toLowerCase()}%`;
      const listSql = `
        SELECT * FROM post_details
        WHERE deleted = true
          AND LOWER(title) LIKE $1
        ORDER BY ${sortColumn} ${validOrder}
        LIMIT $2 OFFSET $3;
      `;
      const { rows: posts } = await pool.query(listSql, [searchQ, limit, offset]);

      const countSql = `
        SELECT COUNT(*) AS count FROM post_details
        WHERE deleted = true
          AND LOWER(title) LIKE $1;
      `;
      const { rows: cnt } = await pool.query(countSql, [searchQ]);
      const total = parseInt(cnt[0].count, 10);

      return {
        posts,
        pagination: {
          currentPage: page,
          totalPages:  Math.ceil(total/limit),
          totalPosts:  total
        }
      };
    },

    async getTotalPostLength() {
      const { rows } = await pool.query(
        `SELECT COUNT(*) AS count FROM post_details WHERE deleted = false`
      );
      return parseInt(rows[0].count, 10);
    },

    async getTotalDeletedPostLength() {
      const { rows } = await pool.query(
        `SELECT COUNT(*) AS count FROM post_details WHERE deleted = true`
      );
      return parseInt(rows[0].count, 10);
    },

    async getDownloadCounter(_, { id }) {
      const { rows } = await pool.query(
        `SELECT download_counter FROM post_details WHERE id = $1`, [id]
      );
      return rows[0]?.download_counter ?? 0;
    },

    async updateDownloadCounter(_, { id }) {
      const now = new Date().toISOString();
      const { rows } = await pool.query(
        `SELECT download_counter FROM post_details WHERE id = $1`, [id]
      );
      const curr = rows[0]?.download_counter ?? 0;
      const next = curr + 1;
      await pool.query(
        `UPDATE post_details SET download_counter = $1, updated_at = $2 WHERE id = $3`,
        [next, now, id]
      );
      return next;
    }
  },

  Mutation: {
    async addPost(_, { input }, { req }) {
      await ensureAdmin(req);

      const {
        h, w, title, info, info_show,
        backgroundurl, data, download_counter,
        published, track
      } = input;

      const now      = new Date().toISOString();
      const id       = Math.random().toString(36).substr(2,9);

      const sql = `
        INSERT INTO post_details
          (id, deleted, h, w, title, info, info_show,
           backgroundurl, data, download_counter,
           created_at, updated_at, published, track)
        VALUES
          ($1, false, $2, $3, $4, $5, $6,
           $7, $8, $9,
           $10, $10, $11, $12)
        RETURNING *;
      `;
      const { rows } = await pool.query(sql, [
        id, h, w, title, info, info_show,
        backgroundurl, data, download_counter,
        now, published, track
      ]);
      return rows[0];
    },

    async updatePost(_, { input }, { req }) {
      await ensureAdmin(req);

      const { id, ...fields } = input;
      const sets  = [];
      const vals  = [];
      let idx = 1;
      for (const [k,v] of Object.entries(fields)) {
        if (v === null || v === undefined) continue;
        sets.push(`${k} = $${idx++}`);
        vals.push(v);
      }
      if (!sets.length) {
        throw new Error('No fields provided for update');
      }
      sets.push(`updated_at = $${idx++}`);
      vals.push(new Date().toISOString());

      vals.push(id);
      const sql = `
        UPDATE post_details
           SET ${sets.join(', ')}
         WHERE id = $${idx}
        RETURNING *;
      `;
      const { rows } = await pool.query(sql, vals);
      return rows[0];
    },

    async softDeletePost(_, { id }, { req }) {
      await ensureAdmin(req);
      const now = new Date().toISOString();
      await pool.query(
        `UPDATE post_details
            SET.deleted = true,
                published = false,
                deleted_at = $1
          WHERE id = $2`,
        [now, id]
      );
      return true;
    },

    async recoverPost(_, { id }, { req }) {
      await ensureAdmin(req);
      await pool.query(
        `UPDATE post_details
            SET deleted = false,
                deleted_at = NULL
          WHERE id = $1`,
        [id]
      );
      return true;
    },

    async hardDeletePost(_, { id }, { req }) {
      await ensureAdmin(req);
      await pool.query(`DELETE FROM post_details WHERE id = $1`, [id]);
      return true;
    },

    // thumbnail upload
    async uploadThumbnail(_, { postId, file }, { req }) {
      await ensureAdmin(req);

      const { createReadStream, filename } = await file;
      const ext = path.extname(filename);
      const dest = path.join(__dirname, '../../public/thumb-images', `${postId}${ext}`);
      await new Promise((res, rej) => {
        createReadStream()
          .pipe(fs.createWriteStream(dest))
          .on('finish', res)
          .on('error', rej);
      });
      return `/thumb-images/${postId}${ext}`;
    }
  }
};

module.exports = { resolvers };
