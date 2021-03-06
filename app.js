//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const date = require(__dirname+"/date.js");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const {body, checkSchema, validationResult} = require("express-validator");
const findOrCreate = require("mongoose-find-or-create");
let alert = require('alert');


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
  secret : "Our little secret.",
  resave : false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
// coonnecting to database
mongoose.connect("mongodb+srv://Devangjoshi1210:Devang12345@atlascluster.kmp6b.mongodb.net/blogDBv2");


const registrationSchema = {
  password: {
       isStrongPassword: {
           minLength: 8,
           minLowercase: 1,
           minUppercase: 1,
           minNumbers: 1
       },
       errorMessage: "Password must be greater than 8 and contain at least one uppercase letter, one lowercase letter, and one number",
   }
}
const userSchema = new mongoose.Schema({

  email: {
    type: String,
    unique: true,
    index:true,
    sparse:true
  },
  username: {
    type: String,

     unique: true,
     index:true,
     sparse:true
  },
  password: {
       type: String
     },
     googleId:String

});
const postSchema = new mongoose.Schema({
  date :  String,
  author : String,
  title:String,
  content:String,
  id : String
});
const contactSchema = new mongoose.Schema({

  name : String,
  email:String,
  subject:String,
  message : String,
  id : String
});
//creating model


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);
const Post = mongoose.model("Post", postSchema);
const Contact = mongoose.model("Contact", contactSchema);

const LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy(User.authenticate()));

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done) {
  done(null,user.id);
});

passport.deserializeUser(function(id, done) {
User.findById(id,function(err,user){
  done(err,user);
})
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home",
    userProfileUrl: "https://googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));






app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

  app.get("/auth/google/home",
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/home");
    });

    app.get("/",function(req,res){
       res.render("landingPage");

    })
    app.get("/home",function(req,res){

      if(req.isAuthenticated()){

        Post.find({}, function(err, posts){

           res.render("home", {

             startingContent: req.user.username,

             posts: posts,
             userId:req.user.id

             });

         })
      }else{
        res.render("landingPage");
      }

    })
app.get("/about",function(req,res){
  res.render("about");

})
app.get("/contact",function(req,res){
  res.render("contact");
})
app.post("/home",function(req,res){
  res.render("compose");
})

app.get("/compose",function(req,res){
  res.render("compose");
})
app.get("/register",function(req,res){
  res.render("register");
})
app.get("/login",function(req,res){
  res.render("login");
})
app.get("/logout",function(req,res,next){
  req.logout(function(err) {
     if (err) { return next(err); }
       res.render("landingPage");
   });

})
app.post("/edit",function(req,res){
    const postId = req.body.postId;
    Post.findOne({_id: postId}, function(err, post){

   res.render("edit", {
     displayName:post.author,
     postTitle: post.title,
     postBody: post.content,
     postId:postId

   });

 });
})
app.post("/update",function(req,res){

  Post.findOneAndUpdate({_id: req.body.postId}, {$set:{author:req.body.displayName,content:req.body.postBody,title:req.body.postTitle}}, function(err, post){

   res.redirect("/home");

});
})
app.post("/register", checkSchema(registrationSchema),function(req,res){
     const errors = validationResult(req);
     if (!errors.isEmpty()) {
       alert("Password must be greater than 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.");
       res.redirect("/register");
   }else{
     const user = new User({
       username : req.body.username,
       email:req.body.email
     });
     User.register(user,req.body.password,function(err,user){
       if(err){

         alert("A user with given username or Email already exist");
         res.redirect("/register");
       }else{

         passport.authenticate("local")(req,res,function(){
                   res.redirect("/home");
         })

       }
     })
   }                  // comes from passportLocalMongoose
});

app.post("/login", function(req,res){

  if(!req.body.username){
           alert( "Username was not given");
          res.redirect("/login");
  }else{
    if(!req.body.password){
           alert( "Password was not given");
           res.redirect("/login");
        }
        else{
        passport.authenticate("local", (err, user, info) => {
        if (err) throw err;
        if (!user) {

         alert("The username and/or password you specified are not correct.")
         res.redirect("/login");
        }
       else {
       req.logIn(user, (err) => {
       if (err) console.log(err);
       res.redirect("/home");
  });
}
})(req, res);

    }
      }
    });





app.post("/compose",function(req,res){
   if(req.isAuthenticated()){
   var d= date.getDate();
   const post = new Post({
      date : d,
      author : req.body.displayName,
      title: req.body.postTitle,
      content  : req.body.postBody,
      id : req.user.id
   });

   post.save(function(err){

   if (!err){

     res.redirect("/home");

   }

 });
}else{
  res.render("landingPage");
}



})
app.get("/posts/:postId", function(req,res){ // express routing parameters
      const requestedPostId = req.params.postId;
      Post.findOne({_id: requestedPostId}, function(err, post){

     res.render("post", {
       author:post.author,
       date: post.date,
       title: post.title,

       content: post.content

     });

   });


})

app.post("/delete",function(req,res){
  var postId = req.body.postId;
 Post.findOneAndRemove({_id:postId},function(err){
   if(!err)
   {
     res.redirect("home");
   }
 })

})
app.post("/contactSubmit",function(req,res){
         const contact  = new Contact({

           name:req.body.name,
           email:req.body.email,
           message:req.body.message,
           subject:req.body.subject
         })
         contact.save();
         alert("Thanks for contacting us, We will get back to you soon!")
         res.redirect("/home");
})

app.listen(process.env.PORT||3000, function() {
  console.log("Server started on port 3000");
});
