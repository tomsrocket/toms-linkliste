#!/bin/bash

# exit when any command fails
set -e

# archive output directory
if test -d output; then
  mv output output.`date +'%Y%m%d-%Hh%Mm%Ss'`
fi

# create missing images and save to dirs ./images/(medium|large)
cd scripts
node read-public-google-spreadsheet.js 2000

# generate html pages into dir ./output
cd ..
sudo docker container run --rm -v ${PWD}:/pelican-site ghcr.io/williamjacksn/pelican

# copy medium size images to dir .output/images
if [ ! -d "output/images" ]; then
	mkdir output/images
fi
cp images/medium/* output/images/

# upload to server
cd scripts
. ./deploy.sh

cd ..
