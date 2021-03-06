//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app= express();

app.use(express.static("public"));
app.set('view engine' , 'ejs');
app.use(bodyparser.urlencoded({
    extended: true
}));

app.use(session({
secret: "sonia",
resave: false,
saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

var url=process.env.MONGO_URL;
const options={
  useNewUrlParser:true
}
mongoose.connect(url,options);
//mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
email:String,
password:String,
googleID:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req,res){
    res.render("home");
})

app.get("/auth/google",
   passport.authenticate("google", {scope: ["profile"]}) 
);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login",function(req,res){
    res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/logout",function(req,res){
   req.logout();
   res.redirect("/"); 
})

app.get("/secrets",function(req,res){
    if(req.isAuthenticated()){
        res.render("secrets");  
    }else{
        res.redirect("/login");
    }
})

app.post("/register",function(req,res){
   User.register({username: req.body.username},
    req.body.password, function(err,user){
      if(err){
          console.log(err);
          res.redirect("/");
      } else{
          passport.authenticate("local")(req,res,function(){
              res.redirect("/secrets");
          });
      }
    });
});

app.post("/login",function(req,res){
    const user = new User({
        username:req.body.username,
        passport:req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
           passport.authenticate("local") (req,res,function(){
               res.redirect("/secrets");
           }); 
        }
    })
});



app.listen(process.env.PORT || 3000, function(){
    console.log("yay!!");
})