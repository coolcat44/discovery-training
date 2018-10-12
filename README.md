
# Waston Discovery Training

These Node.js apps are used in "Lab 2 - Create Train Watson Discovery" from the IBM A3 "Hands on introduction to Machine Learning for Processing Unstructured Data" workshop on Oct 11, 2018.

The Lab 2 materials are available at the following link: 
https://ibm.box.com/s/g5c21cltfnp4g6lks9xzoniv1bqaddbi


## Usage

1. Create a Watson Discovery service on IBM Cloud.
2. Create a Watson Discovery collection.
3. Modify the "config.js" file with Watson Discovery service credentials and collection information
4. At the command line run "npm install" to install the Node.js apps' dependencies.

For detailed usage instructions, visit the Lab 2 materials folder at the link above.

## About

The repo contains 2 Node.js apps.

1. "appTest.js" is used to iterate through test questions in a sample CSV file and make query API calls to Watson Discovery before and after Watson Discovery training and output query results to another CSV file.

2. "appTrain.js" is used to iterate through training questions in a sample CSV file and make relevancy training API calls to Watson Discovery.


(FYI: reading and writing to the CSV files are done using streams in case the input CSV file is large and/or the content to be written to the output CSV file is large.)


## Issues

1. In appTest.js, main() finishes executing before the last line of the output CSV file is writen.
