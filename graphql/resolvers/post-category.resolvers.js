// ./graphql/resolvers/post-categories.resolvers.js
const pool = require("../../database/index");
function buildUpdateQuery(table, id, data) {
  const entries = Object.entries(data).filter(
    ([_, v]) => v !== null && v !== undefined
  );
  if (entries.length === 0) return null;

  const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(", ");
  const values = entries.map(([_, val]) => val);
  values.push(id);

  const query = `
    UPDATE ${table}
    SET ${setClause}
    WHERE id = $${values.length} AND active = TRUE
    RETURNING *;
  `;

  return { query, values };
}

const resolvers = {
  Query: {
    getPostCategories: async (_, { pagination = {} }) => {
      const allowedFields = ["name", "description"];
      const allowedOrders = ["ASC", "DESC"];

      let {
        page = 1,
        limit = 10,
        sortBy = "name",
        sortOrder = "ASC",
      } = pagination;
      if (!allowedFields.includes(sortBy)) sortBy = "name";
      if (!allowedOrders.includes(sortOrder.toUpperCase())) sortOrder = "ASC";

      const offset = (page - 1) * limit;
      const query = `SELECT * FROM poster_categories WHERE active = TRUE ORDER BY ${sortBy} ${sortOrder} LIMIT $1 OFFSET $2`;
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    },

    getPostCategoryById: async (_, { id }) => {
      const query =
        "SELECT * FROM poster_categories WHERE id = $1 AND active = TRUE";
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    },

    getDeletedPostCategories: async (_, { pagination = {} }) => {
      const allowedFields = ["name", "description"];
      const allowedOrders = ["ASC", "DESC"];

      let {
        page = 1,
        limit = 10,
        sortBy = "name",
        sortOrder = "ASC",
      } = pagination;
      if (!allowedFields.includes(sortBy)) sortBy = "name";
      if (!allowedOrders.includes(sortOrder.toUpperCase())) sortOrder = "ASC";

      const offset = (page - 1) * limit;
      const query = `SELECT * FROM poster_categories WHERE active = FALSE ORDER BY ${sortBy} ${sortOrder} LIMIT $1 OFFSET $2`;
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    },

    getDeletedPostCategoryById: async (_, { id }) => {
      const query =
        "SELECT * FROM poster_categories WHERE id = $1 AND active = FALSE";
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    },

    getPostCategoryStats: async () => {
      const sql = `
        SELECT
          COUNT(*)                                             AS "postCategoryLength",
          COUNT(*) FILTER (WHERE active = TRUE)           AS "activePostCategoryLength",
          COUNT(*) FILTER (WHERE active = FALSE)            AS "deletedPostCategoryLength"
        FROM poster_categories;
      `;
      const { rows } = await pool.query(sql);
      return {
        postCategoryLength: parseInt(rows[0].postCategoryLength, 10),
        activePostCategoryLength: parseInt(
          rows[0].activePostCategoryLength,
          10
        ),
        deletedPostCategoryLength: parseInt(
          rows[0].deletedPostCategoryLength,
          10
        ),
      };
    },
  },

  Mutation: {
    createPostCategory: async (_, { name, description }) => {
      const sql = `
        INSERT INTO poster_categories (name, description, active)
        VALUES ($1, $2, false)
        RETURNING id, name, description, active
      `;
      const result = await pool.query(sql, [name, description, active ? 1 : 0]);
      return result.rows[0];
    },

    createPostCategories: async (_, { postCategories }) => {
      const insertQueries = postCategories.map(({ name, description }) => {
        return pool.query(
          `INSERT INTO poster_categories (name, description, active)
           VALUES ($1, $2, $3)
           RETURNING id, name, description, active`,
          [name, description, false]
        );
      });
      const results = await Promise.all(insertQueries);
      return results.map((r) => r.rows[0]);
    },
    updatePostCategory: async (_, { id, ...data }) => {
      const result = buildUpdateQuery("poster_categories", id, data);
      if (!result) return null;
      const response = await pool.query(result.query, result.values);
      return response.rows[0];
    },

    updatePostCategories: async (_, { postCategories }) => {
      const updates = postCategories.map(({ id, ...data }) =>
        buildUpdateQuery("poster_categories", id, data)
      );
      const validUpdates = updates.filter(Boolean);
      const results = await Promise.all(
        validUpdates.map(({ query, values }) => pool.query(query, values))
      );
      return results.map((r) => r.rows[0]);
    },

    softDeletePostCategory: async (_, { id }) => {
      const sql =
        "UPDATE poster_categories SET active = FALSE WHERE id = $1 RETURNING *";
      const result = await pool.query(sql, [id]);
      return result.rows[0];
    },

    softDeletePostCategories: async (_, { ids }) => {
      const results = await Promise.all(
        ids.map((id) =>
          pool.query(
            "UPDATE poster_categories SET active = FALSE WHERE id = $1 RETURNING *",
            [id]
          )
        )
      );
      return results.map((r) => r.rows[0]);
    },

    hardDeletePostCategory: async (_, { id }) => {
      const result = await pool.query(
        "DELETE FROM poster_categories WHERE id = $1 RETURNING *",
        [id]
      );
      return result.rowCount > 0;
    },

    hardDeletePostCategories: async (_, { ids }) => {
      const results = await Promise.all(
        ids.map((id) =>
          pool.query(
            "DELETE FROM poster_categories WHERE id = $1 RETURNING *",
            [id]
          )
        )
      );
      return results.every((r) => r.rowCount > 0);
    },

    restorePostCategory: async (_, { id }) => {
      const result = await pool.query(
        "UPDATE poster_categories SET active = TRUE WHERE id = $1 RETURNING *",
        [id]
      );
      return result.rows[0];
    },

    restorePostCategories: async (_, { ids }) => {
      const results = await Promise.all(
        ids.map((id) =>
          pool.query(
            "UPDATE poster_categories SET active = TRUE WHERE id = $1 RETURNING *",
            [id]
          )
        )
      );
      return results.map((r) => r.rows[0]);
    },
  },
};

module.exports = { resolvers };
