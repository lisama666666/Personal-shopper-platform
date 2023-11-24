const http = require("http");
const express = require("express");

require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const router = require("./src/router");
const passport = require("passport");
const session = require("express-session");
const { io } = require("./src/utils/socket");
require("./src/utils/database");
require("./src/utils/passport");

const app = express();

app.use(cors());
app.use(passport.initialize());
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.session());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true, // extended allows nested JSON objects
  })
);


app.use(router);

const server = http.createServer(app);
io.attach(server);

const PORT = process.env.PORT;
server.listen(PORT, function () {
  console.log(`Server running on *:${PORT} Process  ${process.pid} `);
});
