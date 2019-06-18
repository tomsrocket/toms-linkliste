# Homepage for Toms Linkliste

## Documentation

It uses Pelican for static site generation

Pelican quickstart documentation: https://docs.getpelican.com/en/stable/quickstart.html

Theme installation documentation: https://github.com/getpelican/pelican-themes

Theme configuration: https://github.com/demianbrecht/pelican-bold


## Dev instructions

### Setup

* Die Datei _scripts/config/config.json_ anlegen mit der *spreadsheetId*
* Anleitung befolgen um die Google Spreadsheet API nutzen zu können: https://developers.google.com/sheets/api/quickstart/nodejs
  * Wichtig evtl.: Umgesetzt wurde es aktuell mit "googleapis@39"
  * Die Config Dateien credentials.json und token.js müssen kopiert werden nach _scripts/config_


    npm install

    npm run generate

