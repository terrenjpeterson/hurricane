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
#lambdaruntime='hurricaneSkillGreen'
lambdaruntime='hurricaneSkillBlue'
echo 'deploying new function to' $lambdaruntime

# update the lambda function with the binaries that have been staged
aws lambda update-function-code --function-name "$lambdaruntime" --s3-bucket hurricane-data --s3-key binary/hurricane.zip >> temp.log

# read in test data required for a request to simulate launching the skill
echo 'test case 1 - launch request'
cd testdata
request=$(<request.json)
cd ..

# invoke the new lambda function
aws lambda invoke --function-name "$lambdaruntime" --payload "$request" testOutput.json

# read response file into local variable then print on the console
response=$(<testOutput.json)
echo $response
echo 'test case 1 complete'
