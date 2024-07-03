const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Vui lòng nhập tên người dùng!"],
  },
  email: {
    type: String,
    required: [true, "Vui lòng nhập email!"],
  },
  password: {
    type: String,
    required: [true, "Vui lòng nhập mật khẩu"],
    minLength: [6, "Mật khẩu phải từ 6 ký tự"],
    select: false,
  },
  phoneNumber: {
    type: Number,
  },
  addresses: [
    {
      country: {
        type: String,
      },
      city: {
        type: String,
      },
      address1: {
        type: String,
      },
      // address2:{
      //   type: String,
      // },
      zipCode: {
        type: Number,
      },
      addressType: {
        type: String,
      },
    },
  ],
  role: {
    type: String,
    default: "user",
  },
  avatar: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  resetPasswordToken: String,
  resetPasswordTime: Date,
});

//  Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  this.password = await bcrypt.hash(this.password, 10);
});

// jwt token
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// forgot password
userSchema.methods.generatePasswordResetToken = function () {
  this.resetPasswordToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordTime = Date.now() + 3600000; // Token hết hạn sau 1 giờ
  return this.resetPasswordToken;
};
//update password
userSchema.methods.updatePassword = function (newPassword) {
  this.password = newPassword;
  this.resetPasswordToken = null; // Xóa mã đặt lại mật khẩu sau khi đã sử dụng
  this.resetPasswordTime = null; // Xóa thời gian đặt lại mật khẩu sau khi đã sử dụng
};

module.exports = mongoose.model("User", userSchema);
