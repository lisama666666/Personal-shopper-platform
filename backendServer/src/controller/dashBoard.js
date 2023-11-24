const constant = require("../utils/constant");
const catchAsync = require("../utils/catchAsync");
const generalService = require("../services/generalOperation");
const moment = require("moment");

const getCardsDetail = catchAsync(async (req, res) => {
  const data = JSON.parse(req.params.query);

  let aggregateArr = [
    {
      $group: {
        _id: null,
        total_customer_count: {
          $sum: { $cond: [{ $eq: ["$role", "customer"] }, 1, 0] },
        },
        total_creator_count: {
          $sum: { $cond: [{ $eq: ["$role", "creator"] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: "stores",
        pipeline: [{ $count: "total_store_count" }],
        as: "storeCount",
      },
    },
    {
      $lookup: {
        from: "pslists",
        pipeline: [{ $count: "total_PSL_count" }],
        as: "psListCount",
      },
    },
    {
      $project: {
        _id: 0,
        total_customer_count: 1,
        total_creator_count: 1,
        total_store_count: { $arrayElemAt: ["$storeCount.total_store_count", 0] },
        total_PSL_count: { $arrayElemAt: ["$psListCount.total_PSL_count", 0] },
      },
    },
  ];

  let Record = await generalService.getRecordAggregate("User", aggregateArr);

  res.send({
    status: constant.SUCCESS,
    message: "Card Details Fetched successfully",
    Record: Record[0],
  });
});

// get notification for bride and groom portal
const getUserNotification = catchAsync(async (req, res) => {
  const user = req.user;
  let condition = { createdRole: user.role };
  if (user.role !== "superAdmin") {
    condition.createdFor = user._id;
  }

  const aggregateArr = [
    {
      $match: condition,
    },
    {
      $project: {
        text: 1,
        type: 1,
        createdAt: 1,
        noOfItems: 1,
        reason:1,
      },
    },
    {
      $sort: {
        _id: -1,
      },
    },
  ];
  const Record = await generalService.getRecordAggregate("SiteActivities", aggregateArr);
  res.send({
    status: constant.SUCCESS,
    message: "Record fetch successfully",
    Record,
  });
});

const pslYearlyAnalytics = catchAsync(async (req, res) => {
  const user = req.user;
  const last12Months = [];

  let Record = [];

  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);

    last12Months.push({
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    });
  }

  let endDate = new Date(new Date(new Date()).setHours(23, 59, 59));
  let startDate = new Date(new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000).setHours(00, 00, 00));

  let condition = {};

  if (user.role === "creator") {
    condition = { createdBy: user._id };
  }

  if (user.role === "customer") {
    condition = { customerId: user._id };
  }

  let aggregateArr = [
    {
      $match: {
        ...condition,
        createdAt: {
          $gt: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $addFields: {
        created_date: {
          $dateToParts: {
            date: { $toDate: { $toLong: "$createdAt" } },
          },
        },
      },
    },

    {
      $group: {
        _id: {
          year: "$created_date.year",
          month: "$created_date.month",
        },
        totalPSL: {
          $sum: 1,
        },
      },
    },

    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        totalPSL: 1,
      },
    },
    {
      $sort: {
        date: -1,
      },
    },
  ];
  Record = await generalService.getRecordAggregate("PSList", aggregateArr);

  const monthArr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthNumberArr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  let resultArr = [
    {
      name: "",
      "Total PSL": "",
    },
  ];
  let TotalPSl = 0;
  monthNumberArr.map((Item, index) => {
    const filterRecord = Record.filter((x) => x.month === Item);
    if (filterRecord.length > 0) {
      resultArr.push({
        name: monthArr[index] + " " + filterRecord[0].year,
        "Total PSL": filterRecord[0].totalPSL,
      });
      TotalPSl = TotalPSl + parseInt(filterRecord[0].totalPSL);
    } else {
      last12Months.map((Item) => {
        if (Item.month === index + 1) {
          resultArr.push({
            name: monthArr[index] + " " + Item.year,
            "Total PSL": 0,
          });
        }
      });
    }
  });
  Record = resultArr.sort(function (a, b) {
    // Extract the year and month from the name property of each object
    const [aMonth, aYear] = a.name.split(" ");
    const [bMonth, bYear] = b.name.split(" ");
    // Compare the year first
    if (aYear < bYear) {
      return 1;
      T;
    } else if (aYear > bYear) {
      return -1;
    } else {
      if (monthArr.indexOf(aMonth) < monthArr.indexOf(bMonth)) {
        return 1;
      } else if (monthArr.indexOf(aMonth) > monthArr.indexOf(bMonth)) {
        return -1;
      } else {
        return 0;
      }
    }
  });
  Record.reverse();

  Record.push({
    name: "",
    "Total PSL": "",
  });

  res.send({
    status: constant.SUCCESS,
    message: "Record Fetch Successfully",
    Record: { graphData: Record, TotalPSL: TotalPSl },
  });
});

const getMonthlyCreatorAndCustomerOverview = catchAsync(async (req, res) => {
  let last12Months = [];

  const date = new Date();
  for (let i = 0; i < 12; i++) {
    date.setMonth(date.getMonth() - i);

    last12Months.push({
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    });
  }

  let aggregateArr = [
    {
      $project: {
        role: 1,
        createdAt: 1,
        year: { $year: "$createdAt" }, // Extract year from createdAt
        month: { $month: "$createdAt" }, // Extract month from createdAt
      },
    },
    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
        },
        total_customer_count: {
          $sum: { $cond: [{ $eq: ["$role", "customer"] }, 1, 0] },
        },
        total_creator_count: {
          $sum: { $cond: [{ $eq: ["$role", "creator"] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        total_customer_count: 1,
        total_creator_count: 1,
      },
    },
  ];

  Record = await generalService.getRecordAggregate("User", aggregateArr);

  const monthArr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthNumberArr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  let resultArr = [
    {
      name: "",
      "Total Customer": "",
      "Total Creator": "",
    },
  ];

  let TotalCreator = 0;
  let TotalCustomer = 0;

  monthNumberArr.map((Item, index) => {
    const filterRecord = Record.filter((x) => x.month === Item);

    if (filterRecord.length > 0) {
      resultArr.push({
        name: monthArr[index] + " " + filterRecord[0].year,
        "Total Creator": filterRecord[0].total_creator_count,
        "Total Customer": filterRecord[0].total_customer_count,
      });

      TotalCreator = TotalCreator + parseInt(filterRecord[0].total_creator_count);
      TotalCustomer = TotalCustomer + parseInt(filterRecord[0].total_customer_count);
    } else {
      last12Months.map((Item) => {
        if (Item.month === index + 1) {
          resultArr.push({
            name: monthArr[index] + " " + Item.year,
            "Total Creator": 0,
            "Total Customer": 0,
          });
        }
      });
    }
  });

  res.send({
    status: constant.SUCCESS,
    message: "Record Fetch Successfully",
    Record: resultArr,
  });
});

const todayPSL = catchAsync(async (req, res) => {
  const user = req.user;

  let endDate = new Date(new Date(new Date()).setHours(23, 59, 59));
  let startDate = new Date(new Date().setHours(00, 00, 00));

  let condition = {};

  if (user.role === "creator") {
    condition = { createdBy: user._id };
  }

  if (user.role === "customer") {
    condition = { customerId: user._id };
  }

  let aggregateArr = [
    {
      $match: {
        ...condition,
        createdAt: {
          $gt: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalPSL: {
          $sum: 1,
        },
      },
    },

    {
      $project: {
        _id: 0,
        totalPSL: 1,
      },
    },
    {
      $sort: {
        date: -1,
      },
    },
  ];

  Record = await generalService.getRecordAggregate("PSList", aggregateArr);

  res.send({
    status: constant.SUCCESS,
    message: "Record Fetch Successfully",
    Record: Record[0],
  });
});

const getWeeklyOverview = async (req, res) => {
  try {
    let dateArray = [];
    let startDateDefault = new Date();

    //======= weekly Dates ======

    let lastDay = moment(startDateDefault).subtract(6, "d").format("YYYY-MM-DD");
    let startDate = new Date(new Date(lastDay).setHours(00, 00, 00));
    let endDate = new Date(new Date(startDateDefault).setHours(23, 59, 59));

    for (let i = 6; i >= 0; i--) {
      let lastDay = moment(startDateDefault).subtract(i, "d").format("YYYY-MM-DD");
      dateArray.push(lastDay);
    }

    let condition = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    let aggregateArr = [
      {
        $match: condition,
      },
      {
        $addFields: {
          created_date: {
            $dateToParts: {
              date: { $toDate: { $toLong: "$createdAt" } },
            },
          },
        },
      },

      {
        $group: {
          _id: {
            year: "$created_date.year",
            month: "$created_date.month",
            day: "$created_date.day",
          },
          totalPSL: {
            $sum: 1,
          },
        },
      },

      {
        $project: {
          _id: 1,
          year: "$_id.year",
          month: "$_id.month",
          day: "$_id.day",
          totalPSL: 1,
        },
      },
      {
        $sort: {
          date: -1,
        },
      },
    ];
    Record = await generalService.getRecordAggregate("PSList", aggregateArr);

    let labels = dateArray;
    let dataSet = [];

    labels.map((Item) => {
      let dt = moment(Item).format("dddd");
      dt = dt.substring(0, 3);
      if (Record && Record.length > 0) {
        let filterItem = Record.filter((x) => {
          if (`${x.year}-${x.month < 10 ? `0${x.month}` : x.month}-${x.day < 10 ? `0${x.day}` : x.day}` === Item) {
            return Item;
          }
        });
        if (filterItem && filterItem.length > 0) {
          let obj = { name: dt, totalPSL: filterItem[0].totalPSL };
          dataSet.push(obj);
        } else {
          let obj = { name: dt, totalPSL: 0 };
          dataSet.push(obj);
        }
      } else {
        let obj = { name: dt, totalPSL: 0 };
        dataSet.push(obj);
      }
    });

    res.send({
      status: constant.SUCCESS,
      message: "Record Fetch Successfully",
      Record: dataSet,
    });
  } catch (error) {
    res.send({
      status: constant.ERROR,
      message: "Connectivity error try again",
    });
  }
};

const getMyDashboardCard = catchAsync(async (req, res) => {
  const user = req.user;

  let pslCondition = ["$$pId", "$customerId"];
  let condition = ["$$cId", "$customerId"];

  if (user.role === "creator") {
    condition = ["$$cId", "$creatorId"];
    pslCondition = ["$$pId", "$createdBy"];
  }

  let aggregateArr = [
    { $match: { _id: user._id } },

    {
      $lookup: {
        from: "helprequests",
        let: { cId: "$_id" },
        pipeline: [
          {
            $match: {
              status: { $ne: "reject" },
              $expr: { $eq: condition },
            },
          },
          {
            $project: {
              _id: 1,
            },
          },
        ],
        as: "userCount",
      },
    },
    {
      $lookup: {
        from: "pslists",
        let: { pId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: pslCondition },
            },
          },
          {
            $project: {
              _id: 1,
            },
          },
        ],
        as: "pslCount",
      },
    },

    {
      $project: {
        _id: 0,
        userCount: { $size: "$userCount" },
        pslCount: { $size: "$pslCount" },
      },
    },
  ];

  let Record = await generalService.getRecordAggregate("User", aggregateArr);

  res.send({
    status: constant.SUCCESS,
    message: "Card Details Fetched successfully",
    Record: Record[0],
  });
});

module.exports = {
  getCardsDetail,
  getUserNotification,
  pslYearlyAnalytics,
  todayPSL,
  getWeeklyOverview,
  getMonthlyCreatorAndCustomerOverview,
  getMyDashboardCard,
};
