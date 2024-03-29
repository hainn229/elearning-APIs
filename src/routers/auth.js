require("dotenv").config();
const express = require("express");
const router = express.Router();
const axios = require("axios");
const joi = require("joi");
const OTPGenerator = require("otp-generator");
const sendGridMail = require("@sendgrid/mail");
const { checkAuth, checkRole } = require("../middlewares/auth");
const {
  Token,
  login,
  register,
  findUserByEmail,
  findUserByGoogleId,
  updateUser,
  updatePassword,
  getInfo,
  deleteUser,
} = require("../services/users");
const UsersModel = require("../models/users");

sendGridMail.setApiKey(
  process.env.SENDGRID_MAIL_API_KEY
);

router.get("/myAccount", checkAuth(true), (req, res) => {
  res.status(200).json(req.user);
});

router.get(`/:id`, checkAuth(true), async (req, res) => {
  try {
    const info = await getInfo(req.params.id);
    if (info) {
      return res.status(200).json({
        info,
      });
    } else {
      return res.status(400).json({
        message: `Cannot get user information !`,
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const dataInput = joi.object({
      email: joi.string().email().required(),
      password: joi.string().required(),
    });

    const userInput = await dataInput.validateAsync(req.body);
    const user = await login(userInput.email, userInput.password);
    if (user) {
      return res.status(200).json({
        user: user.userInfo,
        token: user.token,
      });
    } else {
      return res.status(400).json({
        message: `The email address or password that you've entered is incorrect!`,
      });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
    // next(err);
  }
});

router.post("/register", async (req, res) => {
  try {
    const dataInput = joi
      .object({
        full_name: joi.string().required(),
        email: joi.string().email().required(),
        password: joi.string().required(),
        // date_of_birth: joi.date().required(),
        // avatarUrl: joi.string(),
      })
      .unknown();

    const userInput = await dataInput.validateAsync(req.body);
    const user = await findUserByEmail(userInput.email);
    if (user != null) {
      return res.status(400).json({
        message: "The email address is already exist!",
      });
    }
    if (userInput.err) {
      return res.status(400).json({
        message: userInput.err.message,
      });
    }

    await register(userInput);
    return res.status(200).json({
      message: `Register Successfully!`,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
});

router.post("/google", async (req, res) => {
  try {
    const response = await axios.default.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${req.body.access_token}`
    );
    if (response.data) {
      const user = await findUserByGoogleId(response.data.id);
      if (user != null) {
        const token = Token(user._id, user.email, user.role);
        return res.status(200).json({
          user: user,
          token: token,
        });
      } else {
        const newUser = new UsersModel({
          email: response.data.email,
          full_name: response.data.name,
          avatarUrl: response.data.picture,
          gender: null,
          date_of_birth: null,
          googleId: response.data.id,
          // password...
        });

        const user = await newUser.save();
        const token = Token(user._id, user.email, user.role);
        return res.status(200).json({
          user: user,
          token: token,
        });
      }
    }
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const dataInput = req.body;
    await updateUser(req.params.id, dataInput);
    return res.status(200).json({
      message: "Update information successfully!",
    });
  } catch (err) {
    return res.status(500).json({
      // message: err.message,
      message: "Update failed ! " + err.message,
    });
  }
});

router.post("/updatePassword", checkAuth(true), async (req, res) => {
  try {
    const bodySchema = joi
      .object({
        cur_password: joi.string().required("Current password is required !"),
        new_password: joi.string().required("New password is required !"),
      })
      .unknown();
    const data = await bodySchema.validateAsync(req.body);
    if (data.error) {
      res.status(400).json({ message: data.error.message });
    }
    const result = await updatePassword(
      req.body.id,
      req.body.cur_password,
      req.body.new_password
    );
    if (!result) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect !" });
    }
    return res.status(200).json({ message: "Update password successfully !" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", checkAuth(true), checkRole(true), async (req, res) => {
  try {
    await deleteUser(req.params.id);
    return res.status(200).json({
      message: "User have been deleted!",
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
});

router.post(`/forgotPassword`, async (req, res) => {
  try {
    const bodySchema = joi
      .object({
        email: joi.string().required("Email address is required!"),
      })
      .unknown();
    const validateEmail = await bodySchema.validateAsync(req.body);
    if (validateEmail.error) {
      return res.status(400).json({ message: validateEmail.error.message });
    }
    const user = await findUserByEmail(req.body.email);
    if (!user) {
      res.status(400).json({ message: "Cannot find user !" });
    } else if (user.googleId == null) {
      return res
        .status(400)
        .json({ message: "Cannot send OTP, please sign in with Google!" });
    } else {
      const new_password = OTPGenerator.generate(6, {
        upperCase: false,
        specialChars: false,
      });
      user.password = new_password;
      await user.save();
      // const msg = {
      //   to: user.email, // Change to your recipient
      //   from: "hoangpn.dev@gmail.com", // Change to your verified sender
      //   subject: "OTP verify for Reset Password on E-Learning",
      //   text: `OTP: ${new_password}`,
      // };

      const msg = {
        to: {
          email: user.email,
        },
        templateId: "d-d37401f52bd9438cbf8636c8fae78817",
        dynamicTemplateData: {
          full_name: user.full_name,
          password: new_password.toString(),
        },
        from: {
          email: "hoangpn.dev@gmail.com",
          name: "Adminstrator",
        },
      };

      sendGridMail
        .send(msg)
        .then(async () => {
          console.log("S U C C E S S F U L L Y !");
          console.log("SEND TO: " + msg.to.email);
          console.log("NEW PASSWORD: " + new_password);
          return res
            .status(200)
            .json({ message: "Please check your email to get password." });
        })
        .catch((err) => {
          console.log("in: " + err);
          return res.status(500).json({ message: err.message });
        });
    }
  } catch (error) {
    console.log("out: " + error);
    return res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;
