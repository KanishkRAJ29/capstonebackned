const express = require("express")
const router = express.Router()
const User = require("../models/User")
const Transaction = require("../models/Transaction")
const { authenticateJWT, isAdmin } = require("../middleware/auth")

// Get all users (admin only)
router.get("/users", authenticateJWT, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password -pin")

    res.json({ users })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Add funds to user wallet (admin only)
router.post("/add-funds", authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { merchantId, amount } = req.body

    // Validate input
    if (!merchantId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Merchant ID and amount are required" })
    }

    // Find user by merchant ID
    const user = await User.findOne({ merchantId })

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Update user balance
    user.balance += amount
    await user.save()

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: "deposit",
      amount,
      description: "Admin added funds",
    })

    await transaction.save()

    // Emit socket event
    req.io.to(user._id.toString()).emit("balance:updated", { balance: user.balance })

    res.json({
      message: "Funds added successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        merchantId: user.merchantId,
        balance: user.balance,
      },
      transaction: {
        _id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt,
      },
    })
  } catch (error) {
    console.error("Admin add funds error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get all transactions (admin only)
router.get("/transactions", authenticateJWT, isAdmin, async (req, res) => {
  try {
    const transactions = await Transaction.find().populate("userId", "username email merchantId")

    res.json({ transactions })
  } catch (error) {
    console.error("Get transactions error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create admin user (first user only)
router.post("/create-first-admin", async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Check if any users exist
    const userCount = await User.countDocuments()

    if (userCount > 0) {
      return res.status(403).json({ message: "Admin already exists" })
    }

    // Create admin user
    const admin = new User({
      username,
      email,
      password,
      role: "admin",
    })

    await admin.save()

    res.status(201).json({
      message: "Admin user created successfully",
      admin: {
        _id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error("Create admin error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
