const Router = require("express").Router;
const path = require("path");

const multer = require("multer");
const multerS3 = require("multer-s3");
const AWS = require("aws-sdk");

const router = new Router();
require("./utils/passport");
const { authenticate } = require("./middleware/authenticate");
const { recentActivity } = require("./middleware/recentActivity");

AWS.config.update({
  accessKeyId: process.env.AWSBUCKET_ACCESSKEYID,
  secretAccessKey: process.env.AWSBUCKET_SECRETACCESSKEY,
  region: "eu-west-2",
});

const s3 = new AWS.S3();

//====== Store a file at public storage
const uploadS3 = multer({
  storage: multerS3({
    s3: s3,
    ACL: "public-read",
    bucket: `${process.env.PUBLIC_BUCKET_NAME}/girraff`,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      cb(null, Date.now().toString() + "-" + file.originalname);
    },
  }),
});

// =================== All Controllers ===========
const authController = require("./controller/auth");
const dashboardController = require("./controller/dashBoard");
const customerController = require("./controller/customer");
const creatorController = require("./controller/creator");
const storeController = require("./controller/store");
const PSListController = require("./controller/psList");
const suggestionsController = require("./controller/suggestions");
const helpRequestController = require("./controller/helpRequest");

//==================== Validators =============================
const authValidator = require("./validation/auth");

router.post("/login", authValidator.singIn, authController.signIn);
router.post("/signUp", authValidator.signUp, authController.signUp);
router.get("/getProfile/:query", authenticate, authController.getProfile);
router.post("/changePassword", authenticate, authController.changePassword);
router.put("/upDateProfile", authenticate, authController.upDateProfile);
router.post("/forgetPassword", authController.forgetPassword);
router.post("/setNewPassword", authController.setNewPassword);

//=============================DashBoard Routes===================================
router.get("/getCardsDetail/:query", authenticate, dashboardController.getCardsDetail);
router.get("/getNotification/:query", authenticate, dashboardController.getUserNotification);
router.get("/pslYearlyAnalytics/:query", authenticate, dashboardController.pslYearlyAnalytics);
router.get("/todayPSL/:query", authenticate, dashboardController.todayPSL);
router.get("/getWeeklyOverview/:query", authenticate, dashboardController.getWeeklyOverview);
router.get("/getMonthlyCreatorAndCustomerOverview/:query", dashboardController.getMonthlyCreatorAndCustomerOverview);
router.get("/getMyDashboardCard/:query", authenticate, dashboardController.getMyDashboardCard); // Api to fetch data for customer portal card and creator portal card


//=============================Customer Routes===================================
router.get("/getCustomer/:query", authenticate, customerController.getCustomer);
router.post("/addCustomer", authenticate, customerController.addCustomer);
router.put("/updateCustomer", authenticate, customerController.updateCustomer);
router.delete("/deleteCustomer", authenticate, customerController.deleteCustomer);
router.put("/assignCreator", authenticate, customerController.assignCreator);
router.get("/getMyCreator/:query", authenticate, customerController.getMyCreator);
router.get("/getLatestUser/:query", authenticate, customerController.getLatestUser);


//=============================creator Routes===================================
router.get("/getCreator/:query", authenticate, creatorController.getCreator);
router.get("/getCustomerDetail", authenticate, creatorController.getCustomerDetail);
router.post("/addCreator", authenticate, creatorController.addCreator);
router.delete("/deleteCreator", authenticate, creatorController.deleteCreator);
router.get("/getMyCustomer/:query", authenticate, creatorController.getMyCustomer);
router.put("/addCustomerDescription", authenticate, creatorController.addCustomerDescription);
router.put("/updateCreator", authenticate, creatorController.updateCreator);
router.get("/getAllCreator/:query", authenticate, creatorController.getAllCreator);
router.put("/addCreatorNote", authenticate, creatorController.addCreatorNote);

//=============================Store Routes=============== ====================
router.post("/addStore", authenticate, storeController.addStore);
router.post("/addStoreByLink", authenticate, storeController.addStoreByLink);
router.put("/editStore", authenticate, storeController.editStore);
router.delete("/deleteStore", authenticate, storeController.deleteStore);
router.get("/getStore/:query", authenticate, storeController.getStore);
router.get("/getStoreLink/:query", authenticate, storeController.getStoreLink);

//=============================PSList Routes===================================
router.post("/addPSList",authenticate, PSListController.addList);
router.put("/editPSList",authenticate, PSListController.editList);
router.put("/updateFavorite",authenticate, PSListController.updateFavorite);
router.put("/removeFavorite",authenticate, PSListController.removeFavorite);
router.delete("/deletePSList", authenticate, PSListController.deletePSList);
router.delete("/deletePSListItem", authenticate, PSListController.deletePSListItem);
router.post("/getItemDetail", authenticate, PSListController.getItemDetail);
router.get("/getPSL/:query", authenticate, PSListController.getPSL);
router.get("/getFavoriteItem/:query", authenticate, PSListController.getFavoriteItem);
router.get("/getPSLByCreatorId/:query", authenticate, PSListController.getPSLByCreatorId);
router.get("/getPSLByCustomerId/:query", authenticate, PSListController.getPSLByCustomerId);
router.get("/getPSLById/:query", authenticate, PSListController.getPSLById);
router.post("/getItemDetailTest", PSListController.getItemDetailInsomi);
router.post("/checkDomainSetInCookies", PSListController.checkDomainSetInCookies);
router.post("/checkDomainFromCookies", PSListController.checkDomainFromCookies);

//==================================Help Requests Routes===================================
router.post("/helpRequest", authenticate, helpRequestController.helpRequest);
router.put("/changeStatus", authenticate, helpRequestController.changeStatus);

//==================================suggestion Routes===================================
router.get("/getAllSuggestions/:query", authenticate, suggestionsController.getAllSuggestions);
router.post("/addSuggestion", authenticate, suggestionsController.addSuggestion);

//======== Upload Image =========
router.post("/uploadImage", uploadS3.single("file"), function (req, res) {
  let url = req.file.location;
  console.log("===== url ====", url);
  res.send({
    status: "SUCCESS",
    message: "Image Upload",
    url,
  });
});

module.exports = router;
