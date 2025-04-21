const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const { v4: uuidv4 } = require("uuid")

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
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Hash PIN before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("pin") || !this.pin) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.pin = await bcrypt.hash(this.pin, salt)
    this.hasPinSetup = true
    next()
  } catch (error) {
    next(error)
  }
})

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Method to compare PIN
UserSchema.methods.comparePin = async function (candidatePin) {
  if (!this.pin) return false
  return await bcrypt.compare(candidatePin, this.pin)
}

// Method to get user profile (without sensitive data)
UserSchema.methods.getProfile = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    merchantId: this.merchantId,
    balance: this.balance,
    hasPinSetup: this.hasPinSetup,
    role: this.role,
  }
}

module.exports = mongoose.model("User", UserSchema)
