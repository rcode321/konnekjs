const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const flash = require("connect-flash");
const markdown = require("marked");
const csrf = require("csurf");
const app = express();
const sanitizeHTML = require("sanitize-html");

// we move this 2 line of code here because this way express will still be able to read incoming body request data and json data
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// API
app.use("/api", require("./router-api"));
// API

let sessionOptions = session({
  secret: "JavaScript is sooooooooo coool",
  store: new MongoStore({ client: require("./db") }),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true },
});

app.use(sessionOptions);
app.use(flash());

app.use((req, res, next) => {
  // make our markdown function available from within ejs templates
  res.locals.filterUserHTML = (content) => {
    return sanitizeHTML(markdown(content), {
      allowedTags: [
        "p",
        "br",
        "ul",
        "ol",
        "li",
        "strong",
        "bold",
        "i",
        "em",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
      ],
      allowedAttributes: {},
    });
  };

  // make all error and success flash messages available from all templates
  res.locals.errors = req.flash("errors");
  res.locals.success = req.flash("success");

  // make current user id available on the req object
  if (req.session.user) {
    req.visitorId = req.session.user._id;
  } else {
    req.visitorId = 0;
  }

  // make user session data available from within view templates
  res.locals.user = req.session.user;
  next();
});

const router = require("./router");

app.use(express.static("public"));
app.set("views", "views");
app.set("view engine", "ejs");

app.use(csrf());
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use("/", router);
app.use((err, req, res, next) => {
  if (err) {
    if (err.code == "EBADCSRFTOKEN") {
      req.flash("errors", "Cross Site Request Forgery Detected");
      req.session.save(() => res.redirect("/"));
    }
  } else {
    res.render("404");
  }
});
const server = require("http").createServer(app);
const io = require("socket.io")(server);
// Making our Express session data available from within the contex of socket.io
io.use((socket, next) => {
  sessionOptions(socket.request, socket.request.res, next);
});

io.on("connection", (socket) => {
  if (socket.request.session.user) {
    let user = socket.request.session.user;
    socket.emit("welcome", { username: user.username, avatar: user.avatar });

    socket.on("chatMessageFromBrowser", function (data) {
      socket.broadcast.emit("chatMessageFromServer", {
        message: sanitizeHTML(data.message, {
          allowedTags: [],
          allowedAttributes: {},
        }),
        username: user.username,
        avatar: user.avatar,
      });
      console.log(data.message);
    });
  }
});

module.exports = server;
