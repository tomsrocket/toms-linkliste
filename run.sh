#!/bin/bash

# exit when any command fails
set -e

cd scripts
node read-public-google-spreadsheet.js 2000

cd ..
sudo docker run -it --rm -v $(pwd):/srv/pelican mjjacko/pelican pelican content

cd scripts
. ./deploy.sh

cd ..
