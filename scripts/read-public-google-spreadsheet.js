"use strict";

const fs = require('fs');
const md5 = require('md5');
const http = require('http');
const https = require('https');
const sharp = require('sharp'); // resize images
const puppeteer = require("puppeteer"); // take screenshots

const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);




// PREFERENCES / SETTINGS

// screenshots
const pageWidth = 1280;
const pageHeight = 1380;

// preview images
const thumbnailWidth = 350;
const thumbnailheight = 350;
const jpgQuality = 65;





var args = process.argv.slice(2);
let numRowsToProcess = args[0] ? args[0] : 5;

console.log("Processing Rows:", numRowsToProcess);
console.log("Use first command line argument for number of rows");


// Fetch only the configured endpoint; do not forward credentials through redirects.
async function loadTriliumSpreadsheet(config) {
    for (const key of ['triliumApiUrl', 'triliumNoteId', 'triliumApiToken']) {
        if (typeof config[key] !== 'string' || !config[key].trim()) {
            throw new Error(`Missing config value: ${key}`);
        }
    }
    const base = new URL(config.triliumApiUrl);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
        throw new Error('Invalid Trilium API URL');
    }
    base.pathname = base.pathname.replace(/\/$/, '') + '/';
    const url = new URL(`notes/${encodeURIComponent(config.triliumNoteId)}/content`, base);
    const headers = { Authorization: config.triliumApiToken };
    if (config.basicAuthUsername || config.basicAuthPassword) {
        if (!config.basicAuthUsername || !config.basicAuthPassword) {
            throw new Error('Both Basic Auth config values are required');
        }
        headers.Authorization = 'Basic ' + Buffer.from(
            `${config.basicAuthUsername}:${config.basicAuthPassword}`
        ).toString('base64');
        headers['X-Trilium-Token'] = config.triliumApiToken;
    }

    const data = await new Promise((resolve, reject) => {
        const lib = url.protocol === 'https:' ? https : http;
        const req = lib.get(url, { headers, timeout: 30000 }, res => {
            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error(`Trilium request failed: HTTP ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('error', () => reject(new Error('Trilium response interrupted')));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        req.on('timeout', () => req.destroy(new Error('Request timeout')));
        req.on('error', err => reject(new Error(`Trilium request failed: ${err.code || 'network error or timeout'}`)));
    });
    let spreadsheet;
    try {
        spreadsheet = JSON.parse(data);
    } catch {
        throw new Error('Trilium returned invalid JSON');
    }
    return spreadsheetRows(spreadsheet);
}

// Trilium 0.105 stores a Univer workbook inside a versioned wrapper.
function spreadsheetRows(spreadsheet) {
    if (spreadsheet.version !== 1 || !spreadsheet.workbook?.sheets) {
        throw new Error('Unsupported Trilium spreadsheet format');
    }
    const sheets = Object.values(spreadsheet.workbook.sheets)
        .filter(sheet => sheet.name === 'Linkliste');
    if (sheets.length !== 1 || !sheets[0].cellData) {
        throw new Error('Expected exactly one spreadsheet sheet named Linkliste');
    }
    const cells = sheets[0].cellData;
    const rowIndexes = Object.keys(cells).map(Number).filter(Number.isInteger);
    const lastRow = Math.max(-1, ...rowIndexes);
    const firstRow = rowIndexes.length ? Math.min(...rowIndexes) : 0;
    return Array.from({ length: lastRow - firstRow + 1 }, (_, offset) => {
        const rowIndex = firstRow + offset;
        return Array.from({ length: 7 }, (_, column) => {
            const cell = cells[rowIndex]?.[column];
            if (!cell) return '';
            if (column === 0 && typeof cell.v === 'number') {
                // Spreadsheet dates count days from 1899-12-30.
                const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(cell.v) * 86400000);
                if (Number.isNaN(date.getTime())) throw new Error(`Invalid date in row ${rowIndex + 1}`);
                return `${date.getUTCDate()}.${date.getUTCMonth() + 1}.${date.getUTCFullYear()}`;
            }
            const body = cell.p?.body;
            if (column === 1 && body) {
                const link = body.customRanges?.find(range => range.properties?.url);
                if (link) return link.properties.url;
            }
            let value = String(cell.v ?? body?.dataStream?.replace(/\r?\n$/, '') ?? '');
            if (column === 0) {
                const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (iso) value = `${iso[3]}.${iso[2]}.${iso[1]}`;
            }
            return value;
        });
    });
}

let lineCounter = 0;

/**
 * Main function
 */
(async () => {

    try {
        const content = await readFileAsync('config/config.json');
        const config = JSON.parse(content);
        const parsed = await loadTriliumSpreadsheet(config);
        console.log('Found lines:', parsed.length);

        // Keep the existing row order, row limit and processing behavior.
        for (const line of parsed) {
            lineCounter += 1;
            if (lineCounter <= numRowsToProcess) {
                await processRow(line).catch(function(err) {
                    console.error(err);
                    throw "Fehler";
                });
            }
        }

    } catch (err) {
        console.error("Error in main function:", err.message || err);
        process.exitCode = 1;
    }

    console.log("");
    console.log("DONE");

})();





    /*
    Datum	Url	Titel	Kategorie	Note	  Schlagworte	Beschreibung
    0      1      2   3       4       5             6
    */
async function processRow(row) {
    process.stdout.write("#" + lineCounter);
    process.stdout.write(" -> ");

    if (!row[0]) {
        console.log("SKIP because empty first column")
        return new Promise(function(resolve, reject) {resolve();});
    }

    const date = row[0];
    const parts = date.match(/(\d+)/g);
    if (!parts) {
        console.log("SKIP because first column is not a date: " + row[0]);
        return new Promise(function(resolve, reject) {resolve();});
    }

    process.stdout.write(row[1] + " -> ");

    const jsDate = new Date(parts[2], parts[1]-1, parts[0]);
    const isoDate = jsDate.toISOString();

    const title = row[2];
    const addr = row[4];
    const keywords = row[5] ? row[5].split(", ") : [];
    const url = row[1];
    const category = row[3];
    const desc = row[6] ? row[6] : "";
    const mdfive = md5(row[2]);
    const slug = title.toLowerCase().replace(/[^üöäßÄÖÜ\w\d]+/g, "-").replace(/^-/, "");
    const categoryString = keywords.join('", "')

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
    fs.writeFileSync(outputFile, content);
    const filestats = fs.statSync(outputFile);
    if (!filestats.size) {
        console.log(err);
        return new Promise(function(resolve, reject) {reject(err);});
    }


    const address = url;
    var largeScreenshotFile = "../images/large/" + slug + ".png";
    var publishedScreenshot = "../images/medium/" + slug + ".jpg";

    if (fs.existsSync(publishedScreenshot) && fs.statSync(publishedScreenshot).size > 50) {
        console.log("SKIP because published screenshot is there",  publishedScreenshot);
    } else if (fs.existsSync(largeScreenshotFile) && fs.statSync(largeScreenshotFile).size > 50) {
        console.log("large screenshot is there", largeScreenshotFile);

        // generate published thumbnail
        console.log("Generating only small screenshot: ", publishedScreenshot);
        await convert(largeScreenshotFile, publishedScreenshot);

//    } else if (address.match(/\.pdf$/i)) {
//        console.log("SKIP because TODO: PDF screenshots not implemented");
    } else {

        // generate screenshot
        console.log("Generating screenshot: ", largeScreenshotFile);
        await loadPage(address, largeScreenshotFile);

        // generate published thumbnail
        console.log("Generating small screenshot: ", publishedScreenshot);
        await convert(largeScreenshotFile, publishedScreenshot);

    }
    // We dont need to always return a promise. In an async funtion any non-promise-response will be wrapped in a resolved promise automagically.
}



/**
 * Take screenshot of page
 * @param {string} address
 * @param {string} output
 */
async function loadPage(address, output)
{
    // wait to take the screenshot. So user can close cookie popups
    const pause = 5000;
    const wait = async () => {
        if (pause) {
        console.log(`⏳ Waiting ${pause}ms…`);
        await new Promise(resolve => setTimeout(resolve, pause));
        }
    };
    
    console.log("Processingg", address);

    return new Promise(function(resolve, reject) {

        puppeteer
            .launch({
                defaultViewport: {
                    width: pageWidth,
                    height: pageHeight,
                },
                ignoreHTTPSErrors: true,
                acceptInsecureCerts: true,
                args: [
                  "--allow-running-insecure-content",
                  "--ignore-certificate-errors",
                  "--ignore-certificate-errors-spki-list",
                  "--enable-features=NetworkService",
                ],
                headless: false
            })
            .then(async (browser) => {
                    const page = await browser.newPage();
                    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36');
                    await page.goto(address);
                    await page.emulateMediaFeatures([{
                        name: 'prefers-color-scheme', value: 'light' }]);
                      await wait(); // Wait, in case the system preference was dark mode.
                    await page.screenshot({ path: output });
                    await browser.close();
                    console.log("done. wrote " + output);
                    resolve();
                }, 
                function() {console.error("SCREENSHOT FAILED"); reject();}
            );
    });
}



/**
 * Create different image size
 * @param {*} inputFile
 * @param {*} outputFile
 * @param {*} resizeOptions
 */
async function convert(inputFile, outputFile) {
    const resizeOptions = { width: thumbnailWidth, height: thumbnailheight }
    return new Promise(function(resolve, reject) {
      sharp(inputFile)
      .resize(resizeOptions)
      .jpeg({
          quality: jpgQuality,
          chromaSubsampling: '4:4:4'
      })
      .toFile(outputFile)
          .then(function(newFileInfo) {
              console.log("Success");
              resolve(newFileInfo);
          })
          .catch(function(err) {
              console.log("Error occured");
              reject(err);
          });
      });
}

