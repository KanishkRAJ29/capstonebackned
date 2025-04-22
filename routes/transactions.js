const express = require("express")
const router = express.Router()
const Transaction = require("../models/Transaction")
const { authenticateJWT } = require("../middleware/auth")

// Get user transactions
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const { limit = 20, skip = 0, type } = req.query

    // Build query
    const query = { userId: req.user.userId }

    if (type && ["deposit", "withdrawal", "sent", "received"].includes(type)) {
      query.type = type
    }

    // Get transactions
    const transactions = await Transaction.find(query).sort({ createdAt: -1 }).skip(Number(skip)).limit(Number(limit))

    // Get total count
    const total = await Transaction.countDocuments(query)

    res.json({
      transactions,
      total,
      hasMore: total > Number(skip) + Number(limit),
    })
  } catch (error) {
    console.error("Get transactions error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get transaction details
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    })

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" })
    }

    res.json({ transaction })
  } catch (error) {
    console.error("Get transaction details error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
