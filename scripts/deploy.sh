#!/bin/bash

source config/config.deploy.sh

echo $REMOTE

# a = keep file permissions
# v = verbose
# z = gzip during transfer

rsync -avzu ../output/ $REMOTE

