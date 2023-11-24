const constant = require("../utils/constant");
const catchAsync = require("../utils/catchAsync");
const generalService = require("../services/generalOperation");
const mongoose = require("mongoose");
const { incrementField } = require("../utils/commonFun");
const { Socket } = require("../utils/socket");

const TableName = "helpRequest";

const helpRequest = catchAsync(async (req, res) => {
  const user = req.user;
  const data = req.body;
  data.customerId = user._id;

  const requestId = await incrementField(TableName, "requestId", {});
  data.requestId = requestId;

  let Record = await generalService.addRecord(TableName, data);
  let aggregateArr = [
    {
      $match: {
        _id: Record._id,
      },
    },
    {
      $lookup: {
        from: "users",
        let: { cId: "$customerId" },
        pipeline: [
          {
            $match: {
              role: "customer",
              $expr: { $eq: ["$$cId", "$_id"] },
            },
          },
          {
            $project: {
              fullName: 1,
              email: 1,
              bodyType: 1,
              phoneNumber: 1,
            },
          },
        ],
        as: "customerDetail",
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
              fullName: 1,
            },
          },
        ],
        as: "creatorDetail",
      },
    },
    {
      $project: {
        description: 1,
        specialty: 1,
        requestId: 1,
        fullName: { $arrayElemAt: ["$customerDetail.fullName", 0] },
        creatorName: { $arrayElemAt: ["$creatorDetail.fullName", 0] },
        email: { $arrayElemAt: ["$customerDetail.email", 0] },
        bodyType: { $arrayElemAt: ["$customerDetail.bodyType", 0] },
        phoneNumber: { $arrayElemAt: ["$customerDetail.phoneNumber", 0] },
      },
    },
  ];

  let RecordObj = await generalService.getRecordAggregate(TableName, aggregateArr);

  if (Socket) {
    Socket.emitToCreator("newRequestReceive", data.creatorId, RecordObj[0]);
  }

  const creatorNotiyObj = [
    {
      type: "user",
      text: `New Help request created by ${RecordObj[0].fullName}`,
      createdRole: "creator",
      createdFor: Record.creatorId,
    },
    {
      type: "user",
      text: `New Help request created for ${RecordObj[0].creatorName}`,
      createdRole: "customer",
      createdFor: Record.customerId,
    },
    {
      type: "user",
      text: `New help request created by ${RecordObj[0].fullName} for ${RecordObj[0].creatorName}`,
      createdRole: "superAdmin",
    },
  ];

  generalService.addManyRecord("SiteActivities", creatorNotiyObj);

  res.send({
    status: constant.SUCCESS,
    message: "request save successfully",
    Record: Record,
  });
});

const changeStatus = catchAsync(async (req, res) => {
  const user = req.user;
  const data = req.body;

  let Record = await generalService.findAndModifyRecord(TableName, { _id: data._id }, { status: data.status });
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
              fullName: 1,
              email: 1,
              phoneNumber: 1,
            },
          },
        ],
        as: "customerInfo",
      },
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
        customerName: { $arrayElemAt: ["$customerInfo.fullName", 0] },
        email: { $arrayElemAt: ["$creatorDetail.email", 0] },
        phoneNumber: { $arrayElemAt: ["$creatorDetail.phoneNumber", 0] },
        specialty: 1,
        description: 1,
        status: 1,
      },
    },
  ];
  let RecordObj = await generalService.getRecordAggregate("helpRequest", aggregateArr);
  
  if (data.status === "accept") {
    Socket.emitToCustomer("requestAccept", Record.customerId, RecordObj[0]);
  } else if (data.status === "reject") {
    const creatorNotiyObj = [
      {
        type: "reject",
        text: `${RecordObj[0].customerName} help request rejected`,
        reason: data.reason,
        createdRole: "creator",
        createdFor: Record.creatorId,
      },
      {
        type: "reject",
        text: `${RecordObj[0].fullName} reject help request`,
        reason: data.reason,
        createdRole: "customer",
        createdFor: Record.customerId,
      },
      {
        type: "reject",
        text: `${RecordObj[0].fullName} reject help request for ${RecordObj[0].customerName}`,
        reason: data.reason,
        createdRole: "superAdmin",
      },
    ];

    generalService.addManyRecord("SiteActivities", creatorNotiyObj);

    Socket.emitToCustomer("requestReject", Record.customerId, {
      _id: data._id,
      reason: data.reason,
      customerName: RecordObj[0].customerName,
      creatorName: RecordObj[0].fullName,
    });
  }

  res.send({
    status: constant.SUCCESS,
    message: "status updated successfully",
    Record: Record,
  });
});

const getNewRequest = catchAsync(async (req, res) => {
  const user = req.user;

  let aggregateArr = [
    {
      $match: {
        status: "pending",
        creatorId: user._id,
      },
    },
    {
      $lookup: {
        from: "users",
        let: { cId: "$customerId" },
        pipeline: [
          {
            $match: {
              role: "customer",
              $expr: { $eq: ["$$cId", "$_id"] },
            },
          },
          {
            $project: {
              fullName: 1,
              email: 1,
              bodyType: 1,
              phoneNumber: 1,
            },
          },
        ],
        as: "customerDetail",
      },
    },
    {
      $project: {
        description: 1,
        specialty: 1,
        requestId: 1,
        fullName: { $arrayElemAt: ["$customerDetail.fullName", 0] },
        email: { $arrayElemAt: ["$customerDetail.email", 0] },
        bodyType: { $arrayElemAt: ["$customerDetail.bodyType", 0] },
        phoneNumber: { $arrayElemAt: ["$customerDetail.phoneNumber", 0] },
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

const getExistingRequest = catchAsync(async (req, res) => {
  const user = req.user;

  let aggregateArr = [
    {
      $match: {
        requestStatus: "accept",
      },
    },
    {
      $lookup: {
        from: "users",
        let: { cId: "$customerId" },
        pipeline: [
          {
            $match: {
              role: "customer",
              $expr: { $eq: ["$$cId", "$_id"] },
            },
          },
          {
            $project: {
              fullName: 1,
              email: 1,
              bodyType: 1,
              phoneNumber: 1,
            },
          },
        ],
        as: "customerDetail",
      },
    },
    {
      $project: {
        description: 1,
        specialty: 1,
        requestId: 1,
        fullName: { $arrayElemAt: ["$customerDetail.fullName", 0] },
        email: { $arrayElemAt: ["$customerDetail.email", 0] },
        bodyType: { $arrayElemAt: ["$customerDetail.bodyType", 0] },
        phoneNumber: { $arrayElemAt: ["$customerDetail.phoneNumber", 0] },
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

module.exports = {
  helpRequest,
  changeStatus,
  getNewRequest,
  getExistingRequest,
};
