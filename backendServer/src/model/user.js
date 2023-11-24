"use strict";
const mongoose = require("mongoose");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const secretKey = process.env.SECRET_KEY;

var validateEmail = function (email) {
  var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
};

const User = new mongoose.Schema(
  {
    fullName: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: "Email address is required",
      validate: [validateEmail, "Please fill a valid email address"],
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please fill a valid email address"],
    },
    phoneNumber: {
      type: String,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "block"],
      default: "active",
    },
    role: {
      type: String,
      enum: ["superAdmin", "creator", "customer"],
    },
    bodyType: {
      type: String,
      enum: ["triangle", "rectangle", "pear", "hourglass", "apple"],
      default: "triangle",
    },

    token: {
      type: String,
    },
    forgetPasswordAuthToken: {
      type: String,
    },
    description: {
      type: String,
    },
    creatorId: {
      type: Number,
    },
    profileImageUrl: {
      type: String,
    },
    customerId: {
      type: Number,
    },
    latestActivity: {
      type: Date,
    },
    myCreator: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

User.methods.updateActivityTime = async function () {
  let user = this;
  user.lastActivity = new Date();
  return user.save();
};

User.methods.generateAuthToken = async function (extra = "") {
  let user = this;

  let token = jwt
    .sign(
      {
        _id: user._id.toHexString(),
        email: user.email,
        fullName: user.fullName,
        status: user.status,
      },
      secretKey
    )
    .toString();
  user.token = token;
  user.lastLogin = new Date();
  return user.save().then(() => {
    return token;
  });
};

/**
 * Password hash middleware.
 */

User.pre("save", async function save(next) {
  const user = this;
  if (!user.isModified("password")) {
    return next();
  }

  let salt = await bcrypt.genSalt(10);
  let hash = await new Promise((resolve, reject) => {
    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  });
  user.password = hash;
  next();
});

/**
 
/**
 * Helper method for validating user's password.
 */
User.methods.comparePassword = function comparePassword(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    cb(err, isMatch);
  });
};

User.statics.findByToken = function (token) {
  let User = this;
  let decoded;

  try {
    decoded = jwt.verify(token, secretKey);
  } catch (error) {
    return Promise.reject(error);
  }

  return User.findOne({
    _id: decoded._id,
    token: token,
  });
};

mongoose.model("User", User);
