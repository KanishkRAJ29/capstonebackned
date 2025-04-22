const express = require("express")
const router = express.Router()
const User = require("../models/User")
const Transaction = require("../models/Transaction")
const { authenticateJWT } = require("../middleware/auth")

// Get wallet balance
router.get("/balance", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ balance: user.balance })
  } catch (error) {
    console.error("Get balance error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Add funds to wallet (user initiated)
router.post("/add-funds", authenticateJWT, async (req, res) => {
  try {
    const { amount } = req.body

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" })
    }

    const user = await User.findById(req.user.userId)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if PIN is set up
    if (!user.hasPinSetup) {
      return res.status(400).json({ message: "PIN must be set up before adding funds" })
    }

    // Update user balance
    user.balance += amount
    await user.save()

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: "deposit",
      amount,
      description: "Added funds to wallet",
    })

    await transaction.save()

    // Emit socket event
    req.io.to(user._id.toString()).emit("balance:updated", { balance: user.balance })

    res.json({
      message: "Funds added successfully",
      balance: user.balance,
      transaction: {
        _id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt,
      },
    })
  } catch (error) {
    console.error("Add funds error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Withdraw funds from wallet
router.post("/withdraw", authenticateJWT, async (req, res) => {
  try {
    const { amount, pin } = req.body

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" })
    }

    // Validate PIN
    if (!pin) {
      return res.status(400).json({ message: "PIN is required" })
    }

    const user = await User.findById(req.user.userId)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if PIN is set up
    if (!user.hasPinSetup) {
      return res.status(400).json({ message: "PIN must be set up before withdrawing funds" })
    }

    // Verify PIN
    const isMatch = await user.comparePin(pin)

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid PIN" })
    }

    // Check if user has sufficient balance
    if (user.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" })
    }

    // Update user balance
    user.balance -= amount
    await user.save()

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: "withdrawal",
      amount,
      description: "Withdrew funds from wallet",
    })

    await transaction.save()

    // Emit socket event
    req.io.to(user._id.toString()).emit("balance:updated", { balance: user.balance })

    res.json({
      message: "Funds withdrawn successfully",
      balance: user.balance,
      transaction: {
        _id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt,
      },
    })
  } catch (error) {
    console.error("Withdraw funds error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
