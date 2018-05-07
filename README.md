# Alexa Skill - Hurricane Center

This is an Alexa skill that provides updates on hurricanes based on data from the National Hurricane Center.
It was first published to the Alexa Skill store in 2016, and has been used in two hurricane seasons (2016 & 2017).

![](interaction_model/hurricane-logo-108.jpg)

**Table of Contents**

- [What does the NLU model look like including custom slots?](#overview-NLU-models)
- [How is the SDK structured?](#structure-of-SDK)
- [What are the different intents in the skill?](#intents-in-skill)
- [Where does the storm data come from?](#storm-data-from-NHC)
- [How does the skill support the Echo Show?](#visual-rendering-for-echo-show)
- [Which years does this cover?](#years-covered)

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

The hurricane data comes from the National Hurricane Center. 
It is loaded from a lambda function into an S3 bucket that is accessible by the skill.
This means that it can be dynamically changed without any impact to the skill.
The NHC provides basic formatting native to a website, however when this data is aggregigated, it is converted into json format.
This means that the Lambda function can easily read attributes.

## Visual Rendering for Echo Show

This skill was originally written in early 2016, using a prior version of the NodeJS SDK.
When the Echo Show was released, this skill was updated with this prior version to work with the Alex Show.
For an example of how to use the Echo Show in the current SDK, use [this repo](https://github.com/terrenjpeterson/pianoplayer)
To determine if the device has a screen, it looks for the context.System.device.supportedInterfaces.Display attribute in the main handler of the function, then passes the attribute to functions processed in the intent.
The helper that renders the Speechlet response was modified to look for this attribute, then formats the JSON response to include the hurricane background using the BodyTemplate1 format.

## Years Covered

This has been updated with storm data for 2018.
