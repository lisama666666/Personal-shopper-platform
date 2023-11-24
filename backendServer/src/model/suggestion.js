"use strict";
const mongoose = require("mongoose");


const Suggestion = new mongoose.Schema(
  {
    brandName:{
      type: 'string',
    },
    brandUrl:{
      type: 'string',
    },
    description:{
      type: 'string',
    },
    suggestionId:{
      type: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "User" 
    },
  },
  {
    versionKey: false,
  }
);



mongoose.model("Suggestion", Suggestion);
