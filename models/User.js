// models/User.js
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const Counter  = require("./counter.js");

const UserSchema = new mongoose.Schema({
  username: { type:String, required:true, unique:true, trim:true },
  email:    { type:String, required:true, unique:true, lowercase:true, trim:true },
  password: { type:String, required:true },
  merchantId:{ type:String, unique:true },    // now numeric-as-string
  balance:  { type:Number, default:0, min:0 },
  pin:      { type:String, default:null },
  hasPinSetup:{ type:Boolean, default:false },
  role:     { type:String, enum:["user","admin"], default:"user" }
},{
  timestamps:true
});

// 1) Auto‑increment merchantId on first save
UserSchema.pre("save", async function(next) {
  if (this.isNew) {
    const c = await Counter.findByIdAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 }},
      { new: true, upsert: true }
    );
    this.merchantId = c.seq.toString();
  }
  next();
});

// 2) Hash password
UserSchema.pre("save", async function(next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// 3) Hash PIN
UserSchema.pre("save", async function(next) {
  if (this.isModified("pin") && this.pin) {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
    this.hasPinSetup = true;
  }
  next();
});

// Password compare
UserSchema.methods.comparePassword = function(cand) {
  return bcrypt.compare(cand, this.password);
};

// PIN compare
UserSchema.methods.comparePin = function(cand) {
  if (!this.pin) return Promise.resolve(false);
  return bcrypt.compare(cand, this.pin);
};

UserSchema.methods.getProfile = function() {
  return {
    _id:         this._id,
    username:    this.username,
    email:       this.email,
    merchantId:  this.merchantId,
    balance:     this.balance,
    hasPinSetup: this.hasPinSetup,
    role:        this.role
  };
};

module.exports = mongoose.model("User", UserSchema);
