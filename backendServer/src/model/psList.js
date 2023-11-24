"use strict";
const mongoose = require("mongoose");

const PSList = new mongoose.Schema(
  {
    listName: {
      type: "string",
    },
    pslId: {
      type: Number,
    },
    listItems: [
      {
        url: String,
        imageLink: String,
        priceContent: String,
        favorite: {
          type: Boolean,
          default: false,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customerId: {
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

mongoose.model("PSList", PSList);
