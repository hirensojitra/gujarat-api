// language.resolvers.js
const pool = require("../../database");

const LANGUAGE_FIELDS = "id, code, name, local_name";

const resolvers = {
  Query: {
    // GET all languages
    languages: async () => {
      const { rows } = await pool.query(`
        SELECT ${LANGUAGE_FIELDS}
        FROM languages
        ORDER BY id
      `);
      return rows;
    },

    // GET one language by id
    language: async (_, { id }) => {
      const { rows } = await pool.query(
        `SELECT ${LANGUAGE_FIELDS} FROM languages WHERE id = $1 LIMIT 1`,
        [id]
      );
      return rows[0] || null;
    },
  },

  Mutation: {
    createLanguage: async (_, { input }) => {
      const { code, name, local_name } = input;
      const { rows } = await pool.query(
        `
        INSERT INTO languages (code, name, local_name)
        VALUES ($1, $2, $3)
        RETURNING ${LANGUAGE_FIELDS}
        `,
        [code, name, local_name]
      );
      return rows[0];
    },

    updateLanguage: async (_, { id, input }) => {
      // build dynamic SET clause
      const sets = [];
      const vals = [];
      let idx = 1;
      for (const [key, val] of Object.entries(input)) {
        if (val === undefined || val === null) continue;
        sets.push(`${key} = $${idx}`);
        vals.push(val);
        idx++;
      }

      if (sets.length === 0) {
        throw new Error("No fields provided for update");
      }

      vals.push(id);
      const { rows } = await pool.query(
        `
        UPDATE languages
        SET ${sets.join(", ")}
        WHERE id = $${idx}
        RETURNING ${LANGUAGE_FIELDS}
        `,
        vals
      );

      if (!rows.length) {
        throw new Error("Language not found");
      }
      return rows[0];
    },

    // DELETE a language
    deleteLanguage: async (_, { id }) => {
      const { rowCount } = await pool.query(
        `DELETE FROM languages WHERE id = $1`,
        [id]
      );
      return rowCount > 0;
    },
  },
};

module.exports = { resolvers };
