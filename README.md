# Homepage for Toms Linkliste

## Background information

It uses Pelican for static site generation

Pelican quickstart documentation: https://docs.getpelican.com/en/stable/quickstart.html

Theme installation documentation: https://github.com/getpelican/pelican-themes

Theme configuration: https://github.com/demianbrecht/pelican-bold


## Dev instructions

### Use Docker
All the following commands can be executed with docker, e.g. regenerate the content with:

    docker run -it --rm -v $(pwd):/srv/pelican mjjacko/pelican pelican content

More information about that method here: https://github.com/matthewjackowski/pelican-dockerfile

### Setup 

First configure google spreadsheet:

* Die Datei _scripts/config/config.json_ anlegen mit der *spreadsheetId*
* Anleitung befolgen um die Google Spreadsheet API nutzen zu können: https://developers.google.com/sheets/api/quickstart/nodejs
  * Wichtig evtl.: Umgesetzt wurde es aktuell mit "googleapis@39"
  * Die Config Dateien credentials.json und token.js müssen kopiert werden nach _scripts/config_

In the end your config dir should look like this: 

    scripts/config
            config.json
            credentials.json
            token.json

Then run the following to prepare the spreadsheet reader

    cd scripts
    npm install
    npm run generate

If you just want to re-read the information from the spreadsheet, enter

    npm run generate


### Development mode

From your site directory, run the following pelican command to first generate your site into the output directory, and then serve it on port 8000 while watching for changed files:

    pelican --autoreload --listen

Preview your site by navigating to http://localhost:8000/ in your browser.

### Build for prod

From your site directory, run the following pelican command to generate your site into the output directory

    pelican content

