// Validate the token after authentication middleware has verified it
const validateToken = (req, res) => {
    res.json({
        valid: true,
        message: 'Token is valid',
        user: req.user  // The decoded token payload from authenticateToken middleware
    });
};

module.exports = {
    validateToken
};
