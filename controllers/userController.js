const User = require("../models/User");
const Post = require("../models/Post");
const Follow = require("../models/Follow");
const jwt = require("jsonwebtoken");
// send grid email
const sendgrid = require("@sendgrid/mail");
sendgrid.setApiKey(process.env.SEND_GRID_KEY);

exports.apiGetPostsByUsername = async function (req, res) {
  try {
    let authorDoc = await User.findByUsername(req.params.username);
    let posts = await Post.findByAuthorId(authorDoc._id);
    res.json(posts);
  } catch {
    res.json("Sorry, invalid user requested");
  }
};

exports.apiMustBeLoggedIn = function (req, res, next) {
  try {
    req.apiUser = jwt.verify(req.body.token, process.env.JWT_SECRET);
    next();
  } catch {
    res.json("Sorry, you must provide a valid token.");
  }
};

exports.doesUsernameExist = function (req, res) {
  User.findByUsername(req.body.username)
    .then(function () {
      res.json(true);
    })
    .catch(function () {
      res.json(false);
    });
};

exports.doesEmailExist = async function (req, res) {
  let emailBool = await User.doesEmailExist(req.body.email);
  res.json(emailBool);
};

exports.sharedProfileData = async (req, res, next) => {
  let isVisitorsProfile = false;
  let isFollowing = false;
  if (req.session.user) {
    isVisitorsProfile = req.profileUser._id.equals(req.session.user._id);
    isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId);
  }

  req.isVisitorsProfile = isVisitorsProfile;
  req.isFollowing = isFollowing;
  // retrieve post, follower, and following counts
  let postCountPromise = Post.countPostsByAuthor(req.profileUser._id);
  let followerCountPromise = Follow.countFollowersById(req.profileUser._id);
  let followingCountPromise = Follow.countFollowingById(req.profileUser._id);
  let [postCount, followerCount, followingCount] = await Promise.all([postCountPromise, followerCountPromise, followingCountPromise]);

  req.postCount = postCount;
  req.followerCount = followerCount;
  req.followingCount = followingCount;

  next();
};

exports.mustBeLoggedIn = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    req.flash("errors", "You must be logged in to perform that action.");
    req.session.save(() => {
      res.redirect("/");
    });
  }
};

exports.login = (req, res) => {
  let user = new User(req.body);
  user
    .login()
    .then((result) => {
      req.session.user = { avatar: user.avatar, username: user.data.username, _id: user.data._id };
      req.session.save(() => {
        res.redirect("/");
      });
    })
    .catch((e) => {
      req.flash("errors", e);
      req.session.save(() => {
        res.redirect("/");
      });
    });
};

// API Login
exports.apiLogin = function (req, res) {
  let user = new User(req.body);
  user
    .login()
    .then(function (result) {
      // JSON WEB TOKEN
      res.json(jwt.sign({ _id: user.data._id }, process.env.JWT_SECRET, { expiresIn: "7d" }));
    })
    .catch(function (e) {
      res.json("Sorry, your values are not correct!");
    });
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};

// exports.register = function (req, res) {
//   let user = new User(req.body);
//   user
//     .register()
//     .then(() => {
//       req.session.user = { username: user.data.username, avatar: user.avatar, _id: user.data._id };
//       req.session.save(() => {
//         res.redirect("/");
//       });
//     })
//     .catch((regErrors) => {
//       regErrors.forEach((error) => {
//         req.flash("regErrors", error);
//       });
//       req.session.save(() => {
//         res.redirect("/");
//       });
//     });
// };

exports.register = function (req, res) {
  let user = new User(req.body);
  user
    .register()
    .then(() => {
      const msg = {
        to: "Raftechstack@gmail.com",
        from: "Raftechstack@gmail.com",
        subject: "Thank you for using KOMPLEXAPP, Welcome! and enjoy!!!",
        text: "Welcome!",
        html: "Welcome <strong>GREAT</strong> new User!!",
        templateId: "d-baee5e2aff9a42d88dc18627246780ff",
        dynamicTemplateData: {
          name: user.data.username.toUpperCase().bold(),
          body: user.data.username.toUpperCase().bold(),
        },
      };
      sendgrid.send(msg).then(
        () => {},
        (error) => {
          console.error(error);
          if (error.response) {
            console.error(error.response.body);
          }
        }
      );
      req.session.user = { username: user.data.username, avatar: user.avatar, _id: user.data._id };
      req.session.save(function () {
        res.redirect("/");
      });
    })
    .catch((regErrors) => {
      // res.send(user.errors);
      regErrors.forEach(function (error) {
        req.flash("regErrors", error);
      });
      req.session.save(function () {
        res.redirect("/");
      });
    });
};

exports.home = async (req, res) => {
  if (req.session.user) {
    // fetch feed of posts for current user
    let posts = await Post.getFeed(req.session.user._id);
    res.render("home-dashboard", { posts: posts });
  } else {
    res.render("home-guest", { regErrors: req.flash("regErrors") });
  }
};

exports.ifUserExists = (req, res, next) => {
  User.findByUsername(req.params.username)
    .then((userDocument) => {
      req.profileUser = userDocument;
      next();
    })
    .catch(() => {
      res.render("404");
    });
};

exports.profilePostsScreen = (req, res) => {
  // ask our post model for posts by a certain author id
  Post.findByAuthorId(req.profileUser._id)
    .then((posts) => {
      console.log(req.profileUser);
      res.render("profile", {
        title: `Profile for ${req.profileUser.username}`,
        currentPage: "posts",
        posts: posts,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        isVisitorsProfile: req.isVisitorsProfile,
        counts: { postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount },
      });
    })
    .catch(() => {
      res.render("404");
    });
};

exports.profileFollowersScreen = async (req, res) => {
  try {
    let followers = await Follow.getFollowersById(req.profileUser._id);
    res.render("profile-followers", {
      currentPage: "followers",
      followers: followers,
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorsProfile: req.isVisitorsProfile,
      counts: { postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount },
    });
  } catch {
    res.render("404");
  }
};

exports.profileFollowingScreen = async (req, res) => {
  try {
    let following = await Follow.getFollowingById(req.profileUser._id);
    res.render("profile-following", {
      currentPage: "following",
      following: following,
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorsProfile: req.isVisitorsProfile,
      counts: { postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount },
    });
  } catch {
    res.render("404");
  }
};
