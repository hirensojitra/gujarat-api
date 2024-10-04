const express = require("express");
const router = express.Router();

const authController = require("../controller/auth.controller");
const authenticateToken = require("../middleware/authenticateToken");

// Route for user registration
router.post("/register", authController.register);

// Route for updating user details (protected)
router.put("/updateUser/:userid", authenticateToken, authController.updateUser);

// Route for user login
router.post("/login", authController.login);

module.exports = router;
