const pool = require("../database/index");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require('path');
const uploadDir = path.join(__dirname, '..', 'uploads', 'profile-image');
const fs = require('fs');
const sharp = require('sharp');
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
      const { userid } = req.params;
      const { firstname, lastname, mobile, district_id, taluka_id, village_id } = req.body;
      const image = req.file;  // Multer handles file uploads in buffer format
      const parsedUserId = parseInt(userid, 10);  // Convert userID from string to integer

      if (req.user.userid !== parsedUserId) {
        return res.status(403).json({ error: "Unauthorized to update this user" });
      }

      // Fetch the user from the database to verify existence
      const checkUserQuery = "SELECT * FROM users WHERE id = $1";
      const userResult = await pool.query(checkUserQuery, [parsedUserId]);
      const user = userResult.rows[0];

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Initialize array for dynamic update query
      const updateFields = [];
      const params = [];

      // Update fields if provided
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

      // Ensure district_id, taluka_id, and village_id are integers
      if (district_id) {
        updateFields.push("district_id = $" + (params.length + 1));
        params.push(parseInt(district_id, 10));  // Convert district_id to integer
      }

      if (taluka_id) {
        updateFields.push("taluka_id = $" + (params.length + 1));
        params.push(parseInt(taluka_id, 10));  // Convert taluka_id to integer
      }

      if (village_id) {
        updateFields.push("village_id = $" + (params.length + 1));
        params.push(parseInt(village_id, 10));  // Convert village_id to integer
      }

      // Ensure upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });  // Create directory if it doesn't exist
      }

      // Image upload and replacement logic
      if (image) {
        const newImageName = `${user.username}${path.extname(image.originalname)}`;  // Set new image name
        const newImagePath = path.join(uploadDir, newImageName);  // Full path for the new image

        // Remove existing image(s) with the same username if they exist
        const files = fs.readdirSync(uploadDir);
        files.forEach((file) => {
          if (file.startsWith(user.username)) {
            fs.unlinkSync(path.join(uploadDir, file));  // Delete old image
          }
        });

        // Write the buffer to a file (since Multer provided the image in buffer form)
        fs.writeFileSync(newImagePath, image.buffer);  // Write buffer to the new image file

        // Update the image field in the database
        updateFields.push("image = $" + (params.length + 1));
        params.push(newImageName);
      }

      // If no fields are provided to update, return an error
      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }
      params.push(parsedUserId);
      const updateQuery = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $${params.length}`;
      const updateResult = await pool.query(updateQuery, params);

      if (updateResult.rowCount > 0) {
        const updatedUserResult = await pool.query(checkUserQuery, [parsedUserId]);
        const updatedUser = updatedUserResult.rows[0];
        const { password, ...userWithoutPassword } = updatedUser;  // Exclude password

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
  },
  getProfileImage: async (req, res) => {

    const { username } = req.params;
    const { quality, format, thumb } = req.query;
    try {
      // Fetch user profile data from the database to get image URL
      const userResult = await pool.query('SELECT image FROM users WHERE username = $1', [username]);

      // Check if the user exists
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Extract the image name from the user's profile data
      const imageName = userResult.rows[0].image;
      const imagePath = path.join(__dirname, `../uploads/profile-image/${imageName}`);

      // Check if the file exists in the filesystem
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ error: 'Profile image not found on the filesystem' });
      }

      // Process the image using sharp
      let image = sharp(imagePath);

      // Handle quality query parameter
      if (quality) {
        const parsedQuality = parseInt(quality);
        if (!isNaN(parsedQuality)) {
          image = image.jpeg({ quality: parsedQuality }); // Apply quality setting
        }
      }

      // Handle format query parameter (defaults to jpeg if no format is provided)
      if (format) {
        switch (format.toLowerCase()) {
          case 'png':
            image = image.png();
            break;
          case 'webp':
            image = image.webp();
            break;
          case 'jpeg':
          case 'jpg':
            image = image.jpeg();
            break;
          case 'gif':
            image = image.gif();
            break;
          case 'tiff':
          case 'tif':
            image = image.tiff();
            break;
          case 'bmp':
            image = image.bmp();
            break;
          default:
            image = image.jpeg();
        }
      }

      // Handle thumbnail request (resize for thumbnail)
      if (thumb) {
        image = image.resize(100); // Resize to 100px for thumbnail
      }

      // Set the appropriate content type based on format or fallback to 'image/jpeg'
      const contentType = format === 'png' ? 'image/png' : 'image/jpeg';
      res.set('Content-Type', contentType);

      // Stream the processed image back to the client
      image.pipe(res);

    } catch (error) {
      console.error('Error fetching profile image:', error);
      res.status(500).json({ error: 'Error fetching profile image' });
    }
  }
}

module.exports = authController;
