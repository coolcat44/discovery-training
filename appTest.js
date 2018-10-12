/*******************************************************************************
 * Lab 2 - Discovery TESTING
 * This Node.js app:
 * - Reads in 1 row (1 test question) at a time from an input CSV file
 * - Makes a query API call to the Discovery service
 * - Writes the question and associated answers to a output CSV file
 ******************************************************************************/

var async = require('async');
var c = require('./config'); // Discovery credentials and collection info
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
var csvInputFile = path.join(__dirname, 'questions_test.csv'); // The input CSV file that contains the queries
var csvOutputFile = ''; // The output CSV file that contains queries and associated responses
var csvOutputStream = {}; // A strea to the output CSV file
var n = 10; // The number of answers to write to CSV per every query


/**
 * Read in terminal/command line arguments
 */
var choice = process.argv[2]; // This will = 0 for TEST questions and = 1 for TRAINING questions


/**
 * Parse terminal arguments
 */
if (choice == 0) {
  console.log('TESTING questions selected');
  csvOutputFile = path.join(__dirname, 'answers_test_pre_training.csv');
} else if (choice == 1) {
  console.log('TRAINING questions selected');
  csvOutputFile = path.join(__dirname, 'answers_test_post_training.csv');
} else {
  console.log('Please provide a command 1 line argument');
  console.log('Enter \'0\' for Pre-trained Testing Questions');
  console.log('Enter \'1\' for Post-training Testing Questions');
  console.log('Example command for Pre-trained Testing Questions:');
  console.log('node app.js 0');
  process.exit(1); // Stop execution
}


// Structure the content to be written to the output CSV file
// E.g., every query will be associated with 'n' number of answers
// FYI: "data" = response of Discovery Query API
function structureCsv(n, data, question, callback) {

  var output = []; // the "output" variable contains the final data, for this iteration, to be written to the output CSV file
  var passages = data.passages;

  // "passages" will be undefined if:
  // 1. no docs have been uploaded to collection or
  // 2. there are no answers to the query
  if (passages != 'undefined') {
    try {
      for (var i = 0; i < passages.length; i++) {
        // Combine "question" with responses
        var element = Object.assign({}, passages[i], {
          "question": question
        });
        output.push(element);
      }
      callback(null, output);
    } catch (error) {
      console.log(error);
      callback(error);
    }
  } else {
    var message = 'the query did not return passages. Ensure you have ingested docs into your collection.';
    callback(message);
  }
}


// Runs the app execution
function main(csvInputFile, csvOutputFile, callback) {

  var csvInputStream = fs.createReadStream(csvInputFile); // Creating a read stream (instead of reading the entire CSV file into memory) in case the inout CSV file is large
  var csvStreamWrite = {}; // Creating a writing stream to output the results to the output CSV file

  async.series([

    function(callback) {
      // Write the output CSV file headers
      var headers = ["Questions", "Doc ID", "Confidence", "Passage"];      
      try {
        csvStreamWrite = csv.createWriteStream({headers: true});
        csvOutputStream = fs.createWriteStream(csvOutputFile);
        csvStreamWrite.pipe(csvOutputStream);
        csvStreamWrite.write(headers);
        callback();
      } catch(error) {
        console.log(error);
        callback(error);
      }
    }
    , function(callback) {
      // Read the input CSV file one row at a time and perform operations

      var iteration = 0; // Keep track of number of API calls
      // The code below will iterate on each row of the inoput CSV file
      let csvStreamRead = csv
        .fromStream(csvInputStream, { headers: true })
        .on("data", function (row) {
          csvStreamRead.pause(); // Now do some work

          var output = []; // Output to be written to output CSV file
          var question = row.Question; // The natural language query
          var response = []; // Discovery service query API response

          async.series([
            
            function(callback) {
              // Make API request to Discovery for query

              // Query string parameters
              var qs = {
                "count": 20
                , "natural_language_query": question
                , "passages": true
                , "passages.count": 10
                , "version": config.version
              };

              var endpoint = config.url;
              var url = endpoint + '/v1/environments/'+config.environment_id+'/collections/'+config.collection_id+'/query'; // The query API URL
              
              var options = {
                "auth": {
                  "username": config.username
                  , "password": config.password
                }
                , "method": "GET"
                , "port": 443
                , "qs": qs
                , "url": url
              };
              
              // Make query API request
              console.log('making query API request to Discovery interation ' + iteration);
              request(options, function (err, res, body) {
                iteration++;
                if(err) {
                  console.log(err);
                  callback(err);
                }
                var responseBody = JSON.parse(res.body);
                var statusCode = res.statusCode;

                console.log('Discovery query API response status code = ' + statusCode);
                  
                // console.log('request\'s response body = ' + JSON.stringify(responseBody, null, 2));


                if (statusCode == 200 || statusCode == 201) {
                  response = responseBody;
                  callback();
                } else {
                  // var message = 'Discovery server returned status code ' + statusCode;
                  // console.log(responseBody);
                  callback(responseBody);
                }
              });
            }

            , function(callback) {
              // Format the Discovery API reponse for writting to the output CSV file

              structureCsv(n, response, question, function(err, result) {
                if (err) {
                  console.log(err);
                  callback(err);
                }
                output = result;
                console.log();
                callback();
              });
            }

            , function(callback) {
              // Write output CSV file with results from 1 query at a time

              var data = output;
              try {
                for (var i = 0; i < data.length; i++) {
                  csvStreamWrite.write([data[i].question, data[i].document_id, data[i].passage_score, data[i].passage_text]);
                }
                callback();
              } catch (error) {
                console.log(error);
                callback(error);
              }
            }
          ], function(err, result) {
            if (err) {
              console.log(err);
            }
            console.log('async operations complete for this query');
            csvStreamRead.resume(); // Resume reading of input CSV file
          });
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


main(csvInputFile, csvOutputFile, function(err, result) {
  if (err) {
    console.log(err);
  }
  console.log(result);
});


csvOutputStream.on('finish', function(){
  console.log('csv file written');
});

