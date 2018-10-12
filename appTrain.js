/*******************************************************************************
 * Lab 2 - Discovery TRAINING
 * This Node.js app:
 * - Reads in 2 rows (1 relevant and 1 irrelevant document IDs per training
 *   question) at a time from an input CSV file
 * - Makes an training API call to the Discovery service
 ******************************************************************************/

var async = require('async');
var c = require('./config');
var csv = require('fast-csv'); // To read and write CSV files
var fs = require('fs');
var path = require('path');
var request = require('request');


/**
 * Discovery credentials
 * Edit the file ./config.js to enter Discovery credentials and other Discovery info
 */
var config = c.discovery; // Contains Discovery service credentials as well as Environment ID and Collection ID


/**
 * Global vars
 */
var csvInputFile = path.join(__dirname, 'questions_training.csv'); // The input CSV file that contains the queries


// Runs the app execution
function main(csvInputFile, callback) {

  var csvInputStream = fs.createReadStream(csvInputFile); // Creating a read stream (instead of reading the entire CSV file into memory) in case the inout CSV file is large
  // var csvStreamWrite = {}; // Creating a writing stream to output the results to the output CSV file

  async.series([

    function(callback) {
      // Read the input CSV file 2 rows at a time and makes training API call to Discovery

      var iteration = 0; // Keep track of number of API calls
      // The code below will iterate on each row of the inoput CSV file
      var question = ''; // The natural language query
      var rows = [];

      let csvStreamRead = csv
        .fromStream(csvInputStream, { headers: true })
        .on("data", function (row) {
          csvStreamRead.pause(); // Now do some work

          console.log('iteration ' + iteration);
          
          var remainder = iteration % 2;

          if (!remainder) {
            question = row.Question;
            rows.push(row);
            iteration++;
            csvStreamRead.resume();
          } else {   
            rows.push(row);      
            var requestBody = {
              "natural_language_query": question,
              "examples": [
                {
                  "document_id": rows[0].Doc_ID
                  , "relevance": rows[0]['Relevancy Ranking (0 or 10)']
                },
                {
                  "document_id": rows[1].Doc_ID
                  , "relevance": rows[1]['Relevancy Ranking (0 or 10)']
                }
              ]
            };
            console.log('requestBody = ' + JSON.stringify(requestBody, null, 2));
      
            rows = [];
                
            // Create API request to Discovery for training
                
            // Query string parameters
            var qs = {
              "version": config.version
            };

            var endpoint = config.url;
            var url = endpoint + '/v1/environments/'+config.environment_id+'/collections/'+config.collection_id+'/training_data';

            var options = {
              "auth": {
                "username": config.username
                , "password": config.password
              }
              , "body": JSON.stringify(requestBody)
              , "method": "POST"
              , "port": 443
              , "qs": qs
              , "url": url
              , "headers": {
                "Content-Type": "application/json"
              }
            };
                        
            // Make training API request
            console.log('making training API request to Discovery interation ' + iteration);
            request(options, function (err, res, body) {
              iteration++;
              if(err) {
                console.log(err);
                callback(err);
              }
              var responseBody = JSON.parse(res.body);
              var statusCode = res.statusCode;

              console.log('Discovery training API response status code = ' + statusCode);
              console.log('request\'s response body = ' + JSON.stringify(responseBody, null, 2));

              if (statusCode == 200 || statusCode == 201) {
                csvStreamRead.resume(); // Resume reading of input CSV file
              } else {
                var message = 'Discovery server returned status code ' + statusCode;
                console.log(message);
                csvStreamRead.resume(); // Resume reading of input CSV file
              }
            });
        
          }
      
        })
        .on("end", function () {
          console.log("csv input file streaming read complete");
          callback(null);
        })
        .on("error", function (error) {
          console.log(error);
          callback(error);
        });

    }
  ], function(err, result) {
    if (err) {
      console.log(err);
      callback(err);
    }
    var message = 'all operations complete!';
    callback(null, message);
  });
}


main(csvInputFile, function(err, result) {
  if (err) {
    console.log(err);
  }
  console.log(result);
});

