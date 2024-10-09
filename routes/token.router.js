const express = require('express');
const router = express.Router();
const { validateToken } = require('../controller/token.controller');
const authenticateToken = require('../middleware/authenticateToken');

// Protect the validateToken route with the authenticateToken middleware
router.post('/validate-token', authenticateToken, validateToken);

module.exports = router;
