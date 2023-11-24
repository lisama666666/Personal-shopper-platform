const constant = require("../utils/constant");
const catchAsync = require("../utils/catchAsync");
const generalService = require("../services/generalOperation");
const mongoose = require("mongoose");
const { incrementField } = require("../utils/commonFun");
const TableName = "User";

const getCustomer = catchAsync(async (req, res) => {
  const data = JSON.parse(req.params.query);
  let condition = { role: "customer" };
  if (data.query !== "all") {
    condition = {
      role: "customer",
      $expr: {
        $regexMatch: {
          input: {
            $concat: ["$fullName", { $toString: "$customerId" }, "$email"],
          },
          regex: `.*${data.name}.*`,
          options: "i",
        },
      },
    };
  }

  let aggregateArr = [
    {
      $match: condition,
    },
    {
      $lookup: {
        from: "helprequests",
        let: { cId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$$cId", "$customerId"] },
              status: "accept",
            },
          },
          {
            $lookup: {
              from: "users",
              let: { cId: "$creatorId" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$$cId", "$_id"] },
                  },
                },
                {
                  $project: {
                    _id: 1,
                    fullName: 1,
                    email: 1,
                  },
                },
              ],
              as: "creatorDetailUser",
            },
          },
          {
            $project: {
              _id: 1,
              fullName: { $arrayElemAt: ["$creatorDetailUser.fullName", 0] },
              email: { $arrayElemAt: ["$creatorDetailUser.email", 0] },
            },
          },
        ],
        as: "creatorDetail",
      },
    },
    {
      $lookup: {
        from: "pslists",
        let: { cId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$customerId", "$$cId"] },
            },
          },

          {
            $project: {
              _id: 1,
              pslId: 1,
              listItems: 1,
              noOfItems: { $size: "$listItems" },
              createdAt: 1,
              totalPrice: {
                $reduce: {
                  input: "$listItems",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $function: {
                          body: "function(priceContent) { const regex = /\\d+(?:\\.\\d+)?/; const match = priceContent.match(regex); return match ? parseFloat(match[0]) : 0; }",
                          args: ["$$this.priceContent"],
                          lang: "js",
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
        as: "pslDetails",
      },
    },
    {
      $project: {
        fullName: 1,
        email: 1,
        status: 1,
        phoneNumber: 1,
        description: 1,
        lastLogin: 1,
        lastActivity: 1,
        role: 1,
        customerId: 1,
        createdAt: 1,
        bodyType: 1,
        creatorDetail: 1,
        pslCount: { $size: "$pslDetails" },
        pslDetails: 1,
        noOfCreator: { $size: { $ifNull: ["$myCreator", []] } },
      },
    },
  ];

  let Record = await generalService.getRecordAggregate(TableName, aggregateArr);

  res.send({
    status: constant.SUCCESS,
    message: "customer record fetch successfully",

    Record: Record,
  });
});

const addCustomer = catchAsync(async (req, res) => {
  const data = req.body;
  data.role = "customer";

  const customerId = await incrementField("User", "customerId", { role: "customer" });
  data.customerId = customerId;

  const todayDate = new Date();

  const customerNotiyObj = {
    type: "customer",
    text: "New customer has been created",
    createdAt: todayDate,
  };

  let notificationRecord = generalService.addRecord("SiteActivities", customerNotiyObj);
  console.log(notificationRecord);

  let Record = await generalService.addRecord(TableName, data);
  res.send({
    status: constant.SUCCESS,
    message: "customer record added successfully",
    Record: Record,
  });
});

const updateCustomer = catchAsync(async (req, res) => {
  const data = req.body;

  let Record = await generalService.findAndModifyRecord(TableName, { _id: data._id }, { status: data.status });
  res.send({
    status: constant.SUCCESS,
    message: "customer record added successfully",
    Record: Record,
  });
});

const deleteCustomer = catchAsync(async (req, res) => {
  const data = req.body;

  //===== Deleting PSL related with customer
  const deletePSLRecord = await generalService.deleteRecord("PSList", { customerId: data._id });

  //======= Deleting Customer information
  const deleteCustomer = await generalService.deleteRecord("User", { _id: data._id });

  res.send({
    status: constant.SUCCESS,
    message: "customer record deleted successfully",
    Record: { _id: data._id },
  });
});

const assignCreator = catchAsync(async (req, res) => {
  const userId = req.user.userId;
  const creatorId = req.body.cId;

  const data = req.body;
  let Record = await generalService.findAndModifyRecord(TableName, { _id: userId }, { myCreator: creatorId });
  res.send({
    status: constant.SUCCESS,
    message: "customer record added successfully",
    Record: Record,
  });
});

const helpRequest = catchAsync(async (req, res) => {
  const user = req.user;

  const data = req.body;
  data.customerId = user._id;

  let Record = await generalService.addRecord("helpRequest", data);
  res.send({
    status: constant.SUCCESS,
    message: "request save successfully",
    Record: Record,
  });
});

const getMyCreator = catchAsync(async (req, res) => {
  const user = req.user;
  const data = JSON.parse(req.params.query);

  let condition = {
    customerId: user._id,
    status: { $ne: "reject" },
  };

  let postCondition = {};
  if (data.query !== "all") {
    postCondition = {
      $expr: {
        $regexMatch: {
          input: {
            $concat: ["$fullName", "$email", "$phoneNumber"],
          },
          regex: `.*${data.name}.*`,
          options: "i",
        },
      },
    };
  }

  let aggregateArr = [
    {
      $match: condition,
    },
    {
      $lookup: {
        from: "users",
        let: { cId: "$creatorId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$cId"] },
            },
          },
          {
            $project: {
              fullName: 1,
              email: 1,
              phoneNumber: 1,
              profileImageUrl: 1,
            },
          },
        ],
        as: "creatorDetail",
      },
    },
    {
      $project: {
        _id: 1,
        fullName: { $arrayElemAt: ["$creatorDetail.fullName", 0] },
        email: { $arrayElemAt: ["$creatorDetail.email", 0] },
        phoneNumber: { $arrayElemAt: ["$creatorDetail.phoneNumber", 0] },
        profileImageUrl: { $arrayElemAt: ["$creatorDetail.profileImageUrl", 0] },
        specialty: 1,
        description: 1,
        status: 1,
      },
    },
    {
      $match: postCondition,
    },
  ];

  let Record = await generalService.getRecordAggregate("helpRequest", aggregateArr);

  res.send({
    status: constant.SUCCESS,
    message: "Creator Fetched successfully",
    Record: Record,
  });
});
const getLatestUser = catchAsync(async (req, res) => {
  const user = req.user;

  let condition = {
    customerId: user._id,
    status: "accept",
  };
  let userCondition = { cId: "$creatorId" };

  if (user.role === "creator") {
    userCondition = { cId: "$customerId" };
    condition = {
      creatorId: user._id,
      status: "accept",
    };
  }

  let aggregateArr = [
    {
      $match: condition,
    },
    {
      $sort: { _id: -1 },
    },
    {
      $limit: 5,
    },
    {
      $lookup: {
        from: "users",
        let: userCondition,
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$cId"] },
            },
          },
          {
            $project: {
              fullName: 1,
              email: 1,
              phoneNumber: 1,
              bodyType: 1,
            },
          },
        ],
        as: "creatorDetail",
      },
    },
    {
      $project: {
        _id: 1,
        indexNo: "$requestId",
        fullName: { $arrayElemAt: ["$creatorDetail.fullName", 0] },
        email: { $arrayElemAt: ["$creatorDetail.email", 0] },
        phoneNumber: { $arrayElemAt: ["$creatorDetail.phoneNumber", 0] },
        bodyType: { $arrayElemAt: ["$creatorDetail.bodyType", 0] },
        description: 1,
      },
    },
  ];

  let Record = await generalService.getRecordAggregate("helpRequest", aggregateArr);

  res.send({
    status: constant.SUCCESS,
    message: "Creator Fetched successfully",
    Record: Record,
  });
});

module.exports = {
  getCustomer,
  addCustomer,
  assignCreator,
  deleteCustomer,
  updateCustomer,
  helpRequest,
  getMyCreator,
  getLatestUser,
};
