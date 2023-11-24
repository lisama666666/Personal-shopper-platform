const constant = require("../utils/constant");
const catchAsync = require("../utils/catchAsync");
const generalService = require("../services/generalOperation");
const { incrementField } = require("../utils/commonFun");
const TableName = "Suggestion";

const getAllSuggestions = catchAsync(async (req, res) => {
  const data = JSON.parse(req.params.query);

  let condition = {};

  if (data.query && data.query !== "all") {
    condition = {
      $expr: {
        $regexMatch: {
          input: {
            $concat: ["$brandName", { $toString: "$suggestionId" }],
          },
          regex: `.*${data.name}.*`,
          options: "i",
        },
      },
    };
  }

  const aggregateArray = [
    { $match: condition },

    {
      $lookup: {
        from: "users",
        let: { cId: "$createdBy" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$cId"] },
            },
          },
          {
            $project: {
              fullName: 1,
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
        userImage: { $arrayElemAt: ["$creatorDetail.profileImageUrl", 0] },
        brandName: 1,
        brandUrl: 1,
        description: 1,
        suggestionId: 1,
        createdBy: 1,
        createdAt: 1,
      },
    },
  ];

  const Record = await generalService.getRecordAggregate(TableName, aggregateArray);
  res.send({
    status: constant.SUCCESS,
    message: "Suggestions fetch successfully",
    Record,
  });
});

const addSuggestion = catchAsync(async (req, res) => {
  const data = req.body;
  const user = req.user;
  data.createdBy = user._id;

  const suggestionId = await incrementField(TableName, "suggestionId", {});
  data.suggestionId = suggestionId;

  const Record = await generalService.addRecord(TableName, data);

  res.send({
    status: constant.SUCCESS,
    message: "suggestion added successfully",
    Record: Record,
  });
});

module.exports = {
  addSuggestion,
  getAllSuggestions,
};
