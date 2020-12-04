const User = require("../model/user");
const PasswordReset = require("../model/password-reset");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const express = require("express");
const router = express.Router();
const tokenUtilities = require("../utilities/token");
const nodemailer = require("nodemailer");

router.post("/create", (req, res, next) => {
  console.log("create");
  bcrypt.hash(req.body.password, 10).then((hash) => {
    const user = new User({
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      password: hash,
      admin: req.body.admin,
    });

    user
      .save()
      .then((result) => {
        res.status(201).json({
          message: "User Created!!",
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({
          error: err,
        });
      });
  });
});

router.post("/login", (req, res, next) => {
  let loggedInUser;
  User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        return res.status(401).json({
          message: "Incorrect Email or Password",
        });
      }
      loggedInUser = user;
      return bcrypt.compare(req.body.password, user.password);
    })
    .then((result) => {
      if (!result) {
        return res.status(401).json({
          message: "Incorrect Email or Password",
        });
      }
      const authToken = tokenUtilities.generateAccessToken(
        loggedInUser._id,
        loggedInUser.name
      );

      res.status(200).json({
        name: loggedInUser.name,
        userID: loggedInUser._id,
        email: loggedInUser.email,
        admin: loggedInUser.admin,
        token: authToken,
        expiresIn: 3600,
      });
    })
    .catch((err) => {
      res.status(401).json({
        message: "Something went wrong. Please try again",
        error: err,
      });
    });
});

router.get("/:userID", (req, res, next) => {
  User.findOne({ _id: userID }, "name _id email admin")
    .then((user) => {
      res.status(200).json({
        user: user,
      });
    })
    .catch((err) => {
      res.status(401).json({
        message: "Could not get user",
        error: err,
      });
    });
});

router.post("/password-reset-request", (req, res, next) => {
  if (!req.body.email) {
    return res.status(500).json({ message: "Email is required" });
  }
  const user = User.findOne({ email: req.body.email }).then((user) => {
    if (!user) {
      return res.status(409).json({ message: "Email does not exist" });
    }

    const token = tokenUtilities.generateAccessToken(user._id, user.name);

    const passwordReset = new PasswordReset({
      _userId: user._id,
      resettoken: token,
    });

    passwordReset
      .save()
      .then((result) => {
        var transporter = nodemailer.createTransport({
          service: "Gmail",
          port: 465,
          auth: {
            user: "todo.supp@gmail.com",
            pass: "asdf1234!@",
          },
        });
        var mailOptions = {
          to: user.email,
          from: "todo.supp@gmail.com",
          subject: "To Do Password Reset",
          text:
            "You are receiving this because you (or someone else) have requested the reset of the password for your account on To Do.\n\n" +
            "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
            "http://localhost:4200/auth/new-password/" +
            passwordReset.resettoken +
            "\n\n" +
            "If you did not request this, please ignore this email and your password will remain unchanged.\n",
        };
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            return res.status(500).send({ error: err.message });
          } else {
            console.log("Email sent: " + info.response);
            res.status(200).json({
              message: "Password reset mail sent",
              resetEmail: user.email,
            });
          }
        });
      })
      .catch((err) => {
        return res.status(500).send({ error: err.message });
      });
  });
});

router.post("/valid-password-reset-token", (req, res, next) => {
  if (!req.body.resettoken) {
    return res.status(500).json({ message: "Token is required" });
  }

  PasswordReset.findOne({ resettoken: req.body.resettoken })
    .then((resetRequest) => {
      if (!resetRequest) {
        return res.status(409).json({ message: "Invalid URL" });
      }

      return User.findOne({ _id: resetRequest._userId });
    })
    .then((matchingUser) => {
      res.status(200).json({ validToken: true });
    })
    .catch((error) => {
      return res.status(500).send({ msg: error.message });
    });
});

router.post("/reset-password", (req, res, next) => {
  if (
    !req.body.resettoken ||
    !req.body.newPassword ||
    !req.body.confirmedPassword
  ) {
    return res
      .status(500)
      .json({ message: "Some parameters are missing in the request body" });
  }

  if (req.body.newPassword !== req.body.confirmedPassword) {
    return res
      .status(500)
      .json({ message: "Passwords entered is not identical. Try again" });
  }

  let userForPasswordReset;
  let passwordResetToken;

  PasswordReset.findOne({ resettoken: req.body.resettoken })
    .then((resetRequest) => {
      if (!resetRequest) {
        return res
          .status(409)
          .json({ message: "Password reset token has expired" });
      }
      passwordResetToken = resetRequest;
      return User.findOne({ _id: resetRequest._userId });
    })
    .then((matchingUser) => {
      if (!matchingUser) {
        return res
          .status(409)
          .json({ message: "Account with this email does not exist" });
      }
      userForPasswordReset = matchingUser;
      return bcrypt.hash(req.body.newPassword, 10);
    })
    .then((hash) => {
      userForPasswordReset.password = hash;
      return userForPasswordReset.save();
    })
    .then((result) => {
      passwordResetToken.remove();
      return res.status(201).json({ resetSuccess: true });
    })
    .catch((error) => {
      return res.status(500).send({ message: error.message });
    });
});

module.exports = router;
