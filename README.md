# Alexa Skill - Hurricane Center

This is an Alexa skill that provides updates on hurricanes based on data from the National Hurricane Center.
It was first published to the Alexa Skill store in 2016, and has been used in three hurricane seasons (2016, 2017, 2018).

The main logic for the skill is in the lambda.js file.
The data folder contains different arrays of information that are used in generating responses by the skill.
For example, an index of storm names that the skill has additional details on, and the storm names for the current year.

![](interaction_model/hurricane-logo-108.jpg)

**Table of Contents**

- [What does the NLU model look like including custom slots?](#overview-NLU-models)
- [How is the SDK structured?](#structure-of-SDK)
- [What are the different intents in the skill?](#intents-in-skill)
- [Where does the storm data come from?](#storm-data-from-NHC)
- [How does the skill support the Echo Show?](#visual-rendering-for-echo-show)
- [Which years does this cover?](#years-covered)
- [How does Name-free Interaction work?](#alexa-native-integration)

## Overview NLU Models

All of the files and configurations needed for setting up the skill for the Alexa Voice Service in the Amazon developer console are in the interaction_model folder.
This includes the hurricane logos that are used in the Alexa skill store.

## Structure of SDK

In the lambda.js file is the Alexa Skill used to process requests coming from the Alexa Voice Service.  The skill is deployed as a Lambda function in AWS using nodeJS.

The framework used has a series of handler functions.  This came from the template used to author the application.

- onSessionStarted - called when the session starts.
- onLaunch - called when the user launches the skill without specifing what they want.
- onIntent - called when the user specifies an intent for the skill.
- onSessionEnded - called when the user ends the session.

## Intents in Skill

When processing intents, the following functions are called in the Alexa Skill that contains the specific response processing.

| Intent | Function |
|----------|--------|
| ListStormNames | getStormNames() |
| SetOceanPreference | setOceanInSession() |
| StormsFromPriorYears | getWhichYear() |
| ThisYearsStorms | getThisYearStorm() |
| CompleteListOfStorms | getCompleteList() |
| GetStormDetail | getStormDetail() |
| AMAZON.HelpIntent | getHelpResponse() |
| AMAZON.StartOverIntent | getWelcomeResponse() |
| AMAZON.RepeatIntent | getWelcomeResponse() |
| AMAZON.StopIntent | handleSessionEndRequest() |
| AMAZON.CancelIntent | handleSessionEndRequest() |

There are also a set of helper functions within the framework that package the json response properly.

- buildSpeechletResponse (title, output, repromptText, shouldEndSession)
- buildResponse (sessionAttributes, speechletResponse)

## Storm Data from NHC

The hurricane data comes from the National Hurricane Center [website](https://www.nhc.noaa.gov/). This data is available via RSS feed, but I'm not aware of any API call that publishes this detail.
Each time a new tropical storm becomes active, the NHC creates an html webpage with a public advisory.
<img src="https://s3.amazonaws.com/hurricane-data/images/sampleNHCdata.png" width="256" height="256">
A lambda function gets created based on the [nhcDataGather.js](https://github.com/terrenjpeterson/hurricane/blob/master/nhcDataGather.js) template that makes a https request to gather that page, then parse through it to convert the human readable version into a valid json object.
That object is then updated in an S3 bucket that is accessible by the skill.
A cloudwatch event is created that triggers the lambda function every fifteen minutes, thus keeping the data current.
The lambda function for the Alexa skill (lambda.js) is straight forward, and just reads the s3 object to gather the data.

The NHC updates storm forecasts either every three or six hours. The exact timing of when the content is published varies, but is normally ten minutes before the hour, with the main six hour updates at 5AM, 11AM, 5PM, 11PM ET.

## Visual Rendering for Echo Show

This skill was originally written in early 2016, using a prior version of the NodeJS SDK.
When the Echo Show was released, this skill was updated with this prior version to work with the Alex Show.
For an example of how to use the Echo Show in the current SDK, use [this repo](https://github.com/terrenjpeterson/pianoplayer)
To determine if the device has a screen, it looks for the context.System.device.supportedInterfaces.Display attribute in the main handler of the function, then passes the attribute to functions processed in the intent.
The helper that renders the Speechlet response was modified to look for this attribute, then formats the JSON response to include the hurricane background using the BodyTemplate1 format.

## Years Covered

This has been updated with storm data for 2018.

## Alexa Native Integration

This skill is currently participating in the beta program to use Name-free Interaction which integrates into requests natively handled by Alexa, and not done within a custom skill.
Name-free interaction is where Alexa gets a native question that it cannot handle, and then forwards to a custom skill.

Alexa generates a CanFulfillIntentRequest, that is forwarded to the skill by the platform querying if a certain question can be answered.
The skill responds back with a response object with a series of questions answered indicating if it can fulfill on the question.
Here is a sample response object if a forecast is requested for a current storm (i.e. what is the forecast for Tropical Storm Chris).

```sh
{
  "version": "1.0",
  "response": {
    "canFulfillIntent": {
      "canFulfill": "YES",
      "slots": {
        "Storm": {
          "canUnderstand": "YES",
          "canFulfill": "YES"
        }
      }
    }
  }
}
```

The skill indicates that it can handle the request, and a subsequent intent is triggered with the actual user intent.

For all but the setting of the ocean preference (SetOceanPreference), each of the intents answers back to this query with a positive fulfillment. 
