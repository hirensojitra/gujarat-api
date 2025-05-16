const pool = require("../../database/index");

const resolvers = {
  Query: {
    // 1) Fallback: return first active post category ID
    getSelectedPostCategoryId: async () => {
      const result = await pool.query(
        `SELECT id FROM poster_categories
         WHERE active = TRUE
         ORDER BY name ASC
         LIMIT 1;`
      );
      return result.rows[0]?.id || null;
    },

    // 2) Active subcategories under a given category
    getPostSubcategoriesByCategoryId: async (
      _,
      { category_id, pagination = {} }
    ) => {
      const {
        page = 1,
        limit = 10,
        sortBy = "name",
        sortOrder = "ASC",
      } = pagination;
      const offset = (page - 1) * limit;

      const result = await pool.query(
        `
        SELECT *
        FROM poster_subcategories
        WHERE category_id = $1 AND active = TRUE
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $2 OFFSET $3;
      `,
        [category_id, limit, offset]
      );
      return result.rows;
    },

    // 3) Deleted subcategories under a given category
    getDeletedPostSubcategoriesByCategoryId: async (
      _,
      { category_id, pagination = {} }
    ) => {
      const {
        page = 1,
        limit = 10,
        sortBy = "name",
        sortOrder = "ASC",
      } = pagination;
      const offset = (page - 1) * limit;

      const result = await pool.query(
        `
        SELECT *
        FROM poster_subcategories
        WHERE category_id = $1 AND active = FALSE
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $2 OFFSET $3;
      `,
        [category_id, limit, offset]
      );
      return result.rows;
    },

    // 4) All deleted subcategories (no category filter)
    getDeletedPostSubcategories: async (_, { pagination = {} }) => {
      const {
        page = 1,
        limit = 10,
        sortBy = "name",
        sortOrder = "ASC",
      } = pagination;
      const offset = (page - 1) * limit;

      const result = await pool.query(
        `
        SELECT *
        FROM poster_subcategories
        WHERE active = FALSE
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $1 OFFSET $2;
      `,
        [limit, offset]
      );
      return result.rows;
    },

    // 5) Single active subcategory by ID
    getPostSubcategoryById: async (_, { id }) => {
      const result = await pool.query(
        `
        SELECT *
        FROM poster_subcategories
        WHERE id = $1 AND active = TRUE;
      `,
        [id]
      );
      return result.rows[0] || null;
    },

    // 6) Single deleted subcategory by ID
    getDeletedPostSubcategoryById: async (_, { id }) => {
      const result = await pool.query(
        `
        SELECT *
        FROM poster_subcategories
        WHERE id = $1 AND active = FALSE;
      `,
        [id]
      );
      return result.rows[0] || null;
    },

    // 7) Global counts of subcategories
    getPostSubcategoryStats: async () => {
      const result = await pool.query(
        `
        SELECT
          COUNT(*)                                AS "totalSubcategories",
          COUNT(*) FILTER (WHERE active = TRUE)   AS "activeSubcategories",
          COUNT(*) FILTER (WHERE active = FALSE)  AS "deletedSubcategories"
        FROM poster_subcategories;
      `
      );
      return result.rows[0];
    },

    // 8) Stats + paginated lists for one category (with fallback)
    getPostSubcategoryStatsByCategory: async (
      _,
      { category_id, activePagination = {}, deletedPagination = {} }
    ) => {
      // a) Determine selectedId (fallback to first active category)
      let selectedId = category_id;
      if (!selectedId) {
        const sel = await pool.query(
          `SELECT id
             FROM poster_categories
            WHERE active = TRUE
            ORDER BY name ASC
            LIMIT 1;`
        );
        selectedId = sel.rows[0]?.id || null;
      }

      // b) Build the WHERE clause for sub.category_id (we’ll
      //    enforce cat.active = TRUE in the JOIN below)
      const conditions = [];
      const values = [];
      if (selectedId) {
        conditions.push(`sub.category_id = $${values.length + 1}`);
        values.push(selectedId);
      }
      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      // c) Totals: only subcategories whose parent category is active
      const totalsRes = await pool.query(
        `
        SELECT
          COUNT(*)                                 AS total,
          COUNT(*) FILTER (WHERE sub.active = TRUE)  AS active,
          COUNT(*) FILTER (WHERE sub.active = FALSE) AS deleted
        FROM poster_subcategories AS sub
        JOIN poster_categories      AS cat
          ON sub.category_id = cat.id
         AND cat.active = TRUE
        ${whereClause};
        `,
        values
      );
      const { total, active, deleted } = totalsRes.rows[0];

      // d) Fetch category metadata (only if it’s active)
      const categoriesRes = await pool.query(
        `SELECT id, name, description, active
          FROM poster_categories
         WHERE active = TRUE ORDER BY name ASC;
        `
      );

      // e) Paginated list helper (uses the same JOIN + filters)
      const fetchList = async (
        flag,
        { page = 1, limit = 10, sortBy = "name", sortOrder = "ASC" }
      ) => {
        const offset = (page - 1) * limit;
        const params = [selectedId, flag, limit, offset];

        const { rows } = await pool.query(
          `
          SELECT sub.*
            FROM poster_subcategories AS sub
            JOIN poster_categories      AS cat
              ON sub.category_id = cat.id
             AND cat.active = TRUE
           WHERE sub.category_id = $1
             AND sub.active      = $2
          ORDER BY sub.${sortBy} ${sortOrder}
          LIMIT  $3
         OFFSET  $4;
          `,
          params
        );
        return rows;
      };

      const activeList = await fetchList(true, activePagination);
      const deletedList = await fetchList(false, deletedPagination);

      return {
        categories: categoriesRes.rows,
        selectedId,
        totalPostSubcategoriesByCategoryId: parseInt(total, 10),
        totalActivePostSubcategoriesByCategoryId: parseInt(active, 10),
        totalDeletedPostSubcategoriesByCategoryId: parseInt(deleted, 10),
        activePostSubcategoriesByCategoryId: activeList,
        deletedPostSubcategoriesByCategoryId: deletedList,
      };
    },
  },

  Mutation: {
    // 1) Create a single subcategory only if its category is active
    createPostSubcategory: async (_, { name, description, category_id }) => {
      const result = await pool.query(
        `
    INSERT INTO poster_subcategories (name, description, category_id, active)
    SELECT $1, $2, cat.id, TRUE
      FROM poster_categories AS cat
     WHERE cat.id = $3
       AND cat.active = TRUE
    RETURNING *;
    `,
        [name, description, category_id]
      );

      // If no row was returned, the category was missing or inactive
      if (!result.rows[0]) {
        throw new Error(
          `Category ${category_id} does not exist or is not active.`
        );
      }

      return result.rows[0];
    },

    // 2) Bulk-create, enforcing active categories in SQL
    createPostSubcategories: async (_, { subcategories }) => {
      // For each input, run an INSERT...SELECT that only succeeds if the category is active
      const creations = subcategories.map(
        async ({ name, description, category_id }) => {
          const res = await pool.query(
            `
      INSERT INTO poster_subcategories (name, description, category_id, active)
      SELECT $1, $2, cat.id, TRUE
        FROM poster_categories AS cat
       WHERE cat.id = $3
         AND cat.active = TRUE
      RETURNING *;
      `,
            [name, description, category_id]
          );
          if (!res.rows[0]) {
            throw new Error(
              `Category ${category_id} does not exist or is not active.`
            );
          }
          return res.rows[0];
        }
      );

      return Promise.all(creations);
    },

    // 1) Single‐row update
    updatePostSubcategory: async (
      _,
      { id, name, description, category_id }
    ) => {
      const setClauses = [];
      const values = [];
      let idx = 1;

      if (name !== undefined) {
        setClauses.push(`name = $${idx}`);
        values.push(name);
        idx++;
      }
      if (description !== undefined) {
        setClauses.push(`description = $${idx}`);
        values.push(description);
        idx++;
      }
      if (category_id !== undefined) {
        setClauses.push(`category_id = $${idx}`);
        values.push(category_id);
        idx++;
      }

      if (setClauses.length === 0) {
        throw new Error("No fields provided for update");
      }

      // now push the id param
      const idParamIndex = idx;
      values.push(id);

      let sql;
      if (category_id !== undefined) {
        // we need to JOIN to poster_categories to ensure the *new* category_id is active
        const categoryParamIndex = idParamIndex - 1;
        sql = `
      UPDATE poster_subcategories AS sub
         SET ${setClauses.join(", ")}
        FROM poster_categories   AS cat
       WHERE sub.id       = $${idParamIndex}
         AND cat.id        = $${categoryParamIndex}
         AND cat.active    = TRUE
      RETURNING sub.*;
    `;
      } else {
        // simple update when category_id isn’t changing
        sql = `
      UPDATE poster_subcategories AS sub
         SET ${setClauses.join(", ")}
       WHERE sub.id = $${idParamIndex}
      RETURNING sub.*;
    `;
      }

      const { rows } = await pool.query(sql, values);
      return rows[0] || null;
    },

    // 2) Bulk‐row update
    updatePostSubcategories: async (_, { subcategories }) => {
      const updated = [];

      for (const { id, name, description, category_id } of subcategories) {
        const setClauses = [];
        const values = [];
        let idx = 1;

        if (name !== undefined) {
          setClauses.push(`name = $${idx}`);
          values.push(name);
          idx++;
        }
        if (description !== undefined) {
          setClauses.push(`description = $${idx}`);
          values.push(description);
          idx++;
        }
        if (category_id !== undefined) {
          setClauses.push(`category_id = $${idx}`);
          values.push(category_id);
          idx++;
        }

        if (setClauses.length === 0) {
          throw new Error("No fields provided for update");
        }

        // id param
        const idParamIndex = idx;
        values.push(id);

        let sql;
        if (category_id !== undefined) {
          const categoryParamIndex = idParamIndex - 1;
          sql = `
        UPDATE poster_subcategories AS sub
           SET ${setClauses.join(", ")}
          FROM poster_categories   AS cat
         WHERE sub.id    = $${idParamIndex}
           AND cat.id     = $${categoryParamIndex}
           AND cat.active = TRUE
        RETURNING sub.*;
      `;
        } else {
          sql = `
        UPDATE poster_subcategories AS sub
           SET ${setClauses.join(", ")}
         WHERE sub.id = $${idParamIndex}
        RETURNING sub.*;
      `;
        }

        const { rows } = await pool.query(sql, values);
        updated.push(rows[0] || null);
      }

      return updated;
    },

    // Soft-delete multiple subcategories only if their parent categories are active
    softDeletePostSubcategories: async (_, { ids }) => {
      const result = await pool.query(
        `
    UPDATE poster_subcategories AS sub
       SET active = FALSE
      FROM poster_categories     AS cat
     WHERE sub.id = ANY($1)
       AND sub.category_id = cat.id
       AND cat.active = TRUE
  RETURNING sub.*;
    `,
        [ids]
      );
      // returns only those subcategories that were successfully deactivated
      return result.rows;
    },

    restorePostSubcategories: async (_, { ids }) => {
      const result = await pool.query(
        `
    UPDATE poster_subcategories AS sub
       SET active = TRUE
      FROM poster_categories     AS cat
     WHERE sub.id = ANY($1)
       AND sub.category_id = cat.id
       AND cat.active = TRUE
  RETURNING sub.*;
    `,
        [ids]
      );
      // Returns only those subcategories whose parent category was active
      return result.rows;
    },

    hardDeletePostSubcategories: async (_, { ids }) => {
      const { rowCount } = await pool.query(
        `
      DELETE FROM poster_subcategories AS sub
        USING poster_categories AS cat
       WHERE sub.id = ANY($1)
         AND sub.category_id = cat.id
         AND cat.active = TRUE;
      `,
        [ids]
      );
      // only return true if *all* requested IDs were deleted
      return rowCount === ids.length;
    },
  },
};

module.exports = { resolvers };
