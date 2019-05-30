var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path")

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");


var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({
  extended: true
}));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true
});

// Routes


app.get("/", function (req, res) {

  res.sendFile(path.join(__dirname, "./public/html/index.html"));
})

app.get("/saved", function (req, res) {

  res.sendFile(path.join(__dirname, "./public/html/saved.html"));
})

// A GET route for scraping the Austin Chronicle website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.austinchronicle.com/daily/news").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("div.blog-text").each(function (i, element) {


      var sTitle = $(element).find("a").text().trim();
      var sDescription = $(element).find(".intro-blog").text().trim();
      var sLink = $(element).find("a.article-headline-link-blog").attr("href");

      // console.log("title: ", sTitle);
      // console.log("description: ", sDescription);
      // console.log("link: ", sLink);

      var oArticle = {
        title: sTitle,
        description: sDescription,
        link: "https://www.austinchronicle.com/daily/news/" + sLink
      }

      // console.log(oArticle);

      // Create a new Article using the `result` object built from scraping
      db.Article.create(oArticle)
        .then(function (dbArticle) {
          // View the added result in the console
          // console.log(dbArticle);
          res.send("scrape complete")
        })
        .catch(function (err) {
          // If an error occurred, log it
          console.log(err);
        });
    });
  });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});
// Route for getting all Articles with value saved=true from the db
app.get("/saved/true", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({"saved":true})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
      // console.log("saved route was hit")
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.get("/api/clear", function (req, res) {

  db.Article.remove().then(function (dbEmpty) {

    // console.log("Articles have been removed")
  })



})

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({
      _id: req.params.id
    })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function (dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.put("/articles/:id", function (req, res) {
  // change boolean value of saved article
  db.Article.findOneAndUpdate({
      _id: req.params.id
    }, {
      saved: true
    })
    .then(function (saved) {

      console.log(saved.saved)
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      console.log(err)
    });
});

// Route for saving/updating an Article's associated Note
app.delete("/articles/:id", function (req, res) {
  db.Article.remove({
      _id: req.params.id
    })
    .then(function (deleted) {

      res.json(deleted);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      console.log(err)
    });
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});