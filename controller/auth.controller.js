const { OAuth2Client } = require("google-auth-library");
const pool = require("../database/index");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const uploadDir = path.join(__dirname, "..", "uploads", "profile-image");
const fs = require("fs");
const sharp = require("sharp");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { createCanvas } = require("canvas");
const moment = require("moment");
const client = new OAuth2Client(
  "650577899089-eq5q93v869b5qvi6vllcq81o8v06ubsm.apps.googleusercontent.com"
);
const profileDir = path.join(__dirname, "../uploads/profile");
const generateUniqueId = async () => {
  // Generate a random 16-character alphanumeric string in lowercase
  const newId = crypto.randomBytes(8).toString("hex"); // 16 chars (8 bytes)

  // Check if this ID already exists in the database
  const idCheckQuery = `SELECT id FROM users WHERE id = $1`;
  const idCheckResult = await pool.query(idCheckQuery, [newId]);

  if (idCheckResult.rows.length > 0) {
    // If the ID is a duplicate, recursively call the function to generate a new one
    return generateUniqueId();
  }

  // If the ID is unique, return it
  return newId;
};
// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail", // You can use any service
  auth: {
    user: process.env.EMAIL_USER, // Set these in your environment variables
    pass: process.env.EMAIL_PASSWORD,
  },
});
const capitalize = (str) =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
const authController = {
  register: async (req, res) => {
    try {
      const { email, password, username, roles } = req.body;
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const trimmedUsername = username.trim().toLowerCase();
      const userRoles = Array.isArray(roles)
        ? roles.map((role) => role.trim()).join(", ")
        : "";

      // Check if email or username already exists
      const userQuery = `SELECT * FROM users WHERE email = $1 OR username = $2`;
      const userResult = await pool.query(userQuery, [
        trimmedEmail,
        trimmedUsername,
      ]);
      const existingUser = userResult.rows[0];

      if (existingUser) {
        return res.json({ error: "Email or username already exists!" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

      // Generate unique ID
      const uniqueId = await generateUniqueId();

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiration = new Date(Date.now() + 3600000); // 1 hour from now
      const createdAt = new Date();
      const insertUserQuery = `
        INSERT INTO users (id, email, password, username, roles, emailVerified, verificationToken, tokenExpiration, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      const insertUserResult = await pool.query(insertUserQuery, [
        uniqueId,
        trimmedEmail,
        hashedPassword,
        trimmedUsername,
        "user",
        false, // emailVerified
        verificationToken,
        tokenExpiration,
        createdAt,
      ]);

      if (insertUserResult.rowCount > 0) {
        // Generate the token
        const verificationToken = crypto.randomBytes(32).toString("hex");
        // Hash the token before saving it to the database
        const hashedToken = crypto
          .createHash("sha256")
          .update(verificationToken)
          .digest("hex");
        // Save the hashed token and the expiration time in the database
        const tokenExpiration = new Date();
        tokenExpiration.setHours(tokenExpiration.getHours() + 1); // Token expires in 1 hour
        await pool.query(
          "UPDATE users SET verificationToken = $1, tokenExpiration = $2 WHERE email = $3",
          [hashedToken, tokenExpiration, trimmedEmail]
        );
        // Generate the verification link with the unhashed token
        const verificationLink = `${
          req.headers.origin
        }/verify-email?token=${encodeURIComponent(
          verificationToken
        )}&email=${encodeURIComponent(trimmedEmail)}`;
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: trimmedEmail,
          subject: "Email Verification",
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
            `,
        };

        await transporter.sendMail(mailOptions);

        return res.json({
          success: true,
          message:
            "Registration successful! A verification email has been sent.",
          user: {
            id: uniqueId,
            email: trimmedEmail,
            username: trimmedUsername,
          },
        });
      } else {
        return res.json({ error: "Error during registration" });
      }
    } catch (error) {
      console.error(error);
      res.json({ error: error.message });
    }
  },
  // Verify email
  verifyEmail: async (req, res) => {
    try {
      const { token, email } = req.query;

      // Hash the token from the query parameters
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      // Fetch user based on the email and hashed token
      const userQuery = await pool.query(
        "SELECT * FROM users WHERE email = $1 AND verificationToken = $2",
        [email, hashedToken]
      );

      if (!userQuery.rows.length) {
        return res
          .status(400)
          .json({ error: "Invalid or expired verification link!" });
      }

      const foundUser = userQuery.rows[0];
      if (foundUser.emailverified) {
        return res.json({ success: true, message: "Email already verified!" });
      }

      // Check if token is expired
      const currentTime = new Date();
      if (foundUser.tokenExpiration < currentTime) {
        return res.status(400).json({ error: "Token has expired!" });
      }

      // Mark the email as verified and remove the token
      await pool.query(
        "UPDATE users SET emailVerified = true, verificationToken = NULL, tokenExpiration = NULL WHERE email = $1",
        [email]
      );

      return res.json({
        success: true,
        message: "Email successfully verified!",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  // Resend verification email
  resendVerification: async (req, res) => {
    const { email } = req.body;

    try {
      // Query to fetch user details including username and email verification status
      const userQuery = `SELECT email, username, emailVerified FROM users WHERE email = $1`;
      const userResult = await pool.query(userQuery, [email]);
      const user = userResult.rows[0];

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.emailverified) {
        return res.status(400).json({ error: "Email is already verified." });
      }

      // Generate new verification token and hash it
      const newToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(newToken)
        .digest("hex");

      // Set token expiration time to 10 minutes (600000 ms)
      const newTokenExpiration = new Date(Date.now() + 600000); // 10 minutes from now

      // Update the user's hashed token and expiration in the database
      const updateQuery = `UPDATE users SET verificationToken = $1, tokenExpiration = $2 WHERE email = $3`;
      await pool.query(updateQuery, [hashedToken, newTokenExpiration, email]);

      // Construct verification link using the unhashed token and email
      const verificationLink = `${
        req.headers.origin
      }/verify-email?token=${encodeURIComponent(
        newToken
      )}&email=${encodeURIComponent(email)}`;

      // Use the fetched username for the email template
      const trimmedUsername = user.username;

      // Prepare the email content
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Resend Email Verification",
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
              </div>`,
      };

      // Send the email
      await transporter.sendMail(mailOptions);

      return res.json({
        success: true,
        message: "Verification email re-sent.",
      });
    } catch (error) {
      console.error("Error re-sending verification email:", error);
      res.status(500).json({ error: "Error re-sending verification email." });
    }
  },
  // Login user and return JWT token
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      const userQuery = `SELECT * FROM users WHERE username = $1`;
      const userResult = await pool.query(userQuery, [username.toLowerCase()]);
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

        // Create a new userData object, excluding sensitive fields
        const {
          password,
          verificationtoken,
          tokenexpiration,
          resettoken,
          resettokenexpiration,
          ...userData
        } = user;

        userData.token = accessToken; // Include the token in the userData object

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

      const results = await pool.query(checkUsernameQuery, [
        username.toLowerCase(),
      ]);
      const isUsernameTaken = results.rows.length > 0;

      res.json({ isTaken: isUsernameTaken });
    } catch (error) {
      console.error("Error checking username:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
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
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
  // Update user details (requires authentication)
  updateUser: async (req, res) => {
    try {
      const { userid } = req.params;
      const {
        firstname,
        lastname,
        mobile,
        district_id,
        taluka_id,
        village_id,
        roles,
        username,
      } = req.body;
      const image = req.file; // Multer handles file uploads in buffer format
      const capitalizedFirstname = firstname
        ? capitalize(firstname.trim())
        : null;
      const capitalizedLastname = lastname ? capitalize(lastname.trim()) : null;
      // Fetch the user making the request
      const { userid: requestingUserId } = req.user;

      // Fetch the roles of the user making the request
      const requestingUserQuery = "SELECT roles FROM users WHERE id = $1";
      const requestingUserResult = await pool.query(requestingUserQuery, [
        requestingUserId,
      ]);
      const requestingUser = requestingUserResult.rows[0];

      if (!requestingUser) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const requestingRolesArray = requestingUser.roles
        .split(",")
        .map((role) => role.trim());

      // Fetch the target user to be updated
      const targetUserQuery = "SELECT * FROM users WHERE id = $1";
      const targetUserResult = await pool.query(targetUserQuery, [userid]);
      const targetUser = targetUserResult.rows[0];

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Initialize array for dynamic update query
      const updateFields = [];
      const params = [];

      // Update fields if provided (all users can update their own profile data except roles)
      if (capitalizedFirstname) {
        updateFields.push("firstname = $" + (params.length + 1));
        params.push(capitalizedFirstname);
      }

      if (capitalizedLastname) {
        updateFields.push("lastname = $" + (params.length + 1));
        params.push(capitalizedLastname);
      }

      if (mobile) {
        updateFields.push("mobile = $" + (params.length + 1));
        params.push(mobile);
      }

      if (district_id !== undefined) {
        updateFields.push("district_id = $" + (params.length + 1));
        params.push(district_id ? parseInt(district_id, 10) : district_id);
      }

      if (taluka_id !== undefined) {
        updateFields.push("taluka_id = $" + (params.length + 1));
        params.push(taluka_id ? parseInt(taluka_id, 10) : taluka_id);
      }

      if (village_id !== undefined) {
        updateFields.push("village_id = $" + (params.length + 1));
        params.push(village_id ? parseInt(village_id, 10) : village_id);
      }

      // Ensure only "master" and "admin" can change roles
      if (roles) {
        if (
          requestingRolesArray.includes("master") ||
          requestingRolesArray.includes("admin")
        ) {
          updateFields.push("roles = $" + (params.length + 1));
          params.push(
            roles
              .split(",")
              .map((role) => role.trim())
              .join(", ")
          );
        } else {
          // If the user doesn't have "master" or "admin" privileges and tries to change roles
          return res
            .status(403)
            .json({ error: "You are not allowed to change roles" });
        }
      }
      if (username) {
        updateFields.push("username = $" + (params.length + 1));
        params.push(username.toLowerCase()); // Save username in lowercase
      }
      // Ensure upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Image upload and replacement logic
      if (image) {
        const newImageName = `${targetUser.username}${path.extname(
          image.originalname
        )}`;
        const newImagePath = path.join(uploadDir, newImageName);

        // Remove existing image(s) with the same username if they exist
        const files = fs.readdirSync(uploadDir);
        files.forEach((file) => {
          if (file.startsWith(targetUser.username)) {
            fs.unlinkSync(path.join(uploadDir, file));
          }
        });

        // Write the buffer to a file (since Multer provided the image in buffer form)
        fs.writeFileSync(newImagePath, image.buffer);

        // Update the image field in the database
        updateFields.push("image = $" + (params.length + 1));
        params.push(newImageName);
      }

      // If no fields are provided to update, return an error
      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      params.push(userid);
      const updateQuery = `UPDATE users SET ${updateFields.join(
        ", "
      )} WHERE id = $${params.length}`;
      const updateResult = await pool.query(updateQuery, params);

      if (updateResult.rowCount > 0) {
        const updatedUserResult = await pool.query(targetUserQuery, [userid]);
        const updatedUser = updatedUserResult.rows[0];
        const { password, ...userWithoutPassword } = updatedUser; // Exclude password

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
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
  // Use canvas to generate images with initials
  getProfileImage: async (req, res) => {
    const { username } = req.params;
    const { quality, format, thumb } = req.query;

    try {
      // Fetch user profile data (image, first name, last name) from the database
      const userResult = await pool.query(
        "SELECT image, firstname, lastname FROM users WHERE username = $1",
        [username]
      );

      // Check if the user exists
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Extract image name, first name, and last name from the user's profile data
      const { image: imageName, firstname, lastname } = userResult.rows[0];
      const imagePath = path.join(
        __dirname,
        `../uploads/profile-image/${imageName}`
      );

      // Check if the profile image file exists
      if (imageName && fs.existsSync(imagePath)) {
        // If the image exists, process it using sharp
        let image = sharp(imagePath);

        // Handle quality query parameter
        if (quality) {
          const parsedQuality = parseInt(quality);
          if (!isNaN(parsedQuality)) {
            image = image.jpeg({ quality: parsedQuality });
          }
        }

        // Handle format query parameter
        if (format) {
          switch (format.toLowerCase()) {
            case "png":
              image = image.png();
              break;
            case "webp":
              image = image.webp();
              break;
            case "jpeg":
            case "jpg":
              image = image.jpeg();
              break;
            case "gif":
              image = image.gif();
              break;
            case "tiff":
            case "tif":
              image = image.tiff();
              break;
            case "bmp":
              image = image.bmp();
              break;
            default:
              image = image.jpeg();
          }
        }
        if (thumb) {
          image = image.resize(100);
        }
        const contentType = format === "png" ? "image/png" : "image/jpeg";
        res.set("Content-Type", contentType);

        // Stream the processed image back to the client
        return image.pipe(res);
      }

      // If the profile image does not exist, generate an image with initials
      const initials =
        firstname && lastname
          ? `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase()
          : "User";

      // Create a placeholder image with initials using Canvas
      const canvas = createCanvas(200, 200);
      const ctx = canvas.getContext("2d");

      // Set background color
      ctx.fillStyle = "#cccccc"; // Light grey background
      ctx.fillRect(0, 0, 200, 200);

      // Set text style and color for initials
      ctx.fillStyle = "#000000"; // Black text
      ctx.font = "bold 50px Arial"; // 50% smaller font size (from 100px to 50px)
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials, 100, 100); // Draw initials in the center

      // Convert the canvas to a PNG buffer
      const buffer = canvas.toBuffer();

      // Set the content type for the placeholder image
      res.set("Content-Type", "image/png");

      // Send the placeholder image back as a response
      return res.send(buffer);
    } catch (error) {
      console.error("Error fetching profile image:", error);
      return res.status(500).json({ error: "Error fetching profile image" });
    }
  },
  getImage: async (req, res) => {
    const { id } = req.params;
    const { quality, format, thumb } = req.query;

    try {
      // Check if the user exists
      const result = await pool.query(
        "SELECT id FROM users_info WHERE id = $1",
        [id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Look for any image file that starts with the userId
      const files = fs.existsSync(profileDir) ? fs.readdirSync(profileDir) : [];
      const file = files.find((f) => f.startsWith(id));

      if (file) {
        const imagePath = path.join(profileDir, file);
        let image = sharp(imagePath);

        // Format conversion
        let contentType = "image/jpeg";
        if (format) {
          switch (format.toLowerCase()) {
            case "png":
              image = image.png();
              contentType = "image/png";
              break;
            case "webp":
              image = image.webp();
              contentType = "image/webp";
              break;
            case "gif":
              image = image.gif();
              contentType = "image/gif";
              break;
            case "bmp":
              image = image.bmp();
              contentType = "image/bmp";
              break;
            case "tiff":
            case "tif":
              image = image.tiff();
              contentType = "image/tiff";
              break;
            default:
              image = image.jpeg();
          }
        }

        // Resize thumbnail
        if (thumb) {
          image = image.resize(100);
        }

        // Quality control (for jpeg)
        if (quality) {
          const q = parseInt(quality);
          if (!isNaN(q)) image = image.jpeg({ quality: q });
        }

        res.set("Content-Type", contentType);
        return image.pipe(res);
      }

      // Fallback: Generate placeholder image with "User"
      const canvas = createCanvas(200, 200);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#cccccc"; // background
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = "#000000"; // text
      ctx.font = "bold 50px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("User", 100, 100);

      const buffer = canvas.toBuffer("image/png");
      res.set("Content-Type", "image/png");
      return res.send(buffer);
    } catch (error) {
      console.error("Error in getImage:", error);
      return res.status(500).json({ error: "Failed to load profile image" });
    }
  },

  // Get all users if the requesting user has the "admin" role, with pagination, search, and sorting
  getAllUsers: async (req, res) => {
    try {
      // Extract pagination, search, and sorting parameters from the query
      const {
        page = 1,
        limit = 10,
        search = "",
        sortBy = "created_at",
        order = "asc",
      } = req.query;

      // Fetch the user making the request
      const { userid } = req.user;

      // Query to fetch the roles of the requesting user
      const userQuery = "SELECT roles FROM users WHERE id = $1";
      const userResult = await pool.query(userQuery, [userid]);
      const user = userResult.rows[0];

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if the user has "Master" or "Admin" role
      const rolesArray = user.roles.split(",").map((role) => role.trim());
      if (!rolesArray.includes("master") && !rolesArray.includes("admin")) {
        return res
          .status(403)
          .json({ error: "Unauthorized! Master or Admin access required." });
      }

      // Pagination calculations
      const offset = (page - 1) * limit;

      // Search filter logic
      const searchQuery = `%${search.toLowerCase()}%`;

      // Ensure valid sort order (asc or desc)
      const validOrder = order.toLowerCase() === "desc" ? "DESC" : "ASC";

      // Whitelist of sortable columns to prevent SQL injection
      const validSortColumns = [
        "id",
        "email",
        "username",
        "roles",
        "emailVerified",
        "created_at",
      ];
      const sortColumn = validSortColumns.includes(sortBy)
        ? sortBy
        : "created_at";

      // Dynamic query to fetch users with pagination, search, and sorting
      const allUsersQuery = `
        SELECT id, email, username, roles, emailVerified, created_at, mobile,
               COALESCE(firstname, '') AS firstname, 
               COALESCE(lastname, '') AS lastname
        FROM users
        WHERE LOWER(username) LIKE $1 OR LOWER(email) LIKE $1
        ORDER BY ${sortColumn} ${validOrder}
        LIMIT $2 OFFSET $3
      `;

      const allUsersResult = await pool.query(allUsersQuery, [
        searchQuery,
        limit,
        offset,
      ]);

      // Query to get the total number of users for pagination purposes
      const countQuery = `
        SELECT COUNT(*) FROM users
        WHERE LOWER(username) LIKE $1 OR LOWER(email) LIKE $1
      `;
      const countResult = await pool.query(countQuery, [searchQuery]);
      const totalUsers = parseInt(countResult.rows[0].count, 10);

      // Process the result to add the "fullname" field
      const users = allUsersResult.rows.map((user) => {
        const { firstname, lastname } = user;
        let fullname = `${firstname} ${lastname}`.trim();
        if (!firstname && !lastname) {
          fullname = "GujaratUvach User";
        }
        return {
          ...user,
          fullname,
        };
      });

      return res.status(200).json({
        success: true,
        users,
        pagination: {
          currentPage: parseInt(page, 10),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
  requestPasswordReset: async (req, res) => {
    try {
      const { email } = req.body;
      const userQuery = `SELECT * FROM users WHERE email = $1`;
      const userResult = await pool.query(userQuery, [email.trim()]);
      const user = userResult.rows[0];
      if (!user) {
        return res
          .status(404)
          .json({ error: "User with this email does not exist." });
      }

      // Generate a reset token and expiration date (valid for 10 minutes)
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
      const tokenExpiration = new Date(Date.now() + 10 * 60 * 1000); // Token expires in 10 minutes

      // Update the user with the reset token and expiration
      await pool.query(
        "UPDATE users SET resettoken = $1, resettokenexpiration = $2 WHERE email = $3",
        [hashedToken, tokenExpiration, email]
      );
      // Generate reset link
      const resetLink = `${
        req.headers.origin
      }/auth/reset-password?token=${encodeURIComponent(
        resetToken
      )}&email=${encodeURIComponent(email)}`;

      // Send email with reset link
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset Request",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="text-align: center; color: #333;">Password Reset Request</h2>
          <p style="font-size: 16px; color: #333;">Hi <strong>${user.username}</strong>,</p>
          <p style="font-size: 16px; color: #333;">
            We received a request to reset your password. Click the button below to reset it. This link will expire in 10 minutes.
          </p>
          <p style="text-align: center;">
            <a href="${resetLink}" 
              style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">Reset Password
            </a>
          </p>
          <p style="font-size: 14px; color: #666; text-align: center;">Or copy and paste the following link into your browser:</p>
          <p style="font-size: 14px; color: #666; word-break: break-all; text-align: center;">
            <a href="${resetLink}" style="color: #28a745;">${resetLink}</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #999; text-align: center;">If you did not request a password reset, please ignore this email.</p>
      </div>
      `,
      };

      await transporter.sendMail(mailOptions);

      res.json({
        success: true,
        message: "Password reset email sent successfully.",
      });
    } catch (error) {
      console.error("Error during password reset request:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  },
  resetPassword: async (req, res) => {
    const { token, email, password } = req.body;
    try {
      // Check if the token and email match in the database
      const tokenCheckQuery =
        "SELECT resettoken, resettokenexpiration FROM users WHERE email = $1";
      const tokenCheckResult = await pool.query(tokenCheckQuery, [email]);

      if (tokenCheckResult.rows.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid email or token" });
      }

      const user = tokenCheckResult.rows[0];

      // Hash the incoming token to match the stored hashed token
      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      // Check if the reset token matches
      if (user.resettoken !== hashedToken) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired reset token" });
      }

      // Check if the token has expired
      const now = new Date();
      if (now > user.resettokenexpiration) {
        return res
          .status(400)
          .json({ success: false, message: "Reset token has expired" });
      }

      // Hash the new password and update it
      const hashedPassword = await bcrypt.hash(password, 10);
      const updateQuery =
        "UPDATE users SET password = $1, resettoken = NULL, resettokenexpiration = NULL WHERE email = $2 AND resettoken = $3";
      const values = [hashedPassword, email, hashedToken];

      await pool.query(updateQuery, values);

      return res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      return res
        .status(500)
        .json({ success: false, message: "Error resetting password" });
    }
  },
  validateResetToken: async (req, res) => {
    const { token, email } = req.body;

    if (!token || !email) {
      return res
        .status(400)
        .json({ success: false, message: "Token and email are required" });
    }

    try {
      // Call the PostgreSQL function to validate the token
      const result = await pool.query(
        "SELECT * FROM validate_reset_token($1, $2)",
        [token, email]
      );

      const { success, message } = result.rows[0];

      if (success) {
        return res.json({ success: true, message });
      } else {
        return res.status(400).json({ success: false, message });
      }
    } catch (error) {
      console.error("Error validating reset token:", error);
      return res
        .status(500)
        .json({ success: false, message: "Error validating token" });
    }
  },
  googleAuth: async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ error: "No token provided" });
      }

      // Verify the Google token
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience:
          "650577899089-eq5q93v869b5qvi6vllcq81o8v06ubsm.apps.googleusercontent.com",
      });

      const payload = ticket.getPayload(); // Extract user info

      if (!payload.email_verified) {
        return res.status(400).json({ error: "Email not verified by Google" });
      }

      // Check if user already exists in the database
      let userResult = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [payload.email]
      );
      let user;

      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
      } else {
        // Create new user
        const insertQuery = `
          INSERT INTO users (email, username, google_id, profile_image, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          RETURNING *;
        `;
        const values = [
          payload.email,
          payload.name,
          payload.sub,
          payload.picture,
        ];
        const insertResult = await pool.query(insertQuery, values);
        user = insertResult.rows[0];
      }

      // Generate a JWT token similar to the login endpoint
      const accessToken = jwt.sign(
        { userid: user.id },
        process.env.JWT_SECRET || "3812932sjad43&*@", // Use environment variable for secret
        { expiresIn: "1y" }
      );

      // Create a new userData object, excluding sensitive fields
      const {
        password,
        verificationtoken,
        tokenexpiration,
        resettoken,
        resettokenexpiration,
        ...userData
      } = user;
      userData.token = accessToken; // Include the token in the userData object

      return res.status(200).json(userData);
    } catch (error) {
      console.error("Google Auth Error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
  facebookAuth: async (req, res) => {
    try {
      const { accessToken } = req.body;
      if (!accessToken) {
        return res
          .status(400)
          .json({ success: false, message: "No access token provided" });
      }

      // Fetch user information from Facebook Graph API
      const fbResponse = await axios.get(`https://graph.facebook.com/me`, {
        params: {
          access_token: accessToken,
          fields: "id,name,email,picture",
        },
      });
      const fbData = fbResponse.data;

      if (!fbData.email) {
        return res
          .status(400)
          .json({ success: false, message: "Email not provided by Facebook" });
      }

      // Check if the user already exists by email
      const userResult = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [fbData.email]
      );
      let user;
      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
        // Optionally update the facebook_id if not already set
        if (!user.facebook_id) {
          await pool.query(
            "UPDATE users SET facebook_id = $1 WHERE email = $2",
            [fbData.id, fbData.email]
          );
        }
      } else {
        // Create a new user with details from the Facebook data
        const newId = await generateUniqueId();
        const username = fbData.name ? fbData.name : fbData.email.split("@")[0];
        const profileImage =
          fbData.picture && fbData.picture.data && fbData.picture.data.url
            ? fbData.picture.data.url
            : null;
        const insertQuery = `
          INSERT INTO users (id, email, username, facebook_id, profile_image, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING *
        `;
        const insertValues = [
          newId,
          fbData.email,
          username,
          fbData.id,
          profileImage,
        ];
        const insertResult = await pool.query(insertQuery, insertValues);
        user = insertResult.rows[0];
      }

      // Generate a JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );
      return res.json({ success: true, token, user });
    } catch (error) {
      console.error("Facebook Auth error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },
  // validateResetToken: async (req, res) => {
  //   const { token, email } = req.body;

  //   // Validate input
  //   if (!token || !email) {
  //     return res.status(400).json({ success: false, message: 'Token and email are required' });
  //   }

  //   try {
  //     // Check if the email exists in the database
  //     const result = await pool.query('SELECT resettoken, resettokenexpiration FROM users WHERE email = $1', [email]);

  //     // If no user found for the provided email
  //     if (result.rows.length === 0) {
  //       return res.status(400).json({ success: false, message: 'Invalid email' });
  //     }

  //     const user = result.rows[0];

  //     // Hash the incoming token to match the stored hashed token
  //     const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  //     // Check if the provided token matches the stored reset token
  //     if (!user.resettoken || user.resettoken !== hashedToken) {
  //       return res.status(400).json({ success: false, message: 'Invalid or missing token' });
  //     }

  //     // Check if the token has expired
  //     const isExpired = moment().isAfter(moment(user.resettokenexpiration));

  //     if (isExpired) {
  //       // Optionally clear the token if it's expired
  //       await pool.query('UPDATE users SET resettoken = NULL, resettokenexpiration = NULL WHERE email = $1', [email]);

  //       return res.status(400).json({ success: false, message: 'Token expired' });
  //     }

  //     // Token is valid
  //     return res.json({ success: true, message: 'Token is valid' });
  //   } catch (error) {
  //     console.error('Error validating reset token:', error);
  //     return res.status(500).json({ success: false, message: 'Error validating token' });
  //   }
  // }
};
module.exports = authController;
