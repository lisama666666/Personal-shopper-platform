"use strict";
const mongoose = require("mongoose");

const Store = new mongoose.Schema(
  {
    brandName: {
      type: "string",
    },
    websiteLink: {
      type: "string",
      trim: true,
      lowercase: true,
      unique: true,
    },
    containerKey: {
      type: "string",
      default:'nill'
    },
    priceKey: {
      type: "string",
      default:'nill'
    },
    pictureKey: {
      type: "string",
      default:'nill'
    },
    storeId: {
      type: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    versionKey: false,
  }
);

mongoose.model("Store", Store);
