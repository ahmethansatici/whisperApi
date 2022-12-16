const PORT = process.env.PORT || 8000; //for heroku deployment
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const natural = require('natural');
const aposToLexForm = require('apos-to-lex-form');
const SpellCorrector = require('spelling-corrector');

const app = express();
var tweets = [];

var Twit = require('twit')

var T = new Twit({
  consumer_key:         'mmGEVATUTM3t4y9W1i0mt9Z18',
  consumer_secret:      '5yCzmHlgGRhdN4sEX8OI5SJ5Hk0JY8SfPVb6YHzG8Uix9jcCYB',
  access_token:         '1001935482094317569-9XZgkHrpQWLlgMeGWpx34gdBOUThKz',
  access_token_secret:  'dbO1liTBMgDCgyugOoBbmGR69oz7B0VUzllGlE4LIEZDb',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL:            true,     // optional - requires SSL certificates to be valid.
})

const spellCorrector = new SpellCorrector();
spellCorrector.loadDictionary();

const analysis = (review) => {
    const lexedReview = aposToLexForm(review);
    const casedReview = lexedReview.toLowerCase();
    const alphaOnlyReview = casedReview.replace(/[^a-zA-Z\s]+/g, '');

    const { WordTokenizer } = natural;
    const tokenizer = new WordTokenizer();
    const tokenizedReview = tokenizer.tokenize(alphaOnlyReview);

    tokenizedReview.forEach((word, index) => {
        tokenizedReview[index] = spellCorrector.correct(word);
    });

    const SW = require('stopword');

    const filteredReview = SW.removeStopwords(tokenizedReview);

    const { SentimentAnalyzer, PorterStemmer } = natural;
    const analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
    const analysis = analyzer.getSentiment(filteredReview);

    return analysis;
    // res.status(200).json({ analysis });
}


app.get("/:query", (req, res) => {
    const review = req.params.query;
    T.get('search/tweets', { q: review, count: 10 }, function(err, data, response) {
        data.statuses.forEach(tweet => {
            tweets.push(tweet.text);
        });
        console.log(tweets);
        //Do sentiment analysis here
        var points = 0;
        tweets.forEach((tweet) => {
            points += analysis(tweet);
        });
        const result = points / tweets.length;
        const finalText = (result) => {
            if(result > 0) {
                return "positive";
            } else if(result === 0){
                return "neutral";
            } else {
                return "negative";
            }
        }
        const text = finalText(result);

        const folksOpinion = {
            explanation: "if > 0 then it is positive, if === 0 then it is neutral, if < 0 then it is negative.",
            searchedQuery: review,
            points: result,
            opinion: text,
        }
        res.json({ folksOpinion});      
    });
});


app.listen(PORT, () => {console.log("Server is running on PORT " + PORT)});