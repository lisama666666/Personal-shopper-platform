const constant = require("../utils/constant");
const catchAsync = require("../utils/catchAsync");
const generalService = require("../services/generalOperation");

const TableName = "Store";

const addStore = catchAsync(async (req, res) => {
  const data = req.body;
  const user = req.user;

  data.createdBy = user._id;

  const StoreRecord = await generalService.getRecord(TableName, { websiteLink: data.websiteLink });
  if (StoreRecord && StoreRecord.length > 0) {
    res.status(400).send({
      status: constant.ERROR,
      message: "Store already exit with this link",
    });
  } else {
    const creatorNotiyObj = {
      type: "store",
      text: "New Store has been created",
      createdRole: user.role,
    };

    let notificationRecord = await generalService.addRecord("SiteActivities", creatorNotiyObj);

    let Record = await generalService.addRecord(TableName, data);

    res.send({
      status: constant.SUCCESS,
      message: "Store Record Added successfully",
      Record: Record,
    });
  }
});
const addStoreByLink = catchAsync(async (req, res) => {
  const data = req.body;
  const user = req.user;

  const productLink = new URL(data.itemUrl);
  let domainUrl = "https://" + productLink.hostname?.split(".").slice(-2).join(".");

  let dataObj = {
    brandName: productLink.hostname,
    websiteLink: domainUrl,
    createdBy: user._id,
  };

  const StoreRecord = await generalService.getRecord(TableName, { websiteLink: dataObj.websiteLink });
  if (StoreRecord && StoreRecord.length > 0) {
    res.status(400).send({
      status: constant.ERROR,
      message: "Store already exit with this link",
    });
  } else {
    const creatorNotiyObj = {
      type: "store",
      text: "New Store has been created",
      createdRole: user.role,
    };

    let notificationRecord = await generalService.addRecord("SiteActivities", creatorNotiyObj);

    let Record = await generalService.addRecord(TableName, dataObj);

    res.send({
      status: constant.SUCCESS,
      message: "Store Record Added successfully",
      Record: Record,
    });
  }
});

const editStore = catchAsync(async (req, res) => {
  const data = req.body;

  let Record = await generalService.findAndModifyRecord(TableName, { _id: data._id }, data);

  res.send({
    status: constant.SUCCESS,
    message: "Store Record Updated successfully",
    Record: Record,
  });
});
const deleteStore = catchAsync(async (req, res) => {
  const data = req.body;

  let Record = await generalService.deleteRecord(TableName, { _id: data._id });

  res.send({
    status: constant.SUCCESS,
    message: "Store Record Deleted successfully",
    Record: { _id: data._id },
  });
});

const getStore = catchAsync(async (req, res) => {
  const data = JSON.parse(req.params.query);

  let condition = {};

  if (data.query && data.query !== "all") {
    condition = {
      $expr: {
        $regexMatch: {
          input: {
            $concat: ["$brandName"],
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
      $project: {
        brandName: 1,
        websiteLink: 1,
        priceKey: 1,
        pictureKey: 1,
        storeId: 1,
        createdAt: 1,
        containerKey: 1,
      },
    },
  ];

  let Record = await generalService.getRecordAggregate(TableName, aggregateArray);

  res.send({
    status: constant.SUCCESS,
    message: "Store Record fetched successfully",
    Record,
  });
});

const getStoreLink = catchAsync(async (req, res) => {
  const data = JSON.parse(req.params.query);

  let condition = {};

  if (data.query && data.query !== "all") {
    condition = {
      $expr: {
        $regexMatch: {
          input: {
            $concat: ["$brandName"],
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
      $project: {
        websiteLink: 1,
      },
    },
  ];

  let Record = await generalService.getRecordAggregate(TableName, aggregateArray);

  res.send({
    status: constant.SUCCESS,
    message: "website link fetched successfully",
    Record,
  });
});

module.exports = {
  addStore,
  editStore,
  getStore,
  deleteStore,
  getStoreLink,
  addStoreByLink
};
