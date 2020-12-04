const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");
const userRoutes = require("./backend/routes/user");
const cors = require("cors");
const passport = require("passport");

swaggerDocument = require("./swagger.json");

mongoose.set("useCreateIndex", true);
mongoose.set("useNewUrlParser", true);
mongoose.set("useUnifiedTopology", true);

mongoose
  .connect(
    "mongodb+srv://Muku_27:" +
      process.env.MONGODB_ATLAS_PWD +
      "@cluster0.isjwc.mongodb.net/scheduler?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("Connected to Mongo Database");
  })
  .catch(() => {
    console.log("Could not connect Mongo Database");
  });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );

  next();
});

app.options("*", cors());

require("./backend/authentication/jwt");
app.use(passport.initialize());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/user", userRoutes);
app.use("/", (req, res, next) => {
  res.send(
    "Success !!. You have reached the right place. You can discover all the routes here : localhost:3000/api-docs"
  );
});
module.exports = app;
