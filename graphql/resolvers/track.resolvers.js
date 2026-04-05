const pool = require('../../database');
const exceljs = require('exceljs');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const resolvers = {
  Query: {
    getTrackData: async (_, { imgParam }) => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT vs.value_data, vs.timestamp
           FROM KeySet ks
           JOIN ValueSet vs ON ks.id = vs.key_set_id
           WHERE ks.img_id = $1
           ORDER BY vs.timestamp`,
          [imgParam]
        );
        return result.rows.map(row => ({ value_data: row.value_data, timestamp: row.timestamp }));
      } catch (error) {
        console.error("Error fetching track data:", error);
        throw new Error("Failed to fetch track data");
      } finally {
        client.release();
      }
    },
    getAllTrackedPosters: async (_, __, context) => {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT ks.img_id, COUNT(vs.id) as total_downloads, MAX(vs.timestamp) as latest_download
          FROM KeySet ks
          JOIN ValueSet vs ON ks.id = vs.key_set_id
          GROUP BY ks.img_id
          ORDER BY latest_download DESC
        `);
        return result.rows.map(row => ({
          img_id: row.img_id,
          total_downloads: parseInt(row.total_downloads, 10),
          latest_download: row.latest_download ? new Date(row.latest_download).toISOString() : null
        }));
      } catch (error) {
        console.error("Error fetching all tracked posters:", error);
        throw new Error("Failed to fetch all tracked posters");
      } finally {
        client.release();
      }
    },
  },
  Mutation: {
    saveTrackData: async (_, { input }) => {
      const client = await pool.connect();
      try {
        const { formData, imgParam } = input;
        if (!imgParam || !formData) {
          throw new Error("imgParam and formData are required");
        }

        const imgId = imgParam;
        const keysArray = Object.keys(formData);

        let keySetId;
        const keySetResult = await client.query(
          'SELECT id FROM KeySet WHERE img_id = $1 AND keys_array = $2',
          [imgId, JSON.stringify(keysArray)]
        );

        if (keySetResult.rows.length > 0) {
          keySetId = keySetResult.rows[0].id;
        } else {
          const insertKeySetResult = await client.query(
            'INSERT INTO KeySet (img_id, keys_array) VALUES ($1, $2) RETURNING id',
            [imgId, JSON.stringify(keysArray)]
          );
          keySetId = insertKeySetResult.rows[0].id;
        }

        await client.query(
          'INSERT INTO ValueSet (key_set_id, value_data) VALUES ($1, $2)',
          [keySetId, JSON.stringify(formData)]
        );

        return { message: "Data saved successfully to database" };
      } catch (error) {
        console.error("Error saving data:", error);
        throw new Error("Failed to save data");
      } finally {
        client.release();
      }
    },
    deleteTrackData: async (_, { imgParam }, context) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        const keySets = await client.query('SELECT id FROM KeySet WHERE img_id = $1', [imgParam]);
        if (keySets.rows.length > 0) {
          const keySetIds = keySets.rows.map(row => row.id);
          await client.query('DELETE FROM ValueSet WHERE key_set_id = ANY($1::int[])', [keySetIds]);
          await client.query('DELETE FROM KeySet WHERE img_id = $1', [imgParam]);
        }
        
        await client.query('COMMIT');
        return { message: "Tracking data deleted successfully" };
      } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error deleting track data:", error);
        throw new Error("Failed to delete tracking data");
      } finally {
        client.release();
      }
    },
  },
};

module.exports = { resolvers };
