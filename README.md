Alexa Skill - Hurricane Center
------------------------------

In the lambda.js file is the core function used to process requests coming from Alexa

handler functions (event, context)
- onSessionStarted - called when the session starts.
- onLaunch - called when the user launches the skill without specifing what they want.
- onIntent - called when the user specifies an intent for the skill.
- onSessionEnded - called when the user ends the session.

skill functions

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

helper functions
- buildSpeechletResponse (title, output, repromptText, shouldEndSession)
- buildResponse (sessionAttributes, speechletResponse)
