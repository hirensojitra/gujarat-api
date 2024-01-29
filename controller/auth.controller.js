const pool = require("../database/index");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const authController = {
  register: async (req, res) => {
    try {
      const { email, password, username } = req.body;

      const userQuery = `
            SELECT * FROM users WHERE email = $1 OR username = $2
        `;
      const userResult = await pool.query(userQuery, [email, username]);
      const existingUser = userResult.rows[0];

      if (existingUser) {
        return res.json({ error: "Email or username already exists!" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const insertUserQuery = `
            INSERT INTO users (email, password, username) VALUES ($1, $2, $3)
        `;
      const insertUserResult = await pool.query(insertUserQuery, [email, hashedPassword, username]);

      if (insertUserResult.rowCount > 0) {
        return res.json({ success: true, user: { email, username } });
      } else {
        return res.json({ error: "Error" });
      }
    } catch (error) {
      console.error(error);
      res.json({ error: error.message });
    }
  },

  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      const userQuery = `
            SELECT * FROM users WHERE username = $1
        `;
      const userResult = await pool.query(userQuery, [username]);
      const user = userResult.rows[0];

      if (!user) {
        return res.json({ error: "Invalid username!" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        const accessToken = jwt.sign(
          { userId: user.id },
          "3812932sjad34&*@",
          {
            expiresIn: "1h",
          }
        );

        const userData = { ...user, password: undefined };

        return res.json({
          token: accessToken,
          user: userData,
        });
      }

      return res.json({ error: "Wrong password!" });
    } catch (error) {
      console.error(error);
      res.json({ error: error.message });
    }
  }
  ,
  checkUsername: async (req, res) => {
    try {
      const { username } = req.body;

      // Check if the username is already taken
      const checkUsernameQuery = "SELECT * FROM users WHERE username = $1";

      const results = await pool.query(checkUsernameQuery, [username]);
      const isUsernameTaken = results.rows.length > 0;

      res.json({ isTaken: isUsernameTaken });
    } catch (error) {
      console.error("Error checking username:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }
  ,
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

      const checkUserQuery = "SELECT * FROM users WHERE username = $1";
      const userResult = await pool.query(checkUserQuery, [username]);
      const user = userResult.rows[0];

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const updateFields = [];
      const params = [];

      if (firstName) {
        updateFields.push("firstName = $1");
        params.push(firstName);
      }

      if (lastName) {
        updateFields.push("lastName = $2");
        params.push(lastName);
      }

      if (mobile) {
        updateFields.push("mobile = $3");
        params.push(mobile);
      }

      if (district_id) {
        updateFields.push("district_id = $4");
        params.push(district_id);
      }

      if (taluka_id) {
        updateFields.push("taluka_id = $5");
        params.push(taluka_id);
      }

      if (village_id) {
        updateFields.push("village_id = $6");
        params.push(village_id);
      }

      if (image) {
        let img = image;
        if (image === "delete") {
          img = null;
        }
        updateFields.push("image = $7");
        params.push(img);
      }

      // Check if any fields were provided
      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      params.push(username);

      const updateQuery = `
            UPDATE users
            SET ${updateFields.join(", ")}
            WHERE username = $${params.length}
        `;

      const updateResult = await pool.query(updateQuery, params);

      if (updateResult.rowCount > 0) {
        const updatedUserResult = await pool.query(checkUserQuery, [username]);
        const updatedUser = updatedUserResult.rows[0];
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
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }
  ,
  checkEmail: async (req, res) => {
    try {
      const { email } = req.body;

      // Check if the email is already taken
      const checkEmailQuery = "SELECT * FROM users WHERE email = $1";

      const results = await pool.query(checkEmailQuery, [email]);
      const isEmailTaken = results.rows.length > 0;

      res.json({ isTaken: isEmailTaken });
    } catch (error) {
      console.error("Error checking email:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }

};

module.exports = authController;
