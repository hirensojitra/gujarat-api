const pool = require("../database/index");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require('path');
const uploadDir = path.join(__dirname, '..', 'uploads', 'profile-image');
const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can use any service
  auth: {
    user: process.env.EMAIL_USER, // Set these in your environment variables
    pass: process.env.EMAIL_PASSWORD,
  },
});
const authController = {
  // Register a new user
  register: async (req, res) => {
    try {
      const { email, password, username, roles } = req.body;

      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const trimmedUsername = username.trim();
      const userRoles = Array.isArray(roles) ? roles.map(role => role.trim()).join(', ') : '';

      // Check if email or username already exists
      const userQuery = `SELECT * FROM users WHERE email = $1 OR username = $2`;
      const userResult = await pool.query(userQuery, [trimmedEmail, trimmedUsername]);
      const existingUser = userResult.rows[0];

      if (existingUser) {
        return res.json({ error: "Email or username already exists!" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiration = new Date(Date.now() + 3600000); // 1 hour from now

      // Insert new user into database
      const insertUserQuery = `
        INSERT INTO users (email, password, username, roles, emailVerified, verificationToken, tokenExpiration)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      const insertUserResult = await pool.query(insertUserQuery, [
        trimmedEmail,
        hashedPassword,
        trimmedUsername,
        userRoles,
        false, // emailVerified
        verificationToken,
        tokenExpiration
      ]);

      if (insertUserResult.rowCount > 0) {
        const verificationLink = `https\://${req.headers.origin}/verify-email?token=${encodeURIComponent(verificationToken)}&email=${encodeURIComponent(trimmedEmail)}`;
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: trimmedEmail,
          subject: 'Email Verification',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <h2 style="text-align: center; color: #333;">Welcome to Our App!</h2>
              <p style="font-size: 16px; color: #333;">Hi <strong>${trimmedUsername}</strong>,</p>
              <p style="font-size: 16px; color: #333;">Thank you for registering! Please verify your email address by clicking the button below.</p>
              <p style="text-align: center;">
                <a href="${verificationLink}" 
                   style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
                   Verify Email
                </a>
              </p>
              <p style="font-size: 14px; color: #666; text-align: center;">Or copy and paste the following link into your browser:</p>
              <p style="font-size: 14px; color: #666; word-break: break-all; text-align: center;">
                <a href="${verificationLink}" style="color: #28a745;">${verificationLink}</a>
              </p>
              <hr style="border: 0; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999; text-align: center;">If you did not register for this account, please ignore this email.</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);

        return res.json({
          success: true,
          message: 'Registration successful! A verification email has been sent.',
          user: { email: trimmedEmail, username: trimmedUsername }
        });
      } else {
        return res.json({ error: "Error during registration" });
      }
    } catch (error) {
      console.error(error);
      res.json({ error: error.message });
    }
  }
  ,

  // Verify email
  verifyEmail: async (req, res) => {
    try {
      const { token, email } = req.query;

      // Fetch user based on the email and verification token
      const user = await pool.query('SELECT * FROM users WHERE email = $1 AND verificationToken = $2', [email, token]);

      if (!user.rows.length) {
        return res.status(400).json({ error: 'Invalid or expired verification link!' });
      }

      const foundUser = user.rows[0];
      if (foundUser.emailverified) {
        return res.json({ success: true, message: 'Email successfully verified already!' });
      }
      // Check if token is expired
      const currentTime = new Date();
      if (foundUser.tokenExpiration < currentTime) {
        return res.status(400).json({ error: 'Token has expired!' });
      }

      // Mark the email as verified
      await pool.query('UPDATE users SET emailVerified = true WHERE email = $1', [email]);

      return res.json({ success: true, message: 'Email successfully verified!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Resend verification email
  resendVerification: async (req, res) => {
    const { email } = req.body;

    try {
      // Query to fetch user details including username
      const userQuery = `SELECT email, username, emailVerified FROM users WHERE email = $1`;
      const userResult = await pool.query(userQuery, [email]);
      const user = userResult.rows[0];

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified." });
      }

      // Generate new verification token and expiration
      const newToken = crypto.randomBytes(32).toString('hex');
      const newTokenExpiration = new Date(Date.now() + 3600000); // 1 hour from now

      // Update the user's token and expiration in the database
      const updateQuery = `UPDATE users SET verificationToken = $1, tokenExpiration = $2 WHERE email = $3`;
      await pool.query(updateQuery, [newToken, newTokenExpiration, email]);

      // Construct verification link using the correct token and email
      const verificationLink = `${req.headers.origin}/verify-email?token=${encodeURIComponent(newToken)}&email=${encodeURIComponent(email)}`;

      // Use the fetched username for the email template
      const trimmedUsername = user.username;  // Assuming the username is in the database

      // Prepare the email content
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Resend Email Verification',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <h2 style="text-align: center; color: #333;">Welcome to Our App!</h2>
              <p style="font-size: 16px; color: #333;">Hi <strong>${trimmedUsername}</strong>,</p>
              <p style="font-size: 16px; color: #333;">Thank you for registering! Please verify your email address by clicking the button below.</p>
              <p style="text-align: center;">
                <a href="${verificationLink}" 
                   style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
                   Verify Email
                </a>
              </p>
              <p style="font-size: 14px; color: #666; text-align: center;">Or copy and paste the following link into your browser:</p>
              <p style="font-size: 14px; color: #666; word-break: break-all; text-align: center;">
                <a href="${verificationLink}" style="color: #28a745;">${verificationLink}</a>
              </p>
              <hr style="border: 0; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999; text-align: center;">If you did not register for this account, please ignore this email.</p>
            </div>`
      };

      // Send the email
      await transporter.sendMail(mailOptions);

      return res.json({ success: true, message: "Verification email re-sent." });
    } catch (error) {
      console.error("Error re-sending verification email:", error);
      res.status(500).json({ error: "Error re-sending verification email." });
    }
  }

  ,

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
        const userData = {
          ...user,
          password: undefined, // Remove password
          token: accessToken // Include the token in the userData object
        };
        return res.status(200).json(userData);
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
