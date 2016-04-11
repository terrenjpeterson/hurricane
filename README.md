Alexa Skill - Hurricane Center
------------------------------

All of the files and configurations needed for setting up the skill in the Amazon developer console are in the interaction_model folder.

In the lambda.js file is the core function used to process requests coming from Alexa which is a Lambda function in AWS.

The framework used has a series of handler functions:
- onSessionStarted - called when the session starts.
- onLaunch - called when the user launches the skill without specifing what they want.
- onIntent - called when the user specifies an intent for the skill.
- onSessionEnded - called when the user ends the session.

When processing intents, the following functions are called that contains the specific response processing.

| Intent | Function |
|----------|--------|
| ListStormNames | getStormNames |
| SetOceanPreference | setOceanInSession |
| StormsFromPriorYears | getWhichYear |
| ThisYearsStorms | getThisYearStorm |
| CompleteListOfStorms | getCompleteList |
| AMAZON.HelpIntent | getWelcomeResponse |
| AMAZON.StartOverIntent | getWelcomeResponse |
| AMAZON.StopIntent | handleSessionEndRequest |
| AMAZON.CancelIntent | handleSessionEndRequest |

There are also a set of helper functions within the framework that package the json response properly.

- buildSpeechletResponse (title, output, repromptText, shouldEndSession)
- buildResponse (sessionAttributes, speechletResponse)
