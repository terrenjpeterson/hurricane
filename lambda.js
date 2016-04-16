/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 */

var aws = require('aws-sdk');

// Get this years storm names

var atlanticStorms = [
    {
        "stormYear": 2016,
        "stormNames": [
            "Alex", 
            "Bonnie", 
            "Colin",
            "Danielle",
            "Earl",
            "Fiona",
            "Gaston",
            "Hermine",
            "Ian",
            "Julia",
            "Karl",
            "Lisa",
            "Matthew",
            "Nicole",
            "Otto",
            "Paula",
            "Richard",
            "Shary",
            "Tobias",
            "Virginie",
            "Walter"
        ]
    }
];

var pacificStorms = [
    {
        "stormYear": 2016,
        "stormNames": [
            "Agatha", 
            "Blas", 
            "Celia",
            "Darby",
            "Estelle",
            "Frank",
            "Georgette",
            "Howard",
            "Ivette",
            "Javier",
            "Kay",
            "Lester",
            "Madeline",
            "Newton",
            "Orlene",
            "Paine",
            "Roslyn",
            "Seymour",
            "Tina",
            "Virgil",
            "Winifred",
            "Xavier",
            "Yolanda",
            "Zeke"
        ]
    }
];

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * This validates that the applicationId matches what is provided by Amazon.
         */
        /*
        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.709af9ef-d5eb-48dd-a90a-0dc48dc822d6") {
             context.fail("Invalid Application ID");
        }
        */

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill. This drives
 * the main logic for the function.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("ListStormNames" === intentName) {
        getStormNames(intent, session, callback);
    } else if ("SetOceanPreference" === intentName) {
        setOceanInSession(intent, session, callback);
    } else if ("StormsFromPriorYears" == intentName) {
        getWhichYear(intent, session, callback);
    } else if ("ThisYearsStorms" === intentName) {
        getThisYearStorm(intent, session, callback);
    } else if ("CompleteListOfStorms" === intentName) {
        getCompleteList(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName || "AMAZON.StartOverIntent" === intentName) {
        getWelcomeResponse(callback);
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to the Hurricane Center, the best source for information " +
        "related to tropical storms, past or present. " +
        "Please ask me what you would like to hear information about.";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Please tell me how I can help you by saying phrases like, " +
        "list storm names or hurricane records.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    var cardTitle = "Session Ended";
    var speechOutput = "Thank you for trying the Alexa Skills Kit sample. Have a nice day!";
    // Setting this to true ends the session and exits the skill.
    var shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

/**
 * Sets the ocean in the session and prepares the speech to reply to the user.
 */
function setOceanInSession(intent, session, callback) {
    var cardTitle = "Hurricane Center";
    var preferredOcean = intent.slots.Ocean;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";

    console.log("preferred ocean : " + preferredOcean);

    if ("Atlantic" == preferredOcean.value || "pacific" == preferredOcean.value) {
        var ocean = preferredOcean.value;
        sessionAttributes = storeOceanAttributes(ocean);
        speechOutput = "Okay. My understanding is that you want information on the " + ocean + " ocean. " +
            "Would you like to hear about this years storms, or storms from prior years?";
        repromptText = "Here is the storm information for the " + ocean + " ocean.";
    } else {
        speechOutput = "I'm not sure which ocean you are looking for. Please try again";
        repromptText = "I'm not sure which ocean you want information on. " +
            "Please say either Atlantic or Pacific.";
    }

    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function storeOceanAttributes(ocean) {
    return {
        ocean: ocean
    };
}

function getStormNames(intent, session, callback) {
    var oceanPreference;
    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";
    var cardTitle = "Hurricane Center";

    console.log("session attributes: " + sessionAttributes);

    if (session.attributes) {
        oceanPreference = session.attributes.ocean;
    }

    if (oceanPreference) {
        speechOutput = "Your ocean preference is " + oceanPreference;
    } else {
        speechOutput = "Which ocean would you like details for, please say, Atlantic Ocean or Pacific Ocean";
    }

    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getWhichYear(intent, session, callback) {
    var oceanPreference;
    var shouldEndSession = false;
    var sessionAttributes = {};
    var speechOutput = "";
    var repromptText = "";
    var cardTitle = "Storm History";

    console.log("session attributes: " + JSON.stringify(session.attributes));
    console.log("intent attributes: " + JSON.stringify(intent.slots.Date));

    if (intent.slots.Date.value) {
        requestYear = intent.slots.Date.value;
        if (requestYear > 2000 && requestYear < 2016) {
            
            var s3 = new aws.S3();
    
            var getParams = {Bucket : 'hurricane-data', 
                             Key : 'stormHistoryAtlantic.json'}; 

            console.log('attempt to pull an object from an s3 bucket' + JSON.stringify(getParams));

            s3.getObject(getParams, function(err, data) {
                if(err)
                    console.log('Error getting history data : ' + err)
                else {
                    console.log('Successfully retrieved history data : ');

                    // data retrieval was successfull - now parse through it and provide back in the reponse.
                    
                    var stormHistoryArray = data.Body;
                    
                    console.log('data retrieved: ' + stormHistoryArray);
            
                    speechOutput = "Okay, I'm getting storm history for " + requestYear;

                    callback(sessionAttributes,
                        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
                };
            });
            
        } else {
            console.log('Year selected for storm history outside of available data');

            speechOutput = "Sorry, I don't have information for " + requestYear;

            repromptText = "Please state a year between 1995 and 2016. " +
                "For example, say Storms for 2012.";

            callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            };
        }
    else {
        console.log('No year provided for storm history');
        
        speechOutput = "Which year would you like storm history for?";

        repromptText = "Please state a year you would like to hear storm history for. " +
            "For example say Storms for 2012.";

        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function getThisYearStorm(intent, session, callback) {
    var oceanPreference;
    var repromptText = null;
    var shouldEndSession = false;
    var sessionAttributes = {};
    var speechOutput = "";

    console.log("session attributes: " + sessionAttributes);

    if (session.attributes) {
        oceanPreference = session.attributes.ocean;
    }

    // first check if there are any active storms, and if so provide current details
    // NOTE: this will be completed at a later time
    
    // if there are no active storms, provide what the names will be
    speechOutput = "There aren't any active storms yet for this year. ";
    
    if (oceanPreference == null)
        speechOutput = speechOutput + "If you would like to hear this years storm names " +
            "please let me know which set by saying Atlantic Ocean or Pacific Ocean";
    else {
        speechOutput = speechOutput + "The first five storm names for the " + oceanPreference + " Ocean will be ";
        if (oceanPreference == "Atlantic") 
            currentYearStorms = atlanticStorms[0];
        else
            currentYearStorms = pacificStorms[0];
            
        speechOutput = speechOutput + 
            currentYearStorms.stormNames[0] + ", " +
            currentYearStorms.stormNames[1] + ", " +
            currentYearStorms.stormNames[2] + ", " +
            currentYearStorms.stormNames[3] + ", and " +
            currentYearStorms.stormNames[4] + ". ";

        speechOutput = speechOutput + "If you would like the complete list, say complete list of this years storms";
    }
    
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

function getCompleteList(intent, session, callback) {
    var oceanPreference;
    var repromptText = null;
    var shouldEndSession = false;
    var sessionAttributes = {};
    var speechOutput = "";
    var cardTitle = "Storm Inventory";

    console.log("session attributes: " + sessionAttributes);

    if (session.attributes) {
        oceanPreference = session.attributes.ocean;
    }
    
    // first check to make sure an ocean has been selected, and if so list all of the storm names for it

    if (oceanPreference == null)
        speechOutput = "If you would like to hear this years storm names" +
            "please first let me know which set by saying Atlantic Ocean or Pacific Ocean";
    else {
        speechOutput = speechOutput + "The 2016 storm names for the " + oceanPreference + " Ocean will be ";
        if (oceanPreference == "Atlantic") 
            currentYearStorms = atlanticStorms[0];
        else
            currentYearStorms = pacificStorms[0];
        
        for (i = 0; i < currentYearStorms.stormNames.length; i++) { 
            speechOutput = speechOutput + currentYearStorms.stormNames[i] + ", ";
        }
    }
    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
