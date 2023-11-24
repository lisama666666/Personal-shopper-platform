const constant = require("../utils/constant");
const catchAsync = require("../utils/catchAsync");
const generalService = require("../services/generalOperation");
const puppeteer = require("puppeteer");
const { incrementField } = require("../utils/commonFun");
const he = require("he");
const axios = require("axios");
const cheerio = require("cheerio");
const { default: mongoose } = require("mongoose");
const { Socket } = require("../utils/socket");
const _ = require("lodash");
const TableName = "PSList";

const addList = catchAsync(async (req, res) => {
  const data = req.body;
  const user = req.user;

  data.createdBy = user._id;
  const pslId = await incrementField(TableName, "pslId", {});
  data.pslId = pslId;

  const todayDate = new Date();

  const notificationData = {
    itemLength: data.listItems.length,
    todayDate,
  };

  let Record = await generalService.addRecord(TableName, data);

  const aggregateArray = [
    { $match: { _id: Record._id } },
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
            },
          },
        ],
        as: "customerDetail",
      },
    },
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
              creatorId: 1,
              fullName: 1,
            },
          },
        ],
        as: "creatorDetail",
      },
    },
    {
      $project: {
        _id: 1,
        listItems: 1,
        pslId: 1,
        listName: 1,
        noOfItems: { $size: "$listItems" },
        customerName: { $arrayElemAt: ["$customerDetail.fullName", 0] },
        customerId: { $arrayElemAt: ["$customerDetail._id", 0] },
        creatorName: { $arrayElemAt: ["$creatorDetail.fullName", 0] },
        creatorId: { $arrayElemAt: ["$creatorDetail.creatorId", 0] },

        createdAt: 1,
      },
    },
    {
      $sort: { _id: -1 },
    },
  ];

  let RecordObj = await generalService.getRecordAggregate(TableName, aggregateArray);

    await generalService.findAndModifyRecord(
      "helpRequest",
      { customerId: data.customerId, creatorId: user._id, status: "accept" },
      { creatorNote: data.creatorNote }
    );
  
  Socket.emitToCustomer("addNewPSL", Record.customerId, RecordObj[0]);
  Socket.emitToAdmin("updateDashboard", "");



  const creatorNotiyObj = [
    {
      type: "PSL",
      text: `New PSL named ${RecordObj[0].listName} is created by ${RecordObj[0].creatorName}`,
      createdRole: "customer",
      createdFor:data.customerId,
    }
  ];

  generalService.addManyRecord("SiteActivities", creatorNotiyObj);


  res.send({
    status: constant.SUCCESS,
    message: "Store Record Added successfully",
    Record: RecordObj[0],
  });
});
const editList = catchAsync(async (req, res) => {
  const data = req.body;
  const user = req.user;

  let Record = await generalService.findAndModifyRecord(TableName, { _id: data._id }, data);

  const aggregateArray = [
    { $match: { _id: Record._id } },
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
            },
          },
        ],
        as: "customerDetail",
      },
    },
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
              creatorId: 1,
              fullName: 1,
            },
          },
        ],
        as: "creatorDetail",
      },
    },
    {
      $project: {
        _id: 1,
        listItems: 1,
        pslId: 1,
        listName: 1,
        customerDetail: { $arrayElemAt: ["$customerDetail", 0] },
        noOfItems: { $size: "$listItems" },
        customerName: { $arrayElemAt: ["$customerDetail.fullName", 0] },
        customerId: { $arrayElemAt: ["$customerDetail._id", 0] },
        creatorName: { $arrayElemAt: ["$creatorDetail.fullName", 0] },
        creatorId: { $arrayElemAt: ["$creatorDetail.creatorId", 0] },
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
        createdAt: 1,
      },
    },
    {
      $sort: { _id: -1 },
    },
  ];

  let RecordObj = await generalService.getRecordAggregate(TableName, aggregateArray);

  await generalService.findAndModifyRecord(
    "helpRequest",
    { customerId: data.customerId, creatorId: user._id, status: "accept" },
    { creatorNote: data.creatorNote }
  );
  
  Socket.emitToCustomer("addNewPSL", Record.customerId, RecordObj[0]);
  Socket.emitToAdmin("updateDashboard", "");

  res.send({
    status: constant.SUCCESS,
    message: "Store Record Added successfully",
    Record: RecordObj[0],
  });
});

const deletePSList = catchAsync(async (req, res) => {
  const data = req.body;

  let Record = await generalService.deleteRecord(TableName, { _id: data._id });

  res.send({
    status: constant.SUCCESS,
    message: "PSL Record Deleted successfully",
    Record: { _id: data._id },
  });
});

const updateStoreData = catchAsync(async (req, res) => {
  const data = req.body;

  let Record = await generalService.findAndModifyRecord(TableName, { _id: data._id }, data);

  res.send({
    status: constant.SUCCESS,
    message: "Store Record Updated successfully",
    Record: Record,
  });
});

const deleteStoreData = catchAsync(async (req, res) => {
  const data = req.body;

  let Record = await generalService.deleteRecord(TableName, { _id: data._id });

  res.send({
    status: constant.SUCCESS,
    message: "Store Record Deleted successfully",
    Record: Record,
  });
});

const getStoreData = catchAsync(async (req, res) => {
  let Record = await generalService.getRecord(TableName);

  res.send({
    status: constant.SUCCESS,
    message: "Store Record fetched successfully",
    Record: Record,
  });
});

async function startBrowser() {
  let browser;
  try {
    console.log("Opening the browser......");
    browser = await puppeteer.launch({
      headless: true,
      args: ["--headless", "--disable-dev-shm-usage", "--disable-gpu", "--disable-setuid-sandbox", "--no-sandbox"],
      ignoreHTTPSErrors: true,
    });
  } catch (err) {
    console.log("Could not create a browser instance => : ", err);
  }
  return browser;
}

const startScraping = async (browser, url, containerKey, imageKey, priceKey) => {
  let newPage = await browser.newPage();
  try {
    if (newPage) {
      await newPage.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );
      await newPage.setRequestInterception(true);

      newPage.on("request", (request) => {
        if (
          request.resourceType() === "document" ||
          request.resourceType() === "script" ||
          request.resourceType() === "image"
        ) {
          request.continue();
        } else {
          request.abort();
        }
      });
      console.log(`Navigating to ${url}...`, containerKey, imageKey, priceKey);
      await newPage.goto(url, { timeout: 0 });

      const cookies = await newPage.cookies();
      await newPage.close();
      const page = await browser.newPage();
      await page.setCookie(...cookies);
      console.log(`Navigating to final ${url}...`, containerKey, imageKey, priceKey);
      await page.goto(url, { timeout: 0 });
      // console.log("=====before Click CookiesButton found =====");

      //  if (await page.$(`#continueButton`) !== null || page.$(".coi-banner__accept") !== null) {
      // console.log("===== In cookies if ======");
      //    await page.click(".coi-banner__accept");
      //    console.log("=====After Click CookiesButton found =====");
      //    // Wait for the required DOM to be rendered
      //    await page.waitForSelector(`.${containerKey}`);
      //    // Get the link to all the required books
      //    console.log("===== main div ======");
      //    let imageLink = await page.$eval(`.${imageKey}`, (img) => img.src);
      //    if (imageLink === "") {
      //      console.log("====== image Link are empty trying image srcset======");
      //      imageLink = await page.$eval(`.${imageKey}`, (img) => img.srcset);
      //    }
      //    let priceContent = await page.$eval(`.${priceKey}`, (text) => text.textContent);
      //    return { url: url, imageLink, priceContent };
      //  }

      if ((await page.$(`#continueButton`)) !== null) {
        // selector was found in the page
        console.log("===== ContinueButton found =====");
        await page.click("#continueButton");
        await page.waitForNavigation();
        console.log("=====After Click ContinueButton found =====");
        console.log("=====After Click cookies found =====");
        if (
          (await page.$(`.ui-button.ui-corner-all.ui-widget.ui-button-icon-only.ui-dialog-titlebar-close`)) !== null
        ) {
          await page.click(".ui-button.ui-corner-all.ui-widget.ui-button-icon-only.ui-dialog-titlebar-close");
          console.log("=====After Click close found =====");
          await page.goto(url, { timeout: 0 });
        }

        await page.waitForSelector(`.${containerKey}`);
        // Get the link to all the required books
        console.log("===== main div ======");
        let imageLink = await page.$eval(`.${imageKey}`, (img) => img.src);
        if (imageLink === "") {
          console.log("====== image Link are empty trying image srcset======");
          imageLink = await page.$eval(`.${imageKey}`, (img) => img.srcset);
        }
        let priceContent = await page.$eval(`.${priceKey}`, (text) => text.textContent);
        return { url: url, imageLink, priceContent };
      } else if ((await page.$(`.bx-close-xsvg`)) !== null) {
        // selector was found in the page
        console.log("===== ads button found =====");
        await page.click(".bx-close-xsvg`");
        await page.waitForNavigation();
        console.log("=====After  ads btn found =====");
        console.log("=====After Click ads found =====");
        if (
          (await page.$(`.ui-button.ui-corner-all.ui-widget.ui-button-icon-only.ui-dialog-titlebar-close`)) !== null
        ) {
          await page.click(".ui-button.ui-corner-all.ui-widget.ui-button-icon-only.ui-dialog-titlebar-close");
          console.log("=====After Click close found =====");
          await page.goto(url, { timeout: 0 });
        }

        await page.waitForSelector(`.${containerKey}`);
        // Get the link to all the required books
        console.log("===== main div ======");
        let imageLink = await page.$eval(`.${imageKey}`, (img) => img.src);
        if (imageLink === "") {
          console.log("====== image Link are empty trying image srcset======");
          imageLink = await page.$eval(`.${imageKey}`, (img) => img.srcset);
        }
        let priceContent = await page.$eval(`.${priceKey}`, (text) => text.textContent);
        return { url: url, imageLink, priceContent };
      } else {
        console.log("===== In Else ======");
        // selector not found
        if ((await page.$(`.coi-banner__accept`)) !== null) {
          console.log("===== Cookie button found ======");
          await page.click(".coi-banner__accept");
        } else if ((await page.$(`.v-mid`)) !== null) {
          console.log("===== Cookie button found ======");
          await page.click(".v-mid");
        }
        // console.log("===== close button finding ======"); delay in displaying close window
        // await page.click(".glClose");
        // console.log("===== close button found ======");

        // Wait for the required DOM to be rendered
        await page.waitForSelector(`.${containerKey}`);
        // Get the link to all the required books
        console.log("===== main div ======", `.${containerKey} .${imageKey}`);
        let imageLink = await page.$eval(`.${imageKey}`, (img) => img.src);
        console.log("====== imageLink", imageLink);
        if (imageLink === "") {
          console.log("====== image Link are empty trying image srcset======");
          imageLink = await page.$eval(`.${imageKey}`, (img) => img.srcset);
        }
        let priceContent = await page.$eval(`.${priceKey}`, (text) => text.textContent);
        await browser.close();
        return { url: url, imageLink, priceContent };
      }
    } else {
      return "ERROR";
    }
  } catch (error) {
    console.log("==== error in catch ====", error);
    browser.close();
    return "ERROR";
  }
};

const scrapingWithLink = async (url) => {
  let browser = null;
  try {
    const productLink = url;
    browser = await puppeteer.launch({
      headless: true,
      args: ["--headless", "--disable-dev-shm-usage", "--disable-gpu", "--disable-setuid-sandbox", "--no-sandbox"],
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();

    await page.setRequestInterception(true);

    // Set up a request interception handler
    page.on("request", (request) => {
      // Exclude CSS resources by URL pattern or type
      if (
        request.resourceType() === "image" ||
        request.resourceType() === "stylesheet" ||
        request.resourceType() === "script"
      ) {
        request.abort(); // Abort the request to prevent CSS from loading
      } else {
        request.continue(); // Continue loading other resources
      }
    });

    // Load the saved cookies from the file
    const fs = require("fs");
    const cookies = JSON.parse(fs.readFileSync("cookies.json", "utf8"));

    // Set the cookies in the current page
    await page.setCookie(...cookies);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
    );

    console.log("===== Opening Product Page ======");
    // Refresh the page or navigate to a specific URL to use the loaded cookies
    await page.goto(productLink, { timeout: 60000 });
    console.log("====== Waiting for body Selector =====");
    await page.waitForSelector("body");

    // Get the HTML content of the page as a string
    const htmlContent = await page.content();
    await browser.close();
    const getResult = await getResourceFromHtml(htmlContent, productLink);

    return getResult;
  } catch (error) {
    console.log("===== error ====", error);
    await browser.close();
    return "ERROR";
  }
};

const getItemDetail = catchAsync(async (req, res) => {
  const data = req.body;
  let itemUrl = data.itemUrl;
  try {
    const url = new URL(itemUrl);
    let domainUrl = url.hostname?.split(".").slice(-2).join(".");

    const getStoreRecord = await generalService.getRecord("Store", {
      $expr: {
        $regexMatch: {
          input: {
            $concat: ["$websiteLink"],
          },
          regex: `.*${domainUrl}.*`,
          options: "i",
        },
      },
    });

    if (getStoreRecord && getStoreRecord.length > 0) {
      let jsonObject = await scrapingWithLink(data.itemUrl);

      if (jsonObject === "ERROR") {
        res.send({
          status: constant.ERROR,
          message: "Some error occur while fetching data",
        });
      } else {
        res.json({
          status: constant.SUCCESS,
          Record: jsonObject,
        });
      }
    } else {
      res.send({
        status: constant.ERROR,
        message: "No. Store Found",
      });
    }
  } catch (error) {
    res.send({
      status: constant.ERROR,
      message: "Some error occur while fetching data",
    });
    console.log("===== error here====", error);
  }
});

const getPSLByCreatorId = catchAsync(async (req, res) => {
  const data = JSON.parse(req.params.query);
  console.log("====== data ===", data);
  let postCondition = {};
  if (data.query !== "all") {
    postCondition = {
      $expr: {
        $regexMatch: {
          input: "$fullName",
          regex: `.*${data.name}.*`,
          options: "i",
        },
      },
    };
  }
  const aggregateArray = [
    { $match: { createdBy: new mongoose.Types.ObjectId(data._id) } },
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
              customerId: "$_id",
              fullName: 1,
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
        customerId: { $arrayElemAt: ["$customerDetail.customerId", 0] },
      },
    },
    {
      $sort: { _id: -1 },
    },
    { $match: postCondition },
  ];
  console.log("====== aggregateArray", JSON.stringify(aggregateArray));
  let Record = await generalService.getRecordAggregate(TableName, aggregateArray);

  res.send({
    status: constant.SUCCESS,
    message: "Store Record Added successfully",
    Record: Record,
  });
});

const getPSL = catchAsync(async (req, res) => {
  const data = JSON.parse(req.params.query);
  const user = req.user;

  let condition = {};
  if (user.role === "creator") {
    condition.createdBy = user._id;
  } else {
    condition.customerId = user._id;
  }

  let postCondition = {};
  if (data.query !== "all") {
    postCondition = {
      $expr: {
        $regexMatch: {
          input: {
            $concat: ["$customerName", { $toString: "$pslId" }, "$listName"],
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
            },
          },
        ],
        as: "customerDetail",
      },
    },
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
              creatorId: 1,
              fullName: 1,
            },
          },
        ],
        as: "creatorDetail",
      },
    },
    {
      $project: {
        _id: 1,
        listItems: 1,
        pslId: 1,
        listName: 1,
        noOfItems: { $size: "$listItems" },
        countOfFavorites: {
          $size: {
            $filter: {
              input: "$listItems",
              as: "item",
              cond: { $eq: ["$$item.favorite", true] },
            },
          },
        },
        customerName: { $arrayElemAt: ["$customerDetail.fullName", 0] },
        customerId: { $arrayElemAt: ["$customerDetail._id", 0] },
        creatorName: { $arrayElemAt: ["$creatorDetail.fullName", 0] },
        creatorId: { $arrayElemAt: ["$creatorDetail.creatorId", 0] },
        createdAt: 1,
      },
    },
    { $match: postCondition },
    {
      $sort: { _id: -1 },
    },
  ];

  let Record = await generalService.getRecordAggregate(TableName, aggregateArray);

  res.send({
    status: constant.SUCCESS,
    message: "Store Record Added successfully",
    Record: Record,
  });
});
const getPSLByCustomerId = catchAsync(async (req, res) => {
  const data = JSON.parse(req.params.query);

  let condition = {};
  if (data.query !== "all") {
    condition = {
      $expr: {
        $regexMatch: {
          input: "$listName",
          regex: `.*${data.name}.*`,
          options: "i",
        },
      },
    };
  }

  condition.customerId = new mongoose.Types.ObjectId(data._id);

  const aggregateArray = [
    { $match: condition },
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
              description: 1,
            },
          },
        ],
        as: "customerDetail",
      },
    },
    {
      $project: {
        _id: 1,
        listName: 1,
        listItems: 1,
        customerDetail: { $arrayElemAt: ["$customerDetail", 0] },
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
    {
      $sort: { _id: -1 },
    },
  ];

  let Record = await generalService.getRecordAggregate(TableName, aggregateArray);
  res.send({
    status: constant.SUCCESS,
    message: "PSL List successfully",
    Record: Record,
  });
});
const getPSLById = catchAsync(async (req, res) => {
  const data = JSON.parse(req.params.query);

  let Record = await generalService.getRecord(TableName, { _id: data._id });

  res.send({
    status: constant.SUCCESS,
    message: "PSL  successfully",
    Record: Record,
  });
});

async function findSrcsetByTitle(page, productTitle) {
  try {
    console.log("===== productTitle", productTitle);

    const srcsetHandle = await page.waitForFunction(
      (title) => {
        const images = document.querySelectorAll("img");
        const matchingImages = [];

        for (const img of images) {
          const alt = img.getAttribute("alt");
          console.log("Image Alt:", alt); // Add this line for debugging
          if (alt && alt.toLowerCase().includes(title.toLowerCase())) {
            const srcsetAttribute = img.getAttribute("srcset");
            console.log("Matching Image Srcset:", srcsetAttribute); // Add this line for debugging
            if (srcsetAttribute) {
              matchingImages.push(srcsetAttribute);
            }
          }
        }

        return matchingImages.length > 0 ? matchingImages[0] : null;
      },
      { timeout: 60000 },
      productTitle
    );
    const srcset = await srcsetHandle.jsonValue();

    console.log("Matching Images:", srcset); // Add this line for debugging

    return srcset.length > 0 ? srcset[0] : null;
  } catch (error) {
    console.error("Error finding srcset:", error);
    throw error;
  }
}

const startScrapingTest = async (browser, url) => {
  let image = "";
  let price = 0;

  let page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );
  await page.setRequestInterception(true);

  page.on("request", (request) => {
    if (
      request.resourceType() === "document" ||
      request.resourceType() === "script" ||
      request.resourceType() === "image"
    ) {
      request.continue();
    } else {
      request.abort();
    }
  });
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { timeout: 0 });

  // Wait for the required DOM to be rendered
  await page.waitForSelector(`body`);
  // Get the link to all the required books

  //const classNamesToFind = "title";
  const classNamesToFind = "js-product-detail__product-name";
  const element = await page.$(`[class*="${classNamesToFind}"]`);

  if (element) {
    const textContent = await page.evaluate((el) => el.textContent, element);
    textContent.trim();
    console.log("====== textContent", textContent);

    const imageSrc = await page.evaluate((altAttributeToFind) => {
      // Find the image element with the specified alt attribute
      const image = document.querySelector(`img[alt*="${altAttributeToFind}"]`);

      if (image) {
        // Get the srcset attribute value of the image
        return image.getAttribute("srcset");
      } else {
        // Return null if the image with the alt attribute is not found
        return null;
      }
    }, textContent);
    console.log("===== imageSrc", imageSrc);
    if (imageSrc && imageSrc.length > 0) {
      //image = imageSrc.split(" ")[0];
      //console.log("==== image ====", image);
    }
    const classNamesToFindPrice = "price";
    const priceElement = await page.$(`[class*="${classNamesToFindPrice}"]`);

    if (priceElement) {
      // Extract the text content of the element
      price = await page.evaluate((el) => el.textContent, priceElement);
    }

    // let imageLink = await page.$eval(`.${imageKey}`, (img) => img.src);

    return { url: url, price, image };
  }
};
const getItemDetailInsomi = catchAsync(async (req, res) => {
  const data = req.body;

  try {
    let getStoreRecord = [1];

    if (getStoreRecord && getStoreRecord.length > 0) {
      let containerKey = data.containerKey;

      let browserInstance = await startBrowser();
      const jsonObject = await startScrapingTest(browserInstance, data.itemUrl);

      res.json({
        status: constant.SUCCESS,
        Record: jsonObject,
      });
    } else {
      res.status(400).send({
        status: constant.ERROR,
        message: "No. Store Found",
      });
    }
  } catch (error) {
    res.status(400).send({
      status: constant.ERROR,
      message: "Some error occur while fetching data. Try again.",
    });
    console.log("===== error ====", error);
  }
});

const getResourceFromHtml = async (htmlContent, link) => {
  try {
    console.log("===== htmlContent", htmlContent);
    const $ = cheerio.load(htmlContent);

    // Select all script tags with type="application/ld+json"
    const ldJsonScripts = $('script[type="application/ld+json"]');
    let dataScript = "";
    let dataFinalize = null;
    // Iterate through the selected script tags and get their content
    ldJsonScripts.each((index, element) => {
      const scriptContent = $(element).html();
      console.log("======= scriptContent", _.isArray(scriptContent), _.isString(scriptContent));

      try {
        dataScript = JSON.parse(scriptContent);
        // console.log("=== dataScript======", dataScript);
        if (_.isArray(dataScript)) {
          let product = dataScript.find((x) => x["@type"] === "Product");
          if (product) {
            dataScript = product;
          }
        } else if (dataScript["@type"] === "Product") {
          dataFinalize = dataScript;
        }
      } catch (error) {
        dataScript = scriptContent;
        dataScript = dataScript.replace(/"description": "[^"]*",\n/, "");
        dataFinalize = JSON.parse(dataScript);
      }
    });
    console.log("===dataFinalize====", dataFinalize);

    let imageUrl = "";
    if (_.isArray(dataFinalize.image)) {
      if (_.isObject(dataFinalize.image[0])) {
        imageUrl = dataFinalize.image[0].contentUrl;
      } else {
        imageUrl = dataFinalize.image[0];
      }
    } else {
      if (_.isObject(dataFinalize.image)) {
        imageUrl = dataFinalize.image.contentUrl;
      } else {
        imageUrl = dataFinalize.image;
      }
    }

    let obj = {
      url: link,
      imageLink: imageUrl,
    };

    // console.log("======== dataFinalize.offers", dataFinalize, dataFinalize.offers);
    if (_.isArray(dataFinalize.offers)) {
      obj["priceContent"] = "$" + dataFinalize.offers[0].price;
    } else {
      obj["priceContent"] = "$" + dataFinalize.offers.price;
    }

    return obj;
  } catch (error) {
    return "ERROR";
  }
};

const checkDomainSetInCookies = catchAsync(async (req, res) => {
  const data = req.body;
  let browser = null;
  try {
    const productLink = data.itemUrl;

    browser = await puppeteer.launch({
      headless: false,
      args: ["--headless", "--disable-dev-shm-usage", "--disable-gpu", "--disable-setuid-sandbox", "--no-sandbox"],
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on("request", (request) => {
      // Exclude CSS resources by URL pattern or type
      if (
        request.resourceType() === "image" ||
        request.resourceType() === "stylesheet" ||
        request.resourceType() === "script"
      ) {
        request.abort(); // Abort the request to prevent CSS from loading
      } else {
        request.continue(); // Continue loading other resources
      }
    });
    console.log("====== Open the Domain Page =======", productLink);
    // Navigate to a website and perform any actions to generate cookies
    await page.goto(productLink, { timeout: 15000 });

    // Get the current page's cookies
    const cookies = await page.cookies();

    // Save the cookies to a file
    const fs = require("fs");
    fs.writeFileSync("cookies.json", JSON.stringify(cookies, null, 2));

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
    );

    console.log("====== Waiting For body Selector Page =======");
    // Refresh the page or navigate to a specific URL to use the loaded cookies
    await page.waitForSelector("body");

    // Get the HTML content of the page as a string
    const htmlContent = await page.content();

    await browser.close();

    const getResult = await getResourceFromHtml(htmlContent, productLink);

    res.json({
      status: constant.SUCCESS,
      Record: getResult,
    });
  } catch (error) {
    await browser.close();
    res.status(400).send({
      status: constant.ERROR,
      message: "Some error occur while fetching data. Try again.",
    });
    console.log("===== error ====", error);
  }
});

const checkDomainFromCookies = catchAsync(async (req, res) => {
  const data = req.body;

  try {
    const url = data.urlLink;
    const productLink = data.productLink;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setRequestInterception(true);

    // Set up a request interception handler
    page.on("request", (request) => {
      // Exclude CSS resources by URL pattern or type
      if (
        request.resourceType() === "image" ||
        request.resourceType() === "stylesheet" ||
        request.resourceType() === "script"
      ) {
        request.abort(); // Abort the request to prevent CSS from loading
      } else {
        request.continue(); // Continue loading other resources
      }
    });

    // Load the saved cookies from the file
    const fs = require("fs");
    const cookies = JSON.parse(fs.readFileSync("cookies.json", "utf8"));

    // Set the cookies in the current page
    await page.setCookie(...cookies);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
    );

    // Refresh the page or navigate to a specific URL to use the loaded cookies
    await page.goto(productLink, { timeout: 15000 });
    await page.waitForSelector("body");

    // Get the HTML content of the page as a string
    const htmlContent = await page.content();

    await browser.close();

    const $ = cheerio.load(htmlContent);

    // Select all script tags with type="application/ld+json"
    const ldJsonScripts = $('script[type="application/ld+json"]');
    console.log("======= ldJsonScripts", ldJsonScripts);
    let dataScript = "";
    let dataFinalize = null;
    // Iterate through the selected script tags and get their content
    ldJsonScripts.each((index, element) => {
      const scriptContent = $(element).html();
      console.log("======= scriptContent", _.isArray(scriptContent), _.isString(scriptContent));

      try {
        dataScript = JSON.parse(scriptContent);
        // console.log("=== dataScript======", dataScript);
        if (_.isArray(dataScript)) {
          let product = dataScript.find((x) => x["@type"] === "Product");
          if (product) {
            dataScript = product;
          }
        } else if (dataScript["@type"] === "Product") {
          dataFinalize = dataScript;
        }
      } catch (error) {
        dataScript = scriptContent;
        dataScript = dataScript.replace(/"description": "[^"]*",\n/, "");
        dataFinalize = JSON.parse(dataScript);
      }
    });

    let imageUrl = "";
    if (_.isArray(dataFinalize.image)) {
      if (_.isObject(dataFinalize.image[0])) {
        imageUrl = dataFinalize.image[0].contentUrl;
      } else {
        imageUrl = dataFinalize.image[0];
      }
    } else {
      if (_.isObject(dataFinalize.image)) {
        imageUrl = dataFinalize.image.contentUrl;
      } else {
        imageUrl = dataFinalize.image;
      }
    }

    let obj = {
      image: imageUrl,
    };

    // console.log("======== dataFinalize.offers", dataFinalize, dataFinalize.offers);
    if (_.isArray(dataFinalize.offers)) {
      obj["price"] = dataFinalize.offers[0].price;
    } else {
      obj["price"] = dataFinalize.offers.price;
    }

    res.json({
      status: "SUCCESS",
      obj,
    });
  } catch (error) {
    res.status(400).send({
      status: constant.ERROR,
      message: "Some error occur while fetching data. Try again.",
    });
    console.log("===== error ====", error);
    await browser.close();
  }
});

const deletePSListItem = catchAsync(async (req, res) => {
  const data = req.body;

  let DeleteRecord = await generalService.findAndModifyRecord(
    TableName,
    { _id: data.pslId },
    {
      $pull: {
        listItems: { _id: data._id },
      },
    }
  );

  let Record = await generalService.getRecord(TableName, { _id: data.pslId });

  res.send({
    status: constant.SUCCESS,
    message: "PSL Record Deleted successfully",
    Record: Record,
  });
});

const updateFavorite = catchAsync(async (req, res) => {
  const data = req.body;

  let updatedRecord = await generalService.findAndModifyRecord(
    TableName,
    { _id: data.pslId, "listItems._id": data._id },
    {
      $set: {
        "listItems.$.favorite": data.status,
      },
    }
  );

  let Record = await generalService.getRecord(TableName, { _id: data.pslId });

  res.send({
    status: constant.SUCCESS,
    message: "PSL Record Deleted successfully",
    Record: Record,
  });
});

const getFavoriteItem = catchAsync(async (req, res) => {
  const data = JSON.parse(req.params.query);
  const user = req.user;

  let condition = {};

  condition.customerId = user._id;

  const aggregateArray = [
    { $match: condition },
    {
      $project: {
        _id: 1,
        listItems: 1,
      },
    },
    {
      $unwind: "$listItems",
    },
    {
      $match: {
        "listItems.favorite": true,
      },
    },
    {
      $project: {
        url: "$listItems.url",
        imageLink: "$listItems.imageLink",
        priceContent: "$listItems.priceContent",
        favorite: "$listItems.favorite",
        _id: "$listItems._id",
        pslId: "$_id",
      },
    },
  ];

  let Record = await generalService.getRecordAggregate(TableName, aggregateArray);

  res.send({
    status: constant.SUCCESS,
    message: "Store Record Added successfully",
    Record: Record,
  });
});

const removeFavorite = catchAsync(async (req, res) => {
  const data = req.body;

  let updatedRecord = await generalService.findAndModifyRecord(
    TableName,
    { _id: data.pslId, "listItems._id": data._id },
    {
      $set: {
        "listItems.$.favorite": false,
      },
    }
  );

  res.send({
    status: constant.SUCCESS,
    message: "PSL Record Deleted successfully",
    Record: { _id: data._id },
  });
});

module.exports = {
  addList,
  editList,
  deletePSList,
  getItemDetail,
  updateStoreData,
  getStoreData,
  deleteStoreData,
  getPSLByCreatorId,
  getPSLByCustomerId,
  getPSLById,
  getItemDetailInsomi,
  getPSL,
  checkDomainSetInCookies,
  checkDomainFromCookies,
  deletePSListItem,
  updateFavorite,
  getFavoriteItem,
  removeFavorite,
};
