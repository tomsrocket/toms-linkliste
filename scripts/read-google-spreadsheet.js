"use strict";

const fs = require('fs');
const md5 = require('md5');
const readline = require('readline');
const { google } = require('googleapis');
var app = require("node-server-screenshot");
const https = require ('https')


var pageWidth = 1280;
var pageHeight = 1380; // make longer screenshots so we can cut off the silly cookiehinweis

var args = process.argv.slice(2);
let numRowsToProcess = args[0] ? args[0] : 2000;


console.log("Processing Rows:", numRowsToProcess);
console.log("Use first command line argument for number of rows");



// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'config/token.json';
let spreadsheetId = '';
let spreadsheetRange = "";

(async () => {

  try {
    // Load spreadsheet Id from config file
    fs.readFile('config/config.json', (err, content) => {
      if (err) return console.log('Error loading config file:', err);
      const config = JSON.parse(content);
      spreadsheetId = config.spreadsheetUrl;
      spreadsheetRange = config.spreadsheetRange;
      start();
    });
  } catch (err) {
    console.error("Error reading file:", err);
}

console.log("");
console.log("DONE");

})();

function start() {
  // Load client secrets from a local file.
  https.get(spreadsheetId,
    (resp) => {
      let data = '';

      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
          data += chunk;
      });

      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        console.error("File was read:");
        console.log(data);
      });

    }).on("error", (err) => {
      console.error("Error parsing file:", err);
    }
  );
}
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}


    /*
    Datum	Url	Titel	Kategorie	Note	  Schlagworte	Beschreibung
    0      1      2   3       4       5             6
    */
async function processFile(row) {
  if (row[0]) {
    const title = row[2];
    const addr = row[4];
    const keywords = row[5] ? row[5].split(", ") : [];
    const date = row[0];
    const url = row[1];
    const category = row[3];
    const desc = row[6] ? row[6] : "";
    const mdfive = md5(row[2]);
    const slug = title.toLowerCase().replace(/[^üöäßÄÖÜ\w\d]+/g, "-").replace(/^-/, "");
    const categoryString = keywords.join('", "')
    const parts = date.match(/(\d+)/g);
    const jsDate = new Date(parts[2], parts[1]-1, parts[0]);
    const isoDate = jsDate.toISOString();

    const content = `Title: ${title}
Date: ${isoDate}
Category: ${category}
Tags: "${categoryString}"
Slug: ${slug}
Cover: images/${slug}.jpg
External: ${url}

${desc}

`;

    const filename = slug + ".md"
    
    const outputFile = "../content/" + filename;
    fs.writeFile(outputFile, content, function(err) {
      if(err) {
          return console.log(err);
      }
      const filestats = fs.statSync(outputFile);
      console.log("The file was saved:", outputFile, "size:", filestats.size);
    }); 

       
    const address = url;
    var output = "../images/large/" + slug + ".png";
    
    var fileSizeInBytes = 0;
    if (fs.existsSync(output)) {
        const stats = fs.statSync(output);
        fileSizeInBytes = stats.size; 
    }
    if (fileSizeInBytes > 50) {
        
        // screenshot is alread there
        console.log("skipping", address, output);
    } else {

        // generate screenshot
        await loadPage(address, output);     
        console.log("awaited", output);   
    } 
    
  }
}

async function processFiles(err, res) {
  if (err) return console.log('The API returned an error: ' + err);
  const rows = res.data.values;
  if (rows.length) {
    rows.slice(0,numRowsToProcess).map(processFile);
  } else {
    console.log('No data found.');
  }
}


        
async function loadPage(address, output)
{
    console.log("Processing", address);
    
    return new Promise(function(resolve, reject) {
 
        app.fromURL(address, output, {
            width: pageWidth,
            height: pageHeight, 
        }, function(){
            //an image of google.com has been saved at ./test.png
            console.log("wrote " + output);
            resolve();
        });
    });
}
