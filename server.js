const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const http = require("http")
const socketIo = require("socket.io")
const dotenv = require("dotenv")
const path = require("path")

// Load environment variables
dotenv.config({ path: "./config/config.env" })

// Import routes
const authRoutes = require("./routes/auth")
const walletRoutes = require("./routes/wallet")
const paymentsRoutes = require("./routes/payments")
const adminRoutes = require("./routes/admin")
const userRoutes = require("./routes/users")
const transactionRoutes = require("./routes/transactions")

// Import middleware
const { authenticateJWT } = require("./middleware/auth")

// Create Express app
const app = express()
const server = http.createServer(app)

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}
// Globally enable CORS
app.use(cors(corsOptions))
// Explicitly handle preflight for all /api routes
app.options("/api/*", cors(corsOptions))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Make io available in routes
app.use((req, res, next) => {
  req.io = io
  next()
})

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/wallet", authenticateJWT, walletRoutes)
app.use("/api/payments", paymentsRoutes) // Some routes need auth, some don't
app.use("/api/admin", authenticateJWT, adminRoutes)
app.use("/api/users", userRoutes) // Some routes need auth, some don't
app.use("/api/transactions", authenticateJWT, transactionRoutes)

// API health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "API is running" })
})

// Catch-all route for API 404s
app.use("/api/*", (req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`)
  res.status(404).json({
    message: "API endpoint not found",
    path: req.originalUrl,
    availableRoutes: [
      "/api/auth/*",
      "/api/wallet/*",
      "/api/payments/*",
      "/api/admin/*",
      "/api/users/*",
      "/api/transactions/*",
    ],
  })
})

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")))

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/build", "index.html"))
  })
} else {
  // Development 404 handler for non-API routes
  app.use("*", (req, res) => {
    res.status(404).send("Not Found - This is a backend API server")
  })
}

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  if (!token) {
    return next(new Error("Authentication error"))
  }

  try {
    const jwt = require("jsonwebtoken")
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.userId = decoded.userId
    next()
  } catch (err) {
    return next(new Error("Authentication error"))
  }
})

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.userId}`)

  // Join a room specific to this user
  socket.join(socket.userId)

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`)
  })
})

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB")

    // Start server
    const PORT = process.env.PORT || 5000
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`API available at http://localhost:${PORT}/api`)
    })
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err)
    process.exit(1)
  })

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err)
})
