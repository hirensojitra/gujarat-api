const express = require("express");
const router = express.Router();

const authController = require("../controller/auth.controller");
const authenticateToken = require("../middleware/authenticateToken");
const uploadLimits = require("../middleware/uploadLimits");

// Route for user registration
router.post("/register", authController.register);

// Route for updating user details (protected)
router.put("/updateUser/:userid", authenticateToken, uploadLimits.single('image'), authController.updateUser);

// Route for user login
router.post("/login", authController.login);
router.get('/profile-image/:username', authController.getProfileImage);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.get('/users', authenticateToken, authController.getAllUsers);
router.post("/forgot-password", authController.requestPasswordReset);
router.post("/reset-password", authController.resetPassword);
router.post("/validate-reset-token", authController.validateResetToken);


module.exports = router;
