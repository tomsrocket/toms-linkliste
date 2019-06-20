"use strict";

const sharp = require('sharp');
const fs = require('fs');

const thumbnailWidth = 350;
const bigWidth = 800;
const jpgQuality = 65;

(async () => {
    try {
        const testFolder = '../images/';

        const files = fs.readdirSync(testFolder + "large/");

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            if (file.match(/\.png$/i)) {
                console.log("resizing to " + thumbnailWidth, file);
                await convert(testFolder + "large/" + file, testFolder + "small/" + file.replace(".png", ".jpg"), { width: thumbnailWidth, height: 250 });
                console.log("resizing to " + bigWidth, file);
                await convert(testFolder + "large/" + file, testFolder + "medium/" + file.replace(".png", ".jpg"), { width: bigWidth} );
            } 
        }
    } catch (err) {
      console.error("Error reading file:", err);
    }

    console.log();
    console.log("DONE");

})();


function convert(inputFile, outputFile, resizeOptions) {
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
