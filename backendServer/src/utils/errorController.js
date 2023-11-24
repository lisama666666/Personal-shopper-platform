const constant = require("./constant");

const sendErrorDev = (err, res) => {
  console.log("====== err =====", err);
  const statusCode = err.statusCode || 500;
  if (err.code === 11000) {
    let name = "Email";
    console.log("====== error =======", err);
    if (err.keyValue && err.keyValue.name) {
      name = err.keyValue.name;
    }
    let message = `${name} already exit in system. kindly try some other.`;

    res.status(statusCode).json({
      status: constant.ERROR,
      message: message,
      stack: err.stack,
    });
  } else {
    res.status(statusCode).json({
      status: constant.ERROR,
      message: err.message,
      stack: err.stack,
    });
  }
};

const sendErrorProd = (err, res) => {
  console.log("====== error  ========", err);
  const statusCode = err.statusCode || 500;

  if (err.isOperational) {
    if (err.code === 11000) {
      let name = "Email";
      if (err.keyValue && err.keyValue.name) {
        name = err.keyValue.name;
      }
      let message = `${name} already exit in system. kindly try some other.`;

      res.status(statusCode).json({
        status: constant.ERROR,
        message: message,
        stack: err.stack,
      });
    } else {
      res.status(statusCode).json({
        status: constant.ERROR,
        message: "Something went wrong",
      });
    }
  } else {
    if (err.code === 11000) {
      let name = "Email";
      if (err.keyValue && err.keyValue.name) {
        name = err.keyValue.name;
      }
      let message = `${name} already exit in system. kindly try some other.`;

      res.status(statusCode).json({
        status: constant.ERROR,
        message: message,
        stack: err.stack,
      });
    } else {
      res.status(statusCode).json({
        status: constant.ERROR,
        message: err.message,
      });
    }
  }
};

module.exports = (err, req, res, next) => {
  if (process.env.NODE_ENV === "dev") {
    sendErrorDev(err, res);
  } else {
    sendErrorProd(err, res);
  }
};
