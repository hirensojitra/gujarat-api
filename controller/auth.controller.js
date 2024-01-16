const pool = require("../database/index");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const authController = {
  register: async (req, res) => {
    try {
      const { email, password, username } = req.body;

      const [user] = await pool.query(
        "SELECT * FROM users WHERE email = ? or username = ?",
        [email, username]
      );

      if (user[0]) {
        return res.json({ error: "Email already exists!" });
      }

      const hash = await new Promise((resolve, reject) => {
        bcrypt.hash(password, 10, function (err, hashedPassword) {
          if (err) {
            reject(err);
          } else {
            resolve(hashedPassword);
          }
        });
      });
      const sql =
        "INSERT INTO users (email, password, username) VALUES (?, ?, ?)";
      const [rows] = await pool.query(sql, [email, hash, username]);

      if (rows.affectedRows) {
        return res.json({ success: true, user: rows[0] });
      } else {
        return res.json({ error: "Error" });
      }
    } catch (error) {
      console.log(error);
      res.json({ error: error.message });
    }
  },
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      const [user] = await pool.query(
        "SELECT * FROM users WHERE username = ?",
        [username]
      );

      if (!user[0]) {
        return res.json({ error: "Invalid username!" });
      }
      const hash = await new Promise((resolve, reject) => {
        bcrypt.hash(password, 10, function (err, hashedPassword) {
          if (err) {
            reject(err);
          } else {
            resolve(hashedPassword);
          }
        });
      });
      if (hash) {
        const accessToken = jwt.sign(
          { userId: user[0].id },
          "3812932sjad34&*@",
          {
            expiresIn: "1h",
          }
        );
        const { password, ...userData } = user[0];
        return res.json({
          token: accessToken,
          user: userData
        });
      }

      return res.json({ error: "Wrong password!" });
    } catch (error) {
      console.log(error);
      res.json({ error: error.message });
    }
  },
  checkUsername: async (req, res) => {
    try {
      const { username } = req.body;

      // Check if the username is already taken
      const checkUsernameQuery = "SELECT * FROM users WHERE username = ?";

      const [results] = await req.mysql.query(checkUsernameQuery, [username]);

      const isUsernameTaken = results.length > 0;
      res.json({ isTaken: isUsernameTaken });
    } catch (error) {
      console.error("Error checking username:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
  updateUser: async (req, res) => {
    try {
      const { username } = req.params;
      const {
        firstName,
        lastName,
        mobile,
        district_id,
        taluka_id,
        village_id,
        image,
      } = req.body;
      const checkUserQuery = "SELECT * FROM users WHERE username = ?";
      const [user] = await req.mysql.query(checkUserQuery, [username]);
      if (user.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      const updateQuery = `
        UPDATE users
        SET firstName = ?, lastName = ?, mobile = ?,
        district_id = ?, taluka_id = ?, village_id = ?, image = ?
        WHERE username = ?
      `;
      const params = [
        firstName,
        lastName,
        mobile,
        district_id,
        taluka_id,
        village_id,
        image,
        username,
      ];

      const [updateResult] = await req.mysql.query(updateQuery, params);

      if (updateResult.affectedRows > 0) {
        const updatedUser = { ...user[0], ...updateResult };
        const { password, ...userWithoutPassword } = updatedUser;

        return res.status(200).json({
          success: true,
          message: "User updated successfully",
          user: userWithoutPassword,
        });
      } else {
        return res.json({ error: "Error updating user" });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
  checkEmail: async (req, res) => {
    try {
      const { email } = req.body;
      const checkEmailQuery = "SELECT * FROM users WHERE email = ?";
      const [results] = await pool.query(checkEmailQuery, [email]);
      const isEmailTaken = results.length > 0;
      res.json({ isTaken: isEmailTaken });
    } catch (error) {
      console.error("Error checking email:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
};

module.exports = authController;
