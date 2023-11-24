const constant = require("../utils/constant");
const catchAsync = require("../utils/catchAsync");
const generalService = require("../services/generalOperation");
const { incrementField } = require("../utils/commonFun");
const mongoose = require("mongoose");
const { object } = require("joi");
const TableName = "User";

const getCreator = catchAsync(async (req, res) => {
  const data = JSON.parse(req.params.query);
  let condition = { role: "creator" };
  if (data.query !== "all") {
    condition = {
      role: "creator",
      $expr: {
        $regexMatch: {
          input: {
            $concat: ["$fullName", { $toString: "$creatorId" }, "$email"],
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
              $expr: { $eq: ["$$cId", "$creatorId"] },
              status: "accept",
            },
          },
          {
            $lookup: {
              from: "users",
              let: { cId: "$customerId" },
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
              as: "customerDetail",
            },
          },
          {
            $project: {
              _id: 1,
              fullName: { $arrayElemAt: ["$customerDetail.fullName", 0] },
              email: { $arrayElemAt: ["$customerDetail.email", 0] },
            },
          },
        ],
        as: "customerDetail",
      },
    },
    {
      $lookup: {
        from: "pslists",
        let: { cId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$$cId", "$createdBy"] },
            },
          },
          {
            $project: {
              _id: 1,
            },
          },
        ],
        as: "pslInfo",
      },
    },
    {
      $project: {
        fullName: 1,
        email: 1,
        lastLogin: 1,
        lastActivity: 1,
        status: 1,
        phoneNumber: 1,
        role: 1,
        creatorId: 1,
        customerDetail: 1,
        customerCount: { $size: { $ifNull: ["$customerDetail", []] } },
        pslInfo: { $size: { $ifNull: ["$pslInfo", []] } },
      },
    },
  ];

  let Record = await generalService.getRecordAggregate(TableName, aggregateArr);

  res.send({
    status: constant.SUCCESS,
    message: "Creator Fetched successfully",
    Record: Record,
  });
});

const getCustomerDetail = catchAsync(async (req, res) => {
  let aggregateArr = [
    {
      $match: { role: "customer" },
    },
    {
      $project: {
        fullName: 1,
        email: 1,
        status: 1,
        phoneNumber: 1,
        role: 1,
        creatorId: 1,
      },
    },
  ];

  let Record = await generalService.getRecordAggregate(TableName, aggregateArr);

  res.send({
    status: constant.SUCCESS,
    message: "customer Detail fetch successfully",
    Record: Record,
  });
});

const addCreator = catchAsync(async (req, res) => {
  const data = req.body;
  data.role = "creator";
  const customerId = await incrementField("User", "creatorId", { role: "creator" });
  data.creatorId = customerId;

  const creatorNotiyObj = {
    type: "creator",
    text: "New creator has been created",
  };

  let notificationRecord = generalService.addRecord("SiteActivities", creatorNotiyObj);

  let Record = await generalService.addRecord(TableName, data);

  res.send({
    status: constant.SUCCESS,
    message: "Creator Added successfully",
    Record: Record,
  });
});

const addCustomerDescription = catchAsync(async (req, res) => {
  const data = req.body;

  const Record = await generalService.findAndModifyRecord(
    TableName,
    { _id: data._id },
    { description: data.description }
  );

  res.send({
    status: constant.SUCCESS,
    message: "Description Added successfully",
    Record: Record,
  });
});

const getMyCustomer = catchAsync(async (req, res) => {
  const user = req.user;
  const data = JSON.parse(req.params.query);

  let condition = {
    creatorId: user._id,
    status: "accept",
  };

  if (data.status && data.status !== "") {
    condition.status = data.status;
  }

  let postCondition = {};

  if (data.query !== "all") {
    postCondition = {
      $expr: {
        $regexMatch: {
          input: {
            $concat: ["$fullName", { $toString: "$requestId" }, "$email", "$phoneNumber"],
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
        let: { cId: "$customerId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$cId"] },
            },
          },
          {
            $project: {
              _id: 1,
              customerId: 1,
              fullName: 1,
              profileImageUrl: 1,
              email: 1,
              phoneNumber: 1,
              bodyType: 1,
            },
          },
        ],
        as: "customerDetail",
      },
    },
    {
      $project: {
        _id: 1,
        fullName: { $arrayElemAt: ["$customerDetail.fullName", 0] },
        cusId: { $arrayElemAt: ["$customerDetail._id", 0] },
        customerId: { $arrayElemAt: ["$customerDetail.customerId", 0] },
        email: { $arrayElemAt: ["$customerDetail.email", 0] },
        profileImageUrl: { $arrayElemAt: ["$customerDetail.profileImageUrl", 0] },
        phoneNumber: { $arrayElemAt: ["$customerDetail.phoneNumber", 0] },
        bodyType: { $arrayElemAt: ["$customerDetail.bodyType", 0] },
        specialty: 1,
        description: 1,
        creatorNote: 1,
        requestId: 1,
        createdAt: 1,
      },
    },
    { $match: postCondition },
  ];

  let Record = await generalService.getRecordAggregate("helpRequest", aggregateArr);

  res.send({
    status: constant.SUCCESS,
    message: "Creator Fetched successfully",
    Record: Record,
  });
});

const deleteCreator = catchAsync(async (req, res) => {
  const data = req.body;
  const user = req.user;
  //===== Assign admin to all PSL created by this creator
  const deletePSLRecord = await generalService.findAndModifyRecord("PSList", { createdBy: user._id });

  //======= Deleting Customer information
  const creator = await generalService.deleteRecord("User", { _id: data._id });

  res.send({
    status: constant.SUCCESS,
    message: "creator record deleted successfully",
    Record: { _id: data._id },
  });
});

const updateCreator = catchAsync(async (req, res) => {
  const data = req.body;

  let Record = await generalService.findAndModifyRecord(TableName, { _id: data._id }, { status: data.status });
  res.send({
    status: constant.SUCCESS,
    message: "creator record added successfully",
    Record: Record,
  });
});

const getAllCreator = catchAsync(async (req, res) => {
  const user = req.user;
  const data = JSON.parse(req.params.query);

  const getCustomerExistingCreator = await generalService.getRecord("helpRequest", {
    customerId: user._id,
    status: { $ne: "reject" },
  });
  let exitingCreators = [];
  if (getCustomerExistingCreator && getCustomerExistingCreator.length > 0) {
    getCustomerExistingCreator.map((Item) => {
      exitingCreators.push(Item.creatorId);
    });
  }

  let condition = { role: "creator", _id: { $nin: exitingCreators } };

  if (data.query !== "all") {
    condition = {
      ...condition,
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
      $project: {
        fullName: 1,
        email: 1,
        phoneNumber: 1,
        profileImageUrl: 1,
      },
    },
  ];

  let Record = await generalService.getRecordAggregate(TableName, aggregateArr);

  res.send({
    status: constant.SUCCESS,
    message: "Creator Fetched successfully",
    Record: Record,
  });
});

const addCreatorNote = catchAsync(async (req, res) => {
  const data = req.body;

  let Record = await generalService.findAndModifyRecord(
    "helpRequest",
    { _id: data._id },
    { creatorNote: data.creatorNote }
  );

  let aggregateArr = [
    {
      $match: { _id: Record._id },
    },
    {
      $lookup: {
        from: "users",
        let: { cId: "$customerId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$cId"] },
            },
          },
          {
            $project: {
              _id: 1,
              customerId: 1,
              fullName: 1,

              email: 1,
              phoneNumber: 1,
              bodyType: 1,
            },
          },
        ],
        as: "customerDetail",
      },
    },
    {
      $project: {
        _id: 1,
        fullName: { $arrayElemAt: ["$customerDetail.fullName", 0] },
        cusId: { $arrayElemAt: ["$customerDetail._id", 0] },
        customerId: { $arrayElemAt: ["$customerDetail.customerId", 0] },
        email: { $arrayElemAt: ["$customerDetail.email", 0] },
        phoneNumber: { $arrayElemAt: ["$customerDetail.phoneNumber", 0] },
        bodyType: { $arrayElemAt: ["$customerDetail.bodyType", 0] },
        specialty: 1,
        description: 1,
        creatorNote: 1,
        requestId: 1,
        createdAt: 1,
      },
    },
  ];

  let RecordObj = await generalService.getRecordAggregate("helpRequest", aggregateArr);

  res.send({
    status: constant.SUCCESS,
    message: "Creator Added successfully",
    Record: RecordObj[0],
  });
});

module.exports = {
  getCustomerDetail,
  getCreator,
  addCreator,
  getMyCustomer,
  addCustomerDescription,
  deleteCreator,
  updateCreator,
  getAllCreator,
  addCreatorNote,
};
