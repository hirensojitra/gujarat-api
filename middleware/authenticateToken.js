const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    jwt.verify(token, process.env.JWT_SECRET || "3812932sjad43&*@", (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: "Token expired. Please login again." });
            }
            return res.status(403).json({ message: "Invalid token." });
        }

        req.user = user;  // Make sure the decoded token payload is attached to req.user
        next();
    });
};


module.exports = authenticateToken;
