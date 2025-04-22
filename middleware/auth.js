const jwt = require("jsonwebtoken")
const User = require("../models/User")

// Authenticate JWT token
const authenticateJWT = (req, res, next) => {
  const authHeader = req.header("Authorization")

  if (!authHeader) {
    return res.status(401).json({ message: "No token, authorization denied" })
  }

  // Check if the header starts with "Bearer "
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    console.error("JWT Verification Error:", error)
    res.status(401).json({ message: "Token is not valid" })
  }
}

// Check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied, admin privileges required" })
    }

    next()
  } catch (error) {
    console.error("Admin check error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

module.exports = { authenticateJWT, isAdmin }
