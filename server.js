const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const shortid = require("shortid");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(
  process.env.DB_URI,
  { useNewUrlParser: true, useUnifiedTopology: true },
  () => {
    if (mongoose.connection.readyState) return console.log("Connected to db");
    else {
      return console.log("Error connecting!");
    }
  }
);
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

/*// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})*/

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const Schema = mongoose.Schema;
const exerciseSchema = new Schema({
  _id: { type: String, default: shortid.generate },
  description: String,
  duration: String,
  date: Date
});
const userSchema = new Schema({
  _id: { type: String, default: shortid.generate },
  username: String,
  exercises: [exerciseSchema]
});
let User = mongoose.model("User", userSchema);

app.get("/api/hello", function(req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/exercise/new-user", (req, res) => {
  let user = req.body.username;
  User.findOne({ username: user }, (err, doc) => {
    if (err) return console.log(err);
    else if (doc) {
      console.log("Entry found in db");
      res.json({ username: user, id: doc._id });
    } else {
      console.log("Entry NOT found in db, saving new");
      let dbUser = new User({ username: user });
      dbUser.save(err => {
        if (err) return console.log(err);
        res.json({ username: user, id: dbUser._id });
      });
    }
  });
});

app.get("/api/exercise/users", (req, res) => {
  User.find({}, (err, doc) => {
    if (err) return console.log(err);
    res.json({ users: doc });
  });
});

app.get("/api/exercise/log", (req, res) => {
  let id = { _id: req.query.userId };
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  User.findOne(id, (err, doc) => {
    if (err) return console.log(err);
    res.json({ id: doc._id, user: doc.username, exercises: doc.exercises, count: doc.exercises.length });
  });
});

app.post("/api/exercise/add", (req, res) => {
  let id = { _id: req.body.userId };
  if (req.body.date == "") {
    let exerciseValues = {
      exercises: {
        description: req.body.description,
        duration: req.body.duration + " mins.",
        date: Date()
      }
    };
    User.updateOne(id, { $push: exerciseValues }, (err, doc) => {
      if (err) return console.log(err);
      console.log(doc);
    });
  } else {
    let exerciseValues = {
      exercises: {
        description: req.body.description,
        duration: req.body.duration + " mins.",
        date: req.body.date
      }
    };
    User.updateOne(id, { $push: exerciseValues }, (err, doc) => {
      if (err) return console.log(err);
      console.log(doc);
    });
  }
  User.findOne({ _id: id }, (err, doc) => {
    if (err) return console.log(err);
    res.json({ id: doc._id, user: doc.username, exercises: doc.exercises });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
