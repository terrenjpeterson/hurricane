#!/bin/bash
# create build package and deploy a new skill

# create temp zip file with build package contents
echo 'zipping up files'
zip -r hurricane.zip lambda.js node_modules/ data/ > temp.log
echo 'build file created'

# stage the temp file in s3
aws s3 cp hurricane.zip s3://hurricane-data/binary/
aws s3 cp lambda.js s3://hurricane-data/binary/

# remove the temp file
rm hurricane.zip

# set which lambda function is being updated
lambdaruntime='hurricaneSkillBlue'
echo 'deploying new function to' $lambdaruntime

# update the lambda function with the binaries that have been staged
aws lambda update-function-code --function-name "$lambdaruntime" --s3-bucket hurricane-data --s3-key binary/hurricane.zip >> temp.log

