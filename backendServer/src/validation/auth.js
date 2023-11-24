const joi = require("joi");
const { ERROR } = require("../utils/constant");

const singIn = async (req, res, next) => {
  const data = req.body;

  const Schema = joi.object().keys({
    email: joi.string().required(),
    password: joi.string().required(),
  });

  const { error } = await Schema.validate(data);
  if (error) {
    res.status(404).send({ status: ERROR, message: error.message });
    return;
  }
  next();
};

const signUp = async (req, res, next) => {
  const data = req.body;
  const Schema = joi.object().keys({
    fullName: joi.string().required(),
    email: joi.string().required(),
    password: joi.string().required(),
    confirmPassword: joi.string(),
    bodyType: joi.string(),
    phoneNumber: joi.string().required(),
    role: joi.string().required(),
    profileImageUrl: joi.string(),
  });
  const { error } = await Schema.validate(data);
  if (error) {
    res.status(400).send({ status: ERROR, message: error.message });
    return;
  }
  next();
};

module.exports = {
  singIn,
  signUp,
};
