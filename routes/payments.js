const express = require("express")
const router = express.Router()
const User = require("../models/User")
const Transaction = require("../models/Transaction")
const PaymentRequest = require("../models/PaymentRequest")
const { authenticateJWT } = require("../middleware/auth")
const qrcode = require("qrcode")

/*
// POST /api/payments/fingerprint-transfer
async function performTransfer(sender, receiver, amount) {
  if (sender.balance < amount) {
    return { success: false, message: "Insufficient balance" };
  }

  // update balances
  sender.balance   -= amount;
  receiver.balance += amount;
  await sender.save();
  await receiver.save();

  // log transactions
  const sentTx = await Transaction.create({
    userId: sender._id,
    type: "sent",
    amount,
    description: `Payment to ${receiver.username}`,
    otherParty: receiver.username
  });

  await Transaction.create({
    userId: receiver._id,
    type: "received",
    amount,
    description: `Payment from ${sender.username}`,
    otherParty: sender.username,
    relatedTransaction: sentTx._id
  });

  return {
    success: true,
    newBalance: sender.balance,
    receiverBalance: receiver.balance
  };
}

router.post(
  "/fingerprint-transfer",
  authenticateJWT,
  async (req, res) => {
    try {
      const { senderId, receiverId, amount, requestId } = req.body;

      // senderId must match authenticated user
      if (req.user.merchantId !== senderId) {
        return res.status(403).json({ message: "Sender mismatch" });
      }

      // find sender & receiver by merchantId
      const sender   = await User.findOne({ merchantId: senderId });
      const receiver = await User.findOne({ merchantId: receiverId });
      if (!sender || !receiver) {
        return res.status(404).json({ message: "Sender or receiver not found" });
      }

      // if this was a QR-generated request, validate it
      if (requestId) {
        const payReq = await PaymentRequest.findOne({ requestId });
        if (!payReq) {
          return res.status(404).json({ message: "Payment request not found" });
        }
        if (payReq.status !== "pending") {
          return res.status(400).json({ message: `Request already ${payReq.status}` });
        }
        if (payReq.merchantId !== receiverId || payReq.amount !== amount) {
          return res.status(400).json({ message: "Request data mismatch" });
        }
        payReq.status = "completed";
        await payReq.save();
      }

      // perform the money transfer
      const result = await performTransfer(sender, receiver, amount);
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      return res.json({
        message: "Transaction successful",
        newBalance: result.newBalance,
        receiverBalance: result.receiverBalance
      });

    } catch (err) {
      console.error("fingerprint-transfer error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);*/



// Shared transfer logic
async function performTransfer(sender, receiver, amount) {
  if (sender.balance < amount) {
    return { success: false, message: "Insufficient balance" };
  }
  sender.balance   -= amount;
  receiver.balance += amount;
  await sender.save();
  await receiver.save();

  const sentTx = await Transaction.create({
    userId: sender._id,
    type: "sent",
    amount,
    description: `Payment to ${receiver.username}`,
    otherParty: receiver.username
  });

  await Transaction.create({
    userId: receiver._id,
    type: "received",
    amount,
    description: `Payment from ${sender.username}`,
    otherParty: sender.username,
    relatedTransaction: sentTx._id
  });

  return {
    success: true,
    newBalance: sender.balance,
    receiverBalance: receiver.balance
  };
}

// POST /api/payments/fingerprint-transfer
router.post(
  "/fingerprint-transfer",
  authenticateJWT,
  async (req, res) => {
    try {
      const { senderId, receiverId, amount, requestId } = req.body;

      // 1) Load the authenticated user from Mongo
      const authUser = await User.findById(req.user.userId);
      if (!authUser) {
        return res.status(404).json({ message: "Authenticated user not found" });
      }

      // 2) Ensure the body’s senderId matches that user’s merchantId
      if (authUser.merchantId !== senderId) {
        return res.status(403).json({ message: "Sender mismatch" });
      }

      // 3) Load sender & receiver by merchantId
      const sender   = authUser;
      const receiver = await User.findOne({ merchantId: receiverId });
      if (!receiver) {
        return res.status(404).json({ message: "Receiver not found" });
      }

      // 4) If using a payment request, validate it
      if (requestId) {
        const payReq = await PaymentRequest.findOne({ requestId });
        if (!payReq) {
          return res.status(404).json({ message: "Payment request not found" });
        }
        if (payReq.status !== "pending") {
          return res.status(400).json({ message: `Request already ${payReq.status}` });
        }
        if (payReq.merchantId !== receiverId || payReq.amount !== amount) {
          return res.status(400).json({ message: "Request data mismatch" });
        }
        payReq.status = "completed";
        await payReq.save();
      }

      // 5) Perform the transfer
      const result = await performTransfer(sender, receiver, amount);
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      // 6) Return success
      return res.json({
        message: "Transaction successful",
        newBalance: result.newBalance,
        receiverBalance: result.receiverBalance
      });

    } catch (err) {
      console.error("fingerprint-transfer error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);



// Create payment request (generate QR code)
router.post("/request", authenticateJWT, async (req, res) => {
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

    // Create payment request
    const paymentRequest = new PaymentRequest({
      merchantId: user.merchantId,
      userId: user._id,
      amount,
    })

    await paymentRequest.save()

    // Create QR code data
    const qrData = JSON.stringify({
      merchantId: user.merchantId,
      amount,
      requestId: paymentRequest.requestId,
    })

    // Generate payment link
    const paymentLink = `${process.env.FRONTEND_URL}/pay/${paymentRequest.requestId}`

    res.json({
      message: "Payment request created successfully",
      requestId: paymentRequest.requestId,
      qrData,
      paymentLink,
    })
  } catch (error) {
    console.error("Create payment request error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get payment request details
router.get("/request/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params

    const paymentRequest = await PaymentRequest.findOne({ requestId })

    if (!paymentRequest) {
      return res.status(404).json({ message: "Payment request not found" })
    }

    // Check if payment request is expired
    if (paymentRequest.status === "expired" || new Date() > paymentRequest.expiresAt) {
      paymentRequest.status = "expired"
      await paymentRequest.save()
      return res.status(400).json({ message: "Payment request has expired" })
    }

    // Get merchant details
    const merchant = await User.findOne({ merchantId: paymentRequest.merchantId })

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" })
    }

    res.json({
      requestId: paymentRequest.requestId,
      merchantId: paymentRequest.merchantId,
      merchantName: merchant.username,
      amount: paymentRequest.amount,
      status: paymentRequest.status,
      createdAt: paymentRequest.createdAt,
      expiresAt: paymentRequest.expiresAt,
    })
  } catch (error) {
    console.error("Get payment request error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Check payment request status
router.get("/request/status/:requestId", authenticateJWT, async (req, res) => {
  try {
    const { requestId } = req.params

    const paymentRequest = await PaymentRequest.findOne({ requestId })

    if (!paymentRequest) {
      return res.status(404).json({ message: "Payment request not found" })
    }

    // Check if the user is authorized to check this request
    if (paymentRequest.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized to check this payment request" })
    }

    res.json({
      status: paymentRequest.status,
      amount: paymentRequest.amount,
      createdAt: paymentRequest.createdAt,
      expiresAt: paymentRequest.expiresAt,
    })
  } catch (error) {
    console.error("Check payment request status error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Send payment (from watch)
router.post("/send", async (req, res) => {
  try {
    const { senderId, receiverId, amount, requestId, fingerprintVerified } = req.body

    // Validate input
    if (!senderId || !receiverId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid payment details" })
    }

    // Validate fingerprint verification
    if (!fingerprintVerified) {
      return res.status(401).json({ message: "Fingerprint verification required" })
    }

    // Find sender and receiver
    const sender = await User.findOne({ merchantId: senderId })
    const receiver = await User.findOne({ merchantId: receiverId })

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Sender or receiver not found" })
    }

    // Check if sender has sufficient balance
    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" })
    }

    // If requestId is provided, validate it
    if (requestId) {
      const paymentRequest = await PaymentRequest.findOne({ requestId })

      if (!paymentRequest) {
        return res.status(404).json({ message: "Payment request not found" })
      }

      if (paymentRequest.status !== "pending") {
        return res.status(400).json({ message: "Payment request is not pending" })
      }

      if (paymentRequest.merchantId !== receiverId) {
        return res.status(400).json({ message: "Invalid receiver for this payment request" })
      }

      if (paymentRequest.amount !== amount) {
        return res.status(400).json({ message: "Amount does not match payment request" })
      }

      // Update payment request status
      paymentRequest.status = "completed"
      await paymentRequest.save()
    }

    // Update balances
    sender.balance -= amount
    receiver.balance += amount

    await sender.save()
    await receiver.save()

    // Create transaction records
    const senderTransaction = new Transaction({
      userId: sender._id,
      type: "sent",
      amount,
      description: `Payment to ${receiver.username}`,
      otherParty: receiver.username,
    })

    const receiverTransaction = new Transaction({
      userId: receiver._id,
      type: "received",
      amount,
      description: `Payment from ${sender.username}`,
      otherParty: sender.username,
      relatedTransaction: senderTransaction._id,
    })

    senderTransaction.relatedTransaction = receiverTransaction._id

    await senderTransaction.save()
    await receiverTransaction.save()

    // Emit socket events
    const io = req.io
    io.to(sender._id.toString()).emit("payment:completed", {
      type: "sent",
      amount,
      otherParty: receiver.username,
      balance: sender.balance,
    })

    io.to(receiver._id.toString()).emit("payment:completed", {
      type: "received",
      amount,
      otherParty: sender.username,
      balance: receiver.balance,
    })

    res.json({
      message: "Payment sent successfully",
      transactionId: senderTransaction._id,
    })
  } catch (error) {
    console.error("Send payment error:", error)
    res.status(500).json({ message: "Server error" })
  }
})
/*
// Check payment status (for watch polling)
router.get("/status/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params

    const transaction = await Transaction.findById(transactionId)

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" })
    }

    res.json({
      status: transaction.status,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
    })
  } catch (error) {
    console.error("Check payment status error:", error)
    res.status(500).json({ message: "Server error" })
  }
})*/
/*
// Get merchant details by merchantId
router.get("/merchant/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params

    const merchant = await User.findOne({ merchantId })

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found" })
    }

    res.json({
      merchantId: merchant.merchantId,
      merchantName: merchant.username,
    })
  } catch (error) {
    console.error("Get merchant details error:", error)
    res.status(500).json({ message: "Server error" })
  }
})
*/
module.exports = router
