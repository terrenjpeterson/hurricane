#!/bin/bash
# this script builds the package for the skill by pulling in node libraries and json files

zip -r parliament.zip candidates.json districts.json index.js results.json node_modules/
aws s3 cp *.zip s3://parliamentskill/
aws s3 cp index.js s3://parliamentskill/
