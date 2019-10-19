var cheerio = require("cheerio");
var axios = require("axios");
var path = require("path");

var Note = require("../models/Note.js");
var Article = require("../models/Article.js");

// Export app routes
module.exports = function(app) {
  app.get("/", function(req, res) {
    Article.find({ saved: false }, function(error, data) {
      var hbsObject = {
        article: data
      };
      console.log(hbsObject);
      res.render("home", hbsObject);
    });
  });

  app.get("/saved", function(req, res) {
    Article.find({ saved: true })
      .populate("notes")
      .exec(function(error, articles) {
        var hbsObject = {
          article: articles
        };
        res.render("saved", hbsObject);
      });
  });

  // A GET request to Scrape
  app.get("/scrape", function(req, res) {
    axios.get("https://www.nytimes.com/").then(function(reponse) {
      var $ = cheerio.load(reponse.data);
      $("article").each(function(i, element) {
        var result = {};
        summary = "";
        if ($(this).find("ul").length) {
          summary = $(this)
            .find("li")
            .first()
            .text();
        } else {
          summary = $(this)
            .find("p")
            .text();
        }
        result.title = $(this)
          .find("h2")
          .text();
        result.summary = summary;
        result.link =
          "https://www.nytimes.com" +
          $(this)
            .find("a")
            .attr("href");

        var entry = new Article(result);

        entry.save(function(err, doc) {
          if (err) {
            console.log(err);
          } else {
            console.log(doc);
          }
        });
      });
      res.send("Scrape Complete");
    });
  });

  // Get all articles
  app.get("/articles", function(req, res) {
    Article.find({}, function(error, doc) {
      if (error) {
        console.log(error);
      } else {
        res.json(doc);
      }
    });
  });

  // Grab an article by it's id
  app.get("/articles/:id", function(req, res) {
    Article.findOne({ _id: req.params.id })
      .populate("note")
      .exec(function(error, data) {
        if (error) {
          console.log(error);
        } else {
          res.json(data);
        }
      });
  });

  // Save an article
  app.post("/articles/save/:id", function(req, res) {
    Article.findOneAndUpdate({ _id: req.params.id }, { saved: true }).exec(
      function(err, data) {
        if (err) {
          console.log(err);
        } else {
          res.send(data);
        }
      }
    );
  });

  // Delete an article
  app.post("/articles/delete/:id", function(req, res) {
    Article.findOneAndUpdate(
      { _id: req.params.id },
      { saved: false, notes: [] }
    ).exec(function(err, data) {
      if (err) {
        console.log(err);
      } else {
        res.send(data);
      }
    });
  });

  // Create a new note
  app.post("/notes/save/:id", function(req, res) {
    var newNote = new Note({
      body: req.body.text,
      article: req.params.id
    });
    console.log(req.body);
    newNote.save(function(error, note) {
      if (error) {
        console.log(error);
      } else {
        Article.findOneAndUpdate(
          { _id: req.params.id },
          { $push: { notes: note } }
        ).exec(function(err) {
          if (err) {
            console.log(err);
            res.send(err);
          } else {
            res.send(note);
          }
        });
      }
    });
  });

  // Delete a note
  app.delete("/notes/delete/:note_id/:article_id", function(req, res) {
    Note.findOneAndRemove({ _id: req.params.note_id }, function(err) {
      if (err) {
        console.log(err);
        res.send(err);
      } else {
        Article.findOneAndUpdate(
          { _id: req.params.article_id },
          { $pull: { notes: req.params.note_id } }
        ).exec(function(err) {
          if (err) {
            console.log(err);
            res.send(err);
          } else {
            res.send("Note Deleted");
          }
        });
      }
    });
  });
};
