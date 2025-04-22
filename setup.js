const fs = require("fs")
const path = require("path")

// Define required directories
const requiredDirs = ["models", "routes", "middleware", "controllers"]

// Define required files with empty templates
const requiredFiles = [
  {
    path: "routes/auth.js",
    content: `
const express = require("express");
const router = express.Router();

// Register route
router.post("/register", (req, res) => {
  res.json({ message: "Register endpoint" });
});

// Login route
router.post("/login", (req, res) => {
  res.json({ message: "Login endpoint" });
});

module.exports = router;
  `,
  },
  {
    path: "routes/users.js",
    content: `
const express = require("express");
const router = express.Router();
const { authenticateJWT } = require("../middleware/auth");

// Get current user
router.get("/me", authenticateJWT, (req, res) => {
  res.json({ message: "Get current user endpoint" });
});

module.exports = router;
  `,
  },
  {
    path: "routes/wallet.js",
    content: `
const express = require("express");
const router = express.Router();

// Get wallet balance
router.get("/balance", (req, res) => {
  res.json({ message: "Get wallet balance endpoint" });
});

module.exports = router;
  `,
  },
  {
    path: "routes/payments.js",
    content: `
const express = require("express");
const router = express.Router();

// Create payment request
router.post("/request", (req, res) => {
  res.json({ message: "Create payment request endpoint" });
});

module.exports = router;
  `,
  },
  {
    path: "routes/admin.js",
    content: `
const express = require("express");
const router = express.Router();

// Get all users
router.get("/users", (req, res) => {
  res.json({ message: "Get all users endpoint" });
});

module.exports = router;
  `,
  },
  {
    path: "routes/transactions.js",
    content: `
const express = require("express");
const router = express.Router();

// Get user transactions
router.get("/", (req, res) => {
  res.json({ message: "Get user transactions endpoint" });
});

module.exports = router;
  `,
  },
  {
    path: "middleware/auth.js",
    content: `
const jwt = require("jsonwebtoken");

// Authenticate JWT token
const authenticateJWT = (req, res, next) => {
  const authHeader = req.header("Authorization");
  
  if (!authHeader) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
  
  // Check if the header starts with "Bearer "
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const User = require("../models/User");
    const user = await User.findById(req.user.userId);
    
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied, admin privileges required" });
    }
    
    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { authenticateJWT, isAdmin };
  `,
  },
  {
    path: "models/User.js",
    content: `
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    merchantId: {
      type: String,
      unique: true,
      default: () => uuidv4(),
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    pin: {
      type: String,
      default: null,
    },
    hasPinSetup: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
  `,
  },
  {
    path: "models/Transaction.js",
    content: `
const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "sent", "received"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    otherParty: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", TransactionSchema);
  `,
  },
  {
    path: "models/PaymentRequest.js",
    content: `
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const PaymentRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
      default: () => uuidv4(),
    },
    merchantId: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "expired", "cancelled"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PaymentRequest", PaymentRequestSchema);
  `,
  },
]

console.log("Setting up backend directory structure...")

// Create directories
requiredDirs.forEach((dir) => {
  const dirPath = path.join(__dirname, dir)
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dir}`)
    fs.mkdirSync(dirPath, { recursive: true })
  }
})

// Create files
requiredFiles.forEach((file) => {
  const filePath = path.join(__dirname, file.path)
  if (!fs.existsSync(filePath)) {
    console.log(`Creating file: ${file.path}`)
    fs.writeFileSync(filePath, file.content.trim())
  }
})

console.log("Setup complete! All required directories and files have been created.")
console.log('Run "node server.js" to start the server.')
