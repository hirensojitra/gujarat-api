const politicalPartyResolvers = {
  Query: {
    getPoliticalParties: async (_, __, { pool }) => {
      try {
        const query = 'SELECT * FROM political_parties ORDER BY name ASC';
        const result = await pool.query(query);
        return result.rows;
      } catch (err) {
        throw new Error(`Failed to fetch political parties: ${err.message}`);
      }
    },
    getPoliticalParty: async (_, { id }, { pool }) => {
      try {
        const query = 'SELECT * FROM political_parties WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
      } catch (err) {
        throw new Error(`Failed to fetch political party: ${err.message}`);
      }
    },
  },
  Mutation: {
    createPoliticalParty: async (_, { name, symbol_url, basic_info, is_active }, { pool }) => {
      try {
        const query = `
          INSERT INTO political_parties (name, symbol_url, basic_info, is_active)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        const result = await pool.query(query, [name, symbol_url, basic_info, is_active !== undefined ? is_active : true]);
        return result.rows[0];
      } catch (err) {
        throw new Error(`Failed to create political party: ${err.message}`);
      }
    },
    updatePoliticalParty: async (_, { id, name, symbol_url, basic_info, is_active }, { pool }) => {
      try {
        const fields = [];
        const values = [];
        let count = 1;

        if (name !== undefined) {
          fields.push(`name = $${count++}`);
          values.push(name);
        }
        if (is_active !== undefined) {
          fields.push(`is_active = $${count++}`);
          values.push(is_active);
        }
        if (symbol_url !== undefined) {
          fields.push(`symbol_url = $${count++}`);
          values.push(symbol_url);
        }
        if (basic_info !== undefined) {
          fields.push(`basic_info = $${count++}`);
          values.push(basic_info);
        }

        if (fields.length === 0) return null;

        fields.push(`updated_at = NOW()`);
        
        values.push(id);
        const query = `
          UPDATE political_parties
          SET ${fields.join(', ')}
          WHERE id = $${count}
          RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
      } catch (err) {
        throw new Error(`Failed to update political party: ${err.message}`);
      }
    },
    deletePoliticalParty: async (_, { id }, { pool }) => {
      try {
        const query = 'DELETE FROM political_parties WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [id]);
        return result.rowCount > 0;
      } catch (err) {
        throw new Error(`Failed to delete political party: ${err.message}`);
      }
    },
  },
};

module.exports = { resolvers: politicalPartyResolvers };
