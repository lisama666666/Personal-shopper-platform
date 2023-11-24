const mongoose = require("mongoose");
const { Strategy: LocalStrategy } = require("passport-local");
const passport = require("passport");

passport.serializeUser((user, done) => {
  done(null, user._id);
});

// passport.deserializeUser((id, done) => {
//   const User = mongoose.model(`User`);
// User.findById(id, (err, user) => {
//   done(err, user);
// });
// });
passport.deserializeUser(async (id, done) => {
  const User = mongoose.model(`User`);
  try {
    const user = await User.findById(id).exec();
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

/**
 * Sign in using Email and Password.
 */
passport.use(
  new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
    const User = mongoose.model(`User`);

    User.findOne({ email: email.toLowerCase() })
      .then((user) => {
        if (!user) {
          return done(null, false, { msg: `Email ${email} not found.` });
        }
        user.comparePassword(password, async (err, isMatch) => {
          if (err) {
            return done(err);
          }
          if (isMatch) {
            let token = await user.generateAuthToken();
            user.token = token;
            return done(null, user);
          }
          return done(null, false, { msg: "Invalid email or password." });
        });
      })
      .catch((err) => {
        if (err) {
          return done(err);
        }
      });
  })
);
