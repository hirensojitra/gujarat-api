const pool = require("../../database/index");

const resolvers = {
  Query: {
    getSelectedTalukaId: async () => {
      const query = `SELECT id FROM talukas WHERE is_deleted = FALSE ORDER BY name ASC LIMIT 1;`;
      const result = await pool.query(query);
      return result.rows[0]?.id || null;
    },

    getVillages: async (_, { taluka_id, pagination }) => {
      const {
        page = 1,
        limit = 10,
        sortBy = "name",
        sortOrder = "ASC",
      } = pagination;
      const offset = (page - 1) * limit;
      const query = `SELECT * FROM villages WHERE taluka_id = $1 AND is_deleted = FALSE ORDER BY ${sortBy} ${sortOrder} LIMIT $2 OFFSET $3;`;
      const result = await pool.query(query, [taluka_id, limit, offset]);
      return result.rows;
    },

    getVillagesByTalukaId: async (_, { taluka_id, pagination = {} }) => {
      const {
        page = 1,
        limit = 1000,
        sortBy = "name",
        sortOrder = "ASC",
      } = pagination;
      const offset = (page - 1) * limit;
      const query = `SELECT * FROM villages WHERE taluka_id = $1 AND is_deleted = FALSE ORDER BY ${sortBy} ${sortOrder} LIMIT $2 OFFSET $3;`;
      const result = await pool.query(query, [taluka_id, limit, offset]);
      return result.rows;
    },

    getDeletedVillagesByTalukaId: async (_, { taluka_id, pagination = {} }) => {
      const {
        page = 1,
        limit = 1000,
        sortBy = "name",
        sortOrder = "ASC",
      } = pagination;
      const offset = (page - 1) * limit;
      const query = `SELECT * FROM villages WHERE taluka_id = $1 AND is_deleted = TRUE ORDER BY ${sortBy} ${sortOrder} LIMIT $2 OFFSET $3;`;
      const result = await pool.query(query, [taluka_id, limit, offset]);
      return result.rows;
    },

    getDeletedVillages: async (_, { pagination }) => {
      const {
        page = 1,
        limit = 10,
        sortBy = "name",
        sortOrder = "ASC",
      } = pagination;
      const offset = (page - 1) * limit;
      const query = `SELECT * FROM villages WHERE is_deleted = TRUE ORDER BY ${sortBy} ${sortOrder} LIMIT $1 OFFSET $2;`;
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    },

    getVillageById: async (_, { id }) => {
      const query = `SELECT * FROM villages WHERE id = $1 AND is_deleted = FALSE;`;
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    },

    getDeletedVillageById: async (_, { id }) => {
      const query = `SELECT * FROM villages WHERE id = $1 AND is_deleted = TRUE;`;
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    },

    getVillageStats: async () => {
      const query = `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_deleted = FALSE) AS active, COUNT(*) FILTER (WHERE is_deleted = TRUE) AS deleted FROM villages;`;
      const result = await pool.query(query);
      return {
        totalVillages: parseInt(result.rows[0].total, 10),
        activeVillages: parseInt(result.rows[0].active, 10),
        deletedVillages: parseInt(result.rows[0].deleted, 10),
      };
    },

    getVillageStatsByTaluka: async (
      _,
      { taluka_id, district_id, activePagination = {}, deletedPagination = {} }
    ) => {
      let selectedTalukaId = taluka_id;
      let selectedDistrictId = district_id;

      // Handle cases where either or both are missing
      if (!selectedTalukaId && !selectedDistrictId) {
        const districtResult = await pool.query(`
            SELECT id FROM districts WHERE is_deleted = FALSE ORDER BY name ASC LIMIT 1
          `);
        selectedDistrictId = districtResult.rows[0]?.id;

        const talukaResult = await pool.query(
          `
            SELECT id FROM talukas WHERE is_deleted = FALSE AND district_id = $1 ORDER BY name ASC LIMIT 1
          `,
          [selectedDistrictId]
        );
        selectedTalukaId = talukaResult.rows[0]?.id;
      } else if (!selectedTalukaId && selectedDistrictId) {
        const talukaResult = await pool.query(
          `
            SELECT id FROM talukas WHERE is_deleted = FALSE AND district_id = $1 ORDER BY name ASC LIMIT 1
          `,
          [selectedDistrictId]
        );
        selectedTalukaId = talukaResult.rows[0]?.id;
      } else if (selectedTalukaId && !selectedDistrictId) {
        const districtResult = await pool.query(
          `
            SELECT district_id FROM talukas WHERE id = $1 LIMIT 1
          `,
          [selectedTalukaId]
        );
        selectedDistrictId = districtResult.rows[0]?.district_id;
      }

      // Fetch supporting data
      const [
        talukasResult,
        villagesResult,
        deletedVillagesResult,
        countResult,
      ] = await Promise.all([
        pool.query(
          `SELECT id, name, gu_name FROM talukas WHERE district_id = $1 AND is_deleted = FALSE ORDER BY name ASC`,
          [selectedDistrictId]
        ),

        pool.query(
          `
            SELECT id, name, gu_name FROM villages
            WHERE taluka_id = $1 AND is_deleted = FALSE
            ORDER BY ${activePagination.sortBy || "name"} ${
            activePagination.sortOrder || "ASC"
          }
            LIMIT $2 OFFSET $3
          `,
          [
            selectedTalukaId,
            activePagination.limit || 10,
            ((activePagination.page || 1) - 1) * (activePagination.limit || 10),
          ]
        ),

        pool.query(
          `
            SELECT id, name, gu_name FROM villages
            WHERE taluka_id = $1 AND is_deleted = TRUE
            ORDER BY ${deletedPagination.sortBy || "name"} ${
            deletedPagination.sortOrder || "ASC"
          }
            LIMIT $2 OFFSET $3
          `,
          [
            selectedTalukaId,
            deletedPagination.limit || 10,
            ((deletedPagination.page || 1) - 1) *
              (deletedPagination.limit || 10),
          ]
        ),

        pool.query(
          `
            SELECT
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE is_deleted = FALSE) AS active,
              COUNT(*) FILTER (WHERE is_deleted = TRUE) AS deleted
            FROM villages
            WHERE taluka_id = $1
          `,
          [selectedTalukaId]
        ),
      ]);

      const countRow = countResult.rows[0];

      return {
        talukas: talukasResult.rows,
        selectedDistrictId,
        selectedTalukaId,
        activeVillagesByTalukaId: villagesResult.rows || [], // ✅ must match schema field
        deletedVillagesByTalukaId: deletedVillagesResult.rows || [], // ✅ must match schema field
        totalVillagesByTalukaId: parseInt(countRow.total, 10),
        totalActiveVillagesByTalukaId: parseInt(countRow.active, 10),
        totalDeletedVillagesByTalukaId: parseInt(countRow.deleted, 10),
      };
    },
  },

  Mutation: {
    createVillage: async (_, { name, gu_name, taluka_id }) => {
      const is_deleted = false;
      const result = await pool.query(
        `
        INSERT INTO villages (name, gu_name, taluka_id, is_deleted)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `,
        [name, gu_name, taluka_id, is_deleted]
      );
      return result.rows[0];
    },

    createVillages: async (_, { villages }) => {
      const inserts = villages.map((v) =>
        pool.query(
          `
          INSERT INTO villages (name, gu_name, taluka_id, is_deleted)
          VALUES ($1, $2, $3, $4)
          RETURNING *;
        `,
          [v.name, v.gu_name, v.taluka_id, false]
        )
      );
      const results = await Promise.all(inserts);
      return results.map((r) => r.rows[0]);
    },

    updateVillage: async (_, args) => {
      const { id, ...updates } = args;
      const fields = Object.entries(updates)
        .map(([key], i) => `${key} = $${i + 1}`)
        .join(", ");
      const values = [...Object.values(updates), id];

      const result = await pool.query(
        `
        UPDATE villages SET ${fields} WHERE id = $${values.length} RETURNING *;
      `,
        values
      );
      return result.rows[0];
    },

    updateVillages: async (_, { villages }) => {
      const updates = villages.map(({ id, ...data }) => {
        // Filter out null/undefined fields
        const entries = Object.entries(data).filter(
          ([_, v]) => v !== null && v !== undefined
        );

        if (entries.length === 0) return null; // Skip if no valid fields to update

        const setClause = entries
          .map(([key], index) => `${key} = $${index + 1}`)
          .join(", ");
        const values = entries.map(([_, value]) => value);
        values.push(id); // Add id as last param for WHERE clause

        const query = `
            UPDATE villages
            SET ${setClause}
            WHERE id = $${values.length} AND is_deleted = FALSE
            RETURNING *;
          `;

        return pool.query(query, values);
      });

      const results = await Promise.all(updates.filter(Boolean));
      return results.map((r) => r.rows[0]);
    },
    softDeleteVillage: async (_, { id }) => {
      const result = await pool.query(
        `UPDATE villages SET is_deleted = TRUE WHERE id = $1 RETURNING *;`,
        [id]
      );
      return result.rows[0];
    },

    softDeleteVillages: async (_, { ids }) => {
      const results = await Promise.all(
        ids.map((id) =>
          pool.query(
            `UPDATE villages SET is_deleted = TRUE WHERE id = $1 RETURNING *;`,
            [id]
          )
        )
      );
      return results.map((r) => r.rows[0]);
    },

    restoreVillage: async (_, { id }) => {
      const result = await pool.query(
        `UPDATE villages SET is_deleted = FALSE WHERE id = $1 RETURNING *;`,
        [id]
      );
      return result.rows[0];
    },

    restoreVillages: async (_, { ids }) => {
      const results = await Promise.all(
        ids.map((id) =>
          pool.query(
            `UPDATE villages SET is_deleted = FALSE WHERE id = $1 RETURNING *;`,
            [id]
          )
        )
      );
      return results.map((r) => r.rows[0]);
    },

    hardDeleteVillage: async (_, { id }) => {
      const result = await pool.query(`DELETE FROM villages WHERE id = $1;`, [
        id,
      ]);
      return result.rowCount > 0;
    },

    hardDeleteVillages: async (_, { ids }) => {
      const results = await Promise.all(
        ids.map((id) => pool.query(`DELETE FROM villages WHERE id = $1;`, [id]))
      );
      return results.every((r) => r.rowCount > 0);
    },
  },
};

module.exports = { resolvers };
