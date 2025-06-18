// Check if user has required role
const hasRole = (role) => {
  return async (req, res, next) => {
    try {
      const User = require("../models/User")
      const user = await User.findById(req.user.userId)

      if (!user || user.role !== role) {
        return res.status(403).json({ message: `Access denied, ${role} privileges required` })
      }

      next()
    } catch (error) {
      console.error("Role check error:", error)
      res.status(500).json({ message: "Server error" }) 
    }
  }
}   

module.exports = { hasRole }
