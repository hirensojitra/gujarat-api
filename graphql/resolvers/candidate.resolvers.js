const path = require('path');
const fs = require('fs');
const pool = require('../../database/index');

const checkAuth = (user) => {
  if (!user || !user.role || (user.role.toUpperCase() !== 'ADMINISTRATOR' && user.role.toUpperCase() !== 'OWNER')) {
    throw new Error('Unauthorized: Only Admin and Master admin can register or modify candidates.');
  }
};

const candidateResolvers = {
  Candidate: {
    political_party: async (parent, _, { pool }) => {
      if (!parent.party_id) return null;
      try {
        const query = 'SELECT * FROM political_parties WHERE id = $1';
        const result = await pool.query(query, [parent.party_id]);
        return result.rows[0];
      } catch (err) {
        throw new Error(`Failed to fetch political party for candidate: ${err.message}`);
      }
    },
    organization: async (parent, _, { pool }) => {
      if (!parent.organization_id) return null;
      try {
        const query = 'SELECT * FROM organizations WHERE id = $1';
        const result = await pool.query(query, [parent.organization_id]);
        return result.rows[0];
      } catch (err) {
        throw new Error(`Failed to fetch organization for candidate: ${err.message}`);
      }
    }
  },
  Query: {
    getCandidates: async (_, { organization_id, is_active }, { pool }) => {
      try {
        const conditions = [];
        const values = [];
        if (organization_id) {
          values.push(organization_id);
          conditions.push(`organization_id = $${values.length}`);
        }
        if (is_active !== undefined && is_active !== null) {
          values.push(is_active);
          conditions.push(`is_active = $${values.length}`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const query = `SELECT * FROM candidates ${where} ORDER BY full_name ASC`;
        const result = await pool.query(query, values);
        return result.rows;
      } catch (err) {
        throw new Error(`Failed to fetch candidates: ${err.message}`);
      }
    },
    getCandidate: async (_, { id }, { pool }) => {
      try {
        const query = 'SELECT * FROM candidates WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
      } catch (err) {
        throw new Error(`Failed to fetch candidate: ${err.message}`);
      }
    },
  },
  Mutation: {
    createCandidate: async (_, args, { pool, user }) => {
      checkAuth(user);
      try {
        const {
          full_name, electoral_roll_name, mobile_number, party_id, 
          seat_name, organization_id, is_active
        } = args;

        const query = `
          INSERT INTO candidates (
            full_name, electoral_roll_name, mobile_number, party_id, 
            seat_name, organization_id, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        const values = [
          full_name, electoral_roll_name, mobile_number, party_id, 
          seat_name, organization_id, is_active !== undefined ? is_active : true
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
      } catch (err) {
        throw new Error(`Failed to create candidate: ${err.message}`);
      }
    },
    updateCandidate: async (_, args, { pool, user }) => {
      checkAuth(user);
      try {
        const id = args.id;
        const fields = [];
        const values = [];
        let count = 1;

        const updatableFields = [
          'full_name', 'electoral_roll_name', 'mobile_number', 'party_id', 
          'seat_name', 'organization_id', 'is_active'
        ];

        for (const field of updatableFields) {
          if (args[field] !== undefined) {
            fields.push(`${field} = $${count++}`);
            values.push(args[field]);
          }
        }

        if (fields.length === 0) return null;

        fields.push(`updated_at = NOW()`);
        
        values.push(id);
        const query = `
          UPDATE candidates
          SET ${fields.join(', ')}
          WHERE id = $${count}
          RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
      } catch (err) {
        throw new Error(`Failed to update candidate: ${err.message}`);
      }
    },
    deleteCandidate: async (_, { id }, { pool, user }) => {
      checkAuth(user);
      try {
        const query = 'DELETE FROM candidates WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [id]);
        return result.rowCount > 0;
      } catch (err) {
        throw new Error(`Failed to delete candidate: ${err.message}`);
      }
    },
    uploadCandidateImage: async (_, { candidate_id, angle, image }, { pool, user }) => {
      checkAuth(user);
      try {
        const validAngles = ['front', 'left', 'right'];
        if (!validAngles.includes(angle)) {
          throw new Error(`Invalid angle. Must be one of: ${validAngles.join(', ')}`);
        }

        const columnMap = { front: 'img_front', left: 'img_left', right: 'img_right' };
        const column = columnMap[angle];

        // Fetch OLD file path before overwriting (for garbage cleanup)
        const existing = await pool.query(
          `SELECT ${column} FROM candidates WHERE id = $1`, [candidate_id]
        );
        const oldRelativePath = existing.rows[0]?.[column]; // e.g. "/uploads/candidates/xxx.png"

        // ─── Save new file ────────────────────────────────────────────────
        const resolvedImage = await image;
        const { createReadStream } = resolvedImage;

        const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'candidates');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const newFileName = `candidate_${candidate_id}_${angle}_${Date.now()}.png`;
        const savedPath = path.join(uploadDir, newFileName);
        const imageUrl = `/uploads/candidates/${newFileName}`;

        await new Promise((resolve, reject) => {
          createReadStream()
            .pipe(fs.createWriteStream(savedPath))
            .on('finish', resolve)
            .on('error', reject);
        });

        // ─── Update DB ─────────────────────────────────────────────────────
        const result = await pool.query(
          `UPDATE candidates SET ${column} = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [imageUrl, candidate_id]
        );

        // ─── Garbage collect old file (after successful DB update) ─────────
        if (oldRelativePath) {
          try {
            // Strip the leading "/" then resolve from the uploads root
            const relativePart = oldRelativePath.replace(/^\//, ''); // "uploads/candidates/xxx.png"
            const oldAbsPath = path.join(__dirname, '..', '..', relativePart);
            if (fs.existsSync(oldAbsPath)) {
              fs.unlinkSync(oldAbsPath);
              console.log(`🗑️  Deleted old candidate image: ${oldAbsPath}`);
            }
          } catch (deleteErr) {
            console.warn(`⚠️  Could not delete old image: ${deleteErr.message}`);
            // Non-fatal – don't fail the upload because of a stale file
          }
        }

        return result.rows[0];
      } catch (err) {
        throw new Error(`Failed to upload candidate image: ${err.message}`);
      }
    },
  },
};

module.exports = { resolvers: candidateResolvers };
