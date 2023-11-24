"use strict";
const mongoose = require("mongoose");


const helpRequest = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    requestId: {
      type: Number,
    },
    specialty: {
      type: String,
    },
    description: {
      type: String,
    },
    creatorNote:{
      type: String,
    },
    reason:{
      type: String,
    },
    status: {
      type: String,
      enum: ["accept", "pending", "reject"],
      default: "pending",
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


mongoose.model("helpRequest", helpRequest);
