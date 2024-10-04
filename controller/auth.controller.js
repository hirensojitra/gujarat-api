const pool = require("../database/index");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


const authController = {
  // Register a new user
  register: async (req, res) => {
    try {
      const { email, password, username, roles, emailVerified } = req.body;

      // Trim and sanitize input
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const trimmedUsername = username.trim();
      const userRoles = Array.isArray(roles) ? roles.map(role => role.trim()).join(', ') : '';
      const emailIsVerified = emailVerified !== undefined ? emailVerified : false;

      // Check if email or username already exists
      const userQuery = `SELECT * FROM users WHERE email = $1 OR username = $2`;
      const userResult = await pool.query(userQuery, [trimmedEmail, trimmedUsername]);
      const existingUser = userResult.rows[0];

      if (existingUser) {
        return res.json({ error: "Email or username already exists!" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

      // Insert new user into database
      const insertUserQuery = `INSERT INTO users (email, password, username, roles, emailVerified) VALUES ($1, $2, $3, $4, $5)`;
      const insertUserResult = await pool.query(insertUserQuery, [trimmedEmail, hashedPassword, trimmedUsername, userRoles, emailIsVerified]);

      if (insertUserResult.rowCount > 0) {
        return res.json({ success: true, user: { email: trimmedEmail, username: trimmedUsername } });
      } else {
        return res.json({ error: "Error during registration" });
      }
    } catch (error) {
      console.error(error);
      res.json({ error: error.message });
    }
  },

  // Login user and return JWT token
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      const userQuery = `SELECT * FROM users WHERE username = $1`;
      const userResult = await pool.query(userQuery, [username]);
      const user = userResult.rows[0];

      if (!user) {
        return res.json({ error: "Invalid username!" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        const accessToken = jwt.sign(
          { userid: user.id },
          process.env.JWT_SECRET || "3812932sjad43&*@", // Use environment variable for secret
          { expiresIn: "1y" }
        );

        const userData = { ...user, password: undefined };
        return res.json({ token: accessToken, user: userData });
      } else {
        return res.json({ error: "Wrong password!" });
      }
    } catch (error) {
      console.error(error);
      res.json({ error: error.message });
    }
  },

  // Check if username is available
  checkUsername: async (req, res) => {
    try {
      const { username } = req.body;
      const checkUsernameQuery = "SELECT * FROM users WHERE username = $1";

      const results = await pool.query(checkUsernameQuery, [username]);
      const isUsernameTaken = results.rows.length > 0;

      res.json({ isTaken: isUsernameTaken });
    } catch (error) {
      console.error("Error checking username:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  },

  // Check if email is available
  checkEmail: async (req, res) => {
    try {
      const { email } = req.body;
      const checkEmailQuery = "SELECT * FROM users WHERE email = $1";

      const results = await pool.query(checkEmailQuery, [email]);
      const isEmailTaken = results.rows.length > 0;

      res.json({ isTaken: isEmailTaken });
    } catch (error) {
      console.error("Error checking email:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  },

  // Update user details (requires authentication)
  updateUser: async (req, res) => {
    try {
      const { userid } = req.params;  // This is coming from the URL as a string
      const { firstname, lastname, mobile, district_id, taluka_id, village_id, image } = req.body;
  
      // Convert `req.params.userid` to a number for comparison (if needed)
      const parsedUserId = parseInt(userid, 10);  // Convert `userid` to number if it's a string      
      // Ensure authenticated user is updating their own details
      if (req.user.userid !== parsedUserId) {  // Compare parsed `userid`
        return res.status(403).json({ error: "Unauthorized to update this user" });
      }
  
      const checkUserQuery = "SELECT * FROM users WHERE id = $1"; // Use 'id' here
      const userResult = await pool.query(checkUserQuery, [parsedUserId]); // Pass parsedUserId correctly
      const user = userResult.rows[0];
  
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      // Dynamically build update query
      const updateFields = [];
      const params = [];
  
      if (firstname) {
        updateFields.push("firstname = $" + (params.length + 1));
        params.push(firstname);
      }
  
      if (lastname) {
        updateFields.push("lastname = $" + (params.length + 1));
        params.push(lastname);
      }
  
      if (mobile) {
        updateFields.push("mobile = $" + (params.length + 1));
        params.push(mobile);
      }
  
      if (district_id) {
        updateFields.push("district_id = $" + (params.length + 1));
        params.push(district_id);
      }
  
      if (taluka_id) {
        updateFields.push("taluka_id = $" + (params.length + 1));
        params.push(taluka_id);
      }
  
      if (village_id) {
        updateFields.push("village_id = $" + (params.length + 1));
        params.push(village_id);
      }
  
      if (image) {
        let img = image === "delete" ? null : image;
        updateFields.push("image = $" + (params.length + 1));
        params.push(img);
      }
  
      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }
  
      params.push(parsedUserId);  // Push the parsed user ID
  
      const updateQuery = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $${params.length}`; // Use 'id' here
      const updateResult = await pool.query(updateQuery, params);
  
      if (updateResult.rowCount > 0) {
        const updatedUserResult = await pool.query(checkUserQuery, [parsedUserId]);
        const updatedUser = updatedUserResult.rows[0];
        const { password, ...userWithoutPassword } = updatedUser;
  
        return res.status(200).json({
          success: true,
          message: "User updated successfully",
          user: userWithoutPassword,
        });
      } else {
        return res.status(500).json({ error: "Error updating user" });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }
  

};

module.exports = authController;
