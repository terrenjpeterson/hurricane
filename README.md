Alexa Skill - Hurricane Center
------------------------------

All of the files and configurations needed for setting up the skill for the Alexa Voice Service in the Amazon developer console are in the interaction_model folder.

In the lambda.js file is the Alexa Skill used to process requests coming from the Alexa Voice Service.  The skill is deployed as a Lambda function in AWS using nodeJS.

The framework used has a series of handler functions.  This came from the template used to author the application.

- onSessionStarted - called when the session starts.
- onLaunch - called when the user launches the skill without specifing what they want.
- onIntent - called when the user specifies an intent for the skill.
- onSessionEnded - called when the user ends the session.

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
