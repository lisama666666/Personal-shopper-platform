"use strict";
const mongoose = require("mongoose");

const SiteActivities = new mongoose.Schema(
  {
    text: {
      type: String,
    },
    type: {
      type: String,
      enum: ["customer", "user", "PSL", "store", "creator", "reject"],
    },
    noOfItems: {
      type: String,
    },
    reason: {
      type: String,
    },
    createdRole: {
      type: String,
      enum: ["superAdmin", "creator", "customer"],
    },
    createdFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

mongoose.model("SiteActivities", SiteActivities);
