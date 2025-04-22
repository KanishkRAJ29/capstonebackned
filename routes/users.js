const express = require("express")
const router = express.Router()
const User = require("../models/User")
const { authenticateJWT } = require("../middleware/auth")

// Get current user profile
router.get("/me", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ user: user.getProfile() })
  } catch (error) {
    console.error("Get user profile error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Setup PIN
router.post("/setup-pin", authenticateJWT, async (req, res) => {
  try {
    const { pin } = req.body

    // Validate PIN
    if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be exactly 4 digits" })
    }

    const user = await User.findById(req.user.userId)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if PIN is already set
    if (user.hasPinSetup) {
      return res.status(400).json({ message: "PIN is already set up" })
    }

    // Set PIN
    user.pin = pin
    await user.save()

    res.json({ message: "PIN set up successfully", hasPinSetup: true })
  } catch (error) {
    console.error("PIN setup error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Verify PIN
router.post("/verify-pin", authenticateJWT, async (req, res) => {
  try {
    const { pin } = req.body

    // Validate PIN
    if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be exactly 4 digits" })
    }

    const user = await User.findById(req.user.userId)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if PIN is set
    if (!user.hasPinSetup) {
      return res.status(400).json({ message: "PIN is not set up" })
    }

    // Verify PIN
    const isMatch = await user.comparePin(pin)

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid PIN", verified: false })
    }

    res.json({ message: "PIN verified successfully", verified: true })
  } catch (error) {
    console.error("PIN verification error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Change password
router.post("/change-password", authenticateJWT, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" })
    }

    const user = await User.findById(req.user.userId)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword)

    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" })
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({ message: "Password changed successfully" })
  } catch (error) {
    console.error("Change password error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
