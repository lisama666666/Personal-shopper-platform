const constant = require("../utils/constant");
const passport = require("passport");
const catchAsync = require("../utils/catchAsync");
const generalService = require("../services/generalOperation");
const _ = require("lodash");
const guid = require("guid");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { Socket } = require("../utils/socket");
const { incrementField } = require("../utils/commonFun");

const TableName = "User";
const saltRounds = 10;

const signIn = async (req, res, next) => {
  try {
    const data = req.body;

    passport.authenticate("local", (err, user, info) => {
      if (err) {
        res.status(400).send({
          status: constant.ERROR,
          message: "Connect With admin for Activation of Account",
        });
      }

      if (!user) {
        res.status(400).send({
          status: constant.ERROR,
          message: "Incorrect username or password",
        });
      }

      req.logIn(user, async (err) => {
        if (err) {
          return next(err);
        }

        if (
          user.role === "superAdmin" &&
          req.headers.origin !== process.env.SUPER_ADMIN_URL
        ) {
          res.status(400).send({
            status: constant.ERROR,
            message: "Invalid role and invalid request origin",
          });
          return;
        } else if (
          user.role === "creator" &&
          req.headers.origin !== process.env.CREATOR_PORTAL_URL
        ) {
          res.status(400).send({
            status: constant.ERROR,
            message: "Invalid role and invalid request origin",
          });
          return;
        } else if (
          user.role === "customer" &&
          req.headers.origin !== process.env.CUSTOMER_PORTAL_URL
        ) {
          res.status(400).send({
            status: constant.ERROR,
            message: "Invalid role and invalid request origin",
          });
          return;
        } 

        if (user.status === "active" && user.isDeleted === false) {
          let token = await user.generateAuthToken();
          let data = _.pick(user, ["_id", "email", "fullName", "role", "profileImageUrl"]);

          data.token = token;
          res
            .header({
              "x-auth": token,
            })
            .status(200)
            .send({
              status: constant.SUCCESS,
              message: "Success! You are logged in..",
              user: data,
            });
        } else {
          res.status(200).send({
            status: constant.ERROR,
            message: "Connect With admin for Activation of Account",
          });
        }
      });
    })(req, res, next);
  } catch (error) {
    res.status(404).send({
      status: constant.ERROR,
      message: "Connectivity error try again",
    });
  }
};

const signUp = catchAsync(async (req, res) => {
  const data = req.body;

  if (data.role === "customer") {
    const customerId = await incrementField("User", "customerId", { role: "customer" });
    data.customerId = customerId;
  } else if (data.role === "creator") {
    const creatorId = await incrementField("User", "creatorId", { role: "creator" });
    data.creatorId = creatorId;
  }

  generalService
    .addRecord(TableName, data)
    .then((result) => {
      console.log("====== result ====", result);
      user = result;
      return user.generateAuthToken();
    })
    .then(async (token) => {
      user.token = token;

      let Record = _.pick(user, ["_id", "fullName", "email", "phoneNumber", "role", "token", "profileImageUrl"]);

      Socket.emitToAdmin("updateDashboard", "");

      const creatorNotiyObj = [
        {
          type: "user",
          text: "Welcome to PSL portal.",
          createdRole: Record.role,
          createdFor: Record._id,
        },
        {
          type: "user",
          text: `New ${Record.role} signup successfully`,
          createdRole: "superAdmin",
        },
      ];

      generalService.addManyRecord("SiteActivities", creatorNotiyObj);

      res.header({ "x-auth": token }).send({
        status: constant.SUCCESS,
        message: constant.USER_REGISTER_SUCCESS,
        user: Record,
      });

      return;
    })
    .catch((e) => {
      let status = 400;
      let message = "Request Fail";
      if (e.code === 11000) {
        let name = "Email";
        if (e.keyValue && e.keyValue.phoneNumber) {
          name = "Phone Number";
        }

        message = `${name} Already Exist, Kindly contact administrator for further details`;
      }
      res.status(status).send({
        status: constant.ERROR,
        message,
      });
      return;
    });
});

const getProfile = catchAsync(async (req, res) => {
  const user = req.user;
  let aggregateArr = [
    { $match: { _id: user._id } },
    {
      $project: {
        fullName: 1,
        email: 1,
        status: 1,
        phoneNumber: 1,
        role: 1,
        profileImageUrl: 1,
      },
    },
  ];
  let Record = await generalService.getRecordAggregate(TableName, aggregateArr);
  res.send({
    status: constant.SUCCESS,
    message: "Profile record fetch successfully",
    Record: Record[0],
  });
});

const upDateProfile = catchAsync(async (req, res) => {
  const data = req.body;
  const userEmail = data.email;
  delete data.email;

  let Record = await generalService.findAndModifyRecord(TableName, { email: userEmail }, data);
  res.send({
    status: constant.SUCCESS,
    message: "Profile record upDated successfully",
    Record: Record,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const userObj = req.body;
  const user = req.user;

  const Record = await generalService.getRecord(TableName, {
    _id: user._id,
  });

  try {
    const passwordMatch = await bcrypt.compare(userObj.oldPassword, Record[0].password);

    if (passwordMatch) {
      if (Record[0].status === "active") {
        const newHashedPassword = await bcrypt.hash(userObj.password, saltRounds);
        await generalService.findAndModifyRecord(
          TableName,
          {
            _id: Record[0]._id,
          },
          {
            password: newHashedPassword,
          }
        );

        res.status(200).json({
          status: constant.SUCCESS,
          message: "Password updated successfully",
        });
      } else {
        res.status(401).json({
          status: constant.ERROR,
          message: "User is not active",
        });
      }
    } else {
      console.log("Password is incorrect");
      res.status(401).json({
        status: constant.ERROR,
        message: "Incorrect old password",
      });
    }
  } catch (error) {
    console.error("Error comparing passwords:", error);
    res.status(500).json({
      status: constant.ERROR,
      message: "Internal server error",
    });
  }
});

const forgetPassword = catchAsync(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const authToken = guid.create().value;
  let url = "";
  console.log("authToken", authToken);
  const Record = await generalService.getRecord(TableName, {
    email: email,
  });
  console.log(Record);
  if (Record.length > 0) {
    if (Record[0].status === "active") {
      await generalService.findAndModifyRecord(
        TableName,
        {
          _id: Record[0]._id,
        },
        {
          forgetPasswordAuthToken: authToken,
        }
      );

      if (Record[0].role === "superAdmin") {
        url = process.env.SUPER_ADMIN_URL + "/setNewPassword/" + authToken;
      }
      console.log("==========forget password url========", url);
      // const subjectForgotPassword = `Reset Password Email for ${process.env.PROJECT_NAME}`;
      // const sent = await sendEmail(
      //   email,
      //   subjectForgotPassword,
      //   emailTemplate.forgetPasswordEmail(url)
      // );
      const sent = "d";
      console.log("Record " + Record);
      if (sent) {
        res.status(200).send({
          status: constant.SUCCESS,
          message: constant.FORGOT_EMAIL_SENT_SUCCESS,
          Record: { token: authToken },
        });
      } else {
        res.status(500).send({
          status: constant.ERROR,
          message: constant.FORGOT_PASSWORD_EMAIL_ERROR,
        });
      }
    } else {
      res.status(500).send({
        status: constant.ERROR,
        message: constant.STATUS_BLOCK,
        showAlert: true,
      });
    }
  } else {
    res.status(200).send({
      status: constant.ERROR,
      message: constant.NO_SUCH_EMAIL,
    });
  }
});

const setNewPassword = catchAsync(async (req, res) => {
  const forgetPassAuthToken = req.body.forgetPasswordAuthToken;
  const password = req.body.password;
  const encryptPassword = await bcrypt.hash(password, saltRounds);
  const Record = await generalService.getRecord(TableName, {
    forgetPasswordAuthToken: forgetPassAuthToken,
  });
  if (Record && Record.length > 0) {
    const email = Record[0].email;

    await generalService.findAndModifyRecord(
      TableName,
      {
        _id: Record[0]._id,
      },
      {
        password: encryptPassword,
        forgetPasswordAuthToken: "",
      }
    );

    // const sent = await sendEmail(
    //   email,
    //   `Password Changed Successfully for ${process.env.PROJECT_NAME}`,
    //   emailTemplate.setNewPasswordSuccessfully()
    // );
    const sent = "t";
    if (!sent) {
      res.status(500).send({
        status: constant.ERROR,
        message: constant.PASSWORD_RESET_ERROR,
      });
    } else {
      res.status(200).send({
        status: constant.SUCCESS,
        message: constant.NEW_PASSWORD_SET_SUCCESS,
      });
    }
  } else {
    res.status(500).send({
      status: constant.SUCCESS,
      message: constant.REQUEST_EXPIRED,
    });
  }
});

module.exports = {
  signIn,
  signUp,
  getProfile,
  upDateProfile,
  changePassword,
  forgetPassword,
  setNewPassword,
};
