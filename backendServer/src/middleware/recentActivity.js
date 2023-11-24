const generalService = require("../services/generalOperation");
const constant = require("../utils/constant");
const catchAsync = require("../utils/catchAsync");
const TableName = "User";

const recentActivity = catchAsync  ( async (req, res, next)=> {
      
      const userId = req.user._id;
      if(userId) {
      const currentDate = new Date();
      await generalService.findAndModifyRecord(TableName, { _id: userId._id }, { latestActivity: currentDate });
      next();
      }
      else{
        res.status(401).send({
          status: constant.ERROR,
          message: "No User Found",
        });
      }
      
});

module.exports = { recentActivity };