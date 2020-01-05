# Homepage for Toms Linkliste

## Background information

It uses Pelican for static site generation

Pelican quickstart documentation: https://docs.getpelican.com/en/stable/quickstart.html

Theme installation documentation: https://github.com/getpelican/pelican-themes

Theme configuration: https://github.com/demianbrecht/pelican-bold

# Setup

## First time setup 

    # do this only the first time
    cp config/config.json.dist config/config.json
    # Now put your published csv export url into config.json

    git submodule init
    git submodule update
    
    mkdir content
    cd script
    npm install

## (Re-)generate the content

    # do this to regenerate the content
    cd scripts
    node read-public-google-spreadsheet.js 2000
    cd ..
    docker run -it --rm -v $(pwd):/srv/pelican mjjacko/pelican pelican content
    
## Development instructions

I recommend running _pelican_ in docker, read here: https://github.com/matthewjackowski/pelican-dockerfile

### Development mode

From your site directory, run the following pelican command to first generate your site into the output directory, and then serve it on port 8000 while watching for changed files:

    pelican --autoreload --listen

Preview your site by navigating to http://localhost:8000/ in your browser.

### Build for prod

From your site directory, run the following pelican command to generate your site into the output directory

    pelican content

