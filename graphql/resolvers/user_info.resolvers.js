const pool = require("../../database/index");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || "3812932sjad43&*@";

const resolvers = {

  Query: {
    async getUserById(_, { id }) {
      const { rows } = await pool.query('SELECT * FROM users_info WHERE id = $1', [id]);
      return rows[0];
    },
  },

  Mutation: {
    async registerUser(_, { input }) {
      const { firstname, lastname, middlename, pass_key, number, email, username, role_id } = input;

      const existingNumber = await pool.query('SELECT 1 FROM users_info WHERE number = $1', [number]);
      if (existingNumber.rowCount > 0) {
        throw new Error('Mobile number already registered.');
      }

      const existingEmail = await pool.query('SELECT 1 FROM user_emails WHERE email = $1', [email]);
      if (existingEmail.rowCount > 0) {
        throw new Error('Email already registered.');
      }

      const existingUsername = await pool.query('SELECT 1 FROM user_usernames WHERE username = $1', [username]);
      if (existingUsername.rowCount > 0) {
        throw new Error('Username already taken.');
      }

      const hashedPassword = await bcrypt.hash(pass_key, 10);
      const userId = uuidv4().replace(/-/g, '');

      await pool.query(`
        INSERT INTO users_info (id, firstname, lastname, middlename, pass_key, number, number_verified, role_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, false, $7, NOW())
      `, [userId, firstname, lastname, middlename, hashedPassword, number, role_id]);

      await pool.query(`
        INSERT INTO user_emails (user_id, email, is_primary, is_verified, created_at)
        VALUES ($1, $2, true, false, NOW())
      `, [userId, email]);

      await pool.query(`
        INSERT INTO user_usernames (username, user_id, status, created_at)
        VALUES ($1, $2, 'active', NOW())
      `, [username, userId]);

      const token = jwt.sign({ userId, roleId: role_id }, JWT_SECRET, { expiresIn: '7d' });

      return {
        token,
        user_id: userId,
        role_id,
        username
      };
    },

    async login(_, { input }) {
      const { login_id, pass_key } = input;

      const userQuery = `
        SELECT u.* FROM users_info u
        LEFT JOIN user_emails ue ON u.id = ue.user_id
        WHERE (u.number = $1 OR ue.email = $1) AND (ue.is_primary = true OR ue.is_primary IS NULL)
        LIMIT 1
      `;
      const { rows } = await pool.query(userQuery, [login_id]);
      const user = rows[0];

      if (!user) {
        throw new Error('User not found.');
      }

      const valid = await bcrypt.compare(pass_key, user.pass_key);
      if (!valid) {
        throw new Error('Incorrect password.');
      }

      const { rows: usernameRows } = await pool.query(
        'SELECT username FROM user_usernames WHERE user_id = $1 AND status = $2 LIMIT 1',
        [user.id, 'active']
      );
      const token = jwt.sign({ userId: user.id, roleId: user.role_id }, JWT_SECRET, { expiresIn: '7d' });
      return {
        token,
        user_id: user.id,
        role_id: user.role_id,
        username: usernameRows[0]?.username || ''
      };
    }
  }
};

module.exports = { resolvers };
