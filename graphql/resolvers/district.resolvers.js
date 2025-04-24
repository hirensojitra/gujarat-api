// ./graphql/resolvers/district.resolvers.js
const pool = require("../../database/index");

// Utility for dynamic update
function buildUpdateQuery(table, id, data) {
  const entries = Object.entries(data).filter(([_, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return null;

  const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(", ");
  const values = entries.map(([_, val]) => val);
  values.push(id);

  const query = `
    UPDATE ${table}
    SET ${setClause}
    WHERE id = $${values.length} AND is_deleted = FALSE
    RETURNING *;
  `;

  return { query, values };
}

const resolvers = {
  Query: {
    getDistricts: async (_, { pagination = {} }) => {
      const allowedFields = ['name', 'gu_name'];
      const allowedOrders = ['ASC', 'DESC'];

      let { page = 1, limit = 10, sortBy = "name", sortOrder = "ASC" } = pagination;
      if (!allowedFields.includes(sortBy)) sortBy = "name";
      if (!allowedOrders.includes(sortOrder.toUpperCase())) sortOrder = "ASC";

      const offset = (page - 1) * limit;
      const query = `SELECT * FROM districts WHERE is_deleted = FALSE ORDER BY ${sortBy} ${sortOrder} LIMIT $1 OFFSET $2`;
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    },

    getDistrictById: async (_, { id }) => {
      const query = "SELECT * FROM districts WHERE id = $1 AND is_deleted = FALSE";
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    },

    getDeletedDistricts: async (_, { pagination = {} }) => {
      const allowedFields = ['name', 'gu_name'];
      const allowedOrders = ['ASC', 'DESC'];

      let { page = 1, limit = 10, sortBy = "name", sortOrder = "ASC" } = pagination;
      if (!allowedFields.includes(sortBy)) sortBy = "name";
      if (!allowedOrders.includes(sortOrder.toUpperCase())) sortOrder = "ASC";

      const offset = (page - 1) * limit;
      const query = `SELECT * FROM districts WHERE is_deleted = TRUE ORDER BY ${sortBy} ${sortOrder} LIMIT $1 OFFSET $2`;
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    },

    getDeletedDistrictById: async (_, { id }) => {
      const query = "SELECT * FROM districts WHERE id = $1 AND is_deleted = TRUE";
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    },

    getDistrictStats: async () => {
      const sql = `
        SELECT
          COUNT(*)                                             AS "districtLength",
          COUNT(*) FILTER (WHERE is_deleted = FALSE)           AS "activeDistrictLength",
          COUNT(*) FILTER (WHERE is_deleted = TRUE)            AS "deletedDistrictLength"
        FROM districts;
      `;
      const { rows } = await pool.query(sql);
      return {
        districtLength: parseInt(rows[0].districtLength, 10),
        activeDistrictLength: parseInt(rows[0].activeDistrictLength, 10),
        deletedDistrictLength: parseInt(rows[0].deletedDistrictLength, 10),
      };
    },
  },

  Mutation: {
    createDistrict: async (_, { name, gu_name }) => {
      const sql = `
        INSERT INTO districts (name, gu_name, is_deleted)
        VALUES ($1, $2, false)
        RETURNING id, name, gu_name, is_deleted
      `;
      const result = await pool.query(sql, [name, gu_name, is_deleted ? 1 : 0]);
      return result.rows[0];
    },

    createDistricts: async (_, { districts }) => {
      const insertQueries = districts.map(({ name, gu_name }) => {
        return pool.query(
          `INSERT INTO districts (name, gu_name, is_deleted)
           VALUES ($1, $2, $3)
           RETURNING id, name, gu_name, is_deleted`,
          [name, gu_name, false]
        );
      });
      const results = await Promise.all(insertQueries);
      return results.map((r) => r.rows[0]);
    },

    updateDistrict: async (_, { id, ...data }) => {
      const result = buildUpdateQuery("districts", id, data);
      if (!result) return null;
      const response = await pool.query(result.query, result.values);
      return response.rows[0];
    },

    updateDistricts: async (_, { districts }) => {
      const updates = districts.map(({ id, ...data }) => buildUpdateQuery("districts", id, data));
      const validUpdates = updates.filter(Boolean);
      const results = await Promise.all(validUpdates.map(({ query, values }) => pool.query(query, values)));
      return results.map((r) => r.rows[0]);
    },

    softDeleteDistrict: async (_, { id }) => {
      const sql = "UPDATE districts SET is_deleted = TRUE WHERE id = $1 RETURNING *";
      const result = await pool.query(sql, [id]);
      return result.rows[0];
    },

    softDeleteDistricts: async (_, { ids }) => {
      const results = await Promise.all(
        ids.map((id) =>
          pool.query("UPDATE districts SET is_deleted = TRUE WHERE id = $1 RETURNING *", [id])
        )
      );
      return results.map((r) => r.rows[0]);
    },

    hardDeleteDistrict: async (_, { id }) => {
      const result = await pool.query("DELETE FROM districts WHERE id = $1 RETURNING *", [id]);
      return result.rowCount > 0;
    },

    hardDeleteDistricts: async (_, { ids }) => {
      const results = await Promise.all(
        ids.map((id) => pool.query("DELETE FROM districts WHERE id = $1 RETURNING *", [id]))
      );
      return results.every((r) => r.rowCount > 0);
    },

    restoreDistrict: async (_, { id }) => {
      const result = await pool.query(
        "UPDATE districts SET is_deleted = FALSE WHERE id = $1 RETURNING *",
        [id]
      );
      return result.rows[0];
    },

    restoreDistricts: async (_, { ids }) => {
      const results = await Promise.all(
        ids.map((id) =>
          pool.query("UPDATE districts SET is_deleted = FALSE WHERE id = $1 RETURNING *", [id])
        )
      );
      return results.map((r) => r.rows[0]);
    },
  },
};

module.exports = { resolvers };
