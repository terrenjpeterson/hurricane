/**
 * This skill provides details about hurricanes through 2018, both prior years as well as current
 */

var aws = require('aws-sdk');

// this is used to track the application
const APP_ID = 'amzn1.echo-sdk-ams.app.709af9ef-d5eb-48dd-a90a-0dc48dc822d6';

// Get this years storm names
const atlanticStorms = require("data/atlantic2018.json");
const pacificStorms = require("data/pacific2018.json");

// current years storm names that have already occurred
const currYearStormArray = require("data/currStormData.json");

// storm names that historical information is available for in the datasets
// [ToDo: Add hurricane Omar, Paloma, Hanna]
const stormDetailAvail = require("data/stormDetailAvail.json");

// array of storm facts
const stormFacts = require("data/stormFacts.json");

// location of the storm dataset
var stormDataBucket = 'hurricane-data';

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

        console.log(JSON.stringify(event));

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                event.context,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                event.context,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            console.log("session ended request received");
            onSessionEnded(event.request, event.session);
            context.succeed();
	// this was added to handle the Can Fulfill Intent Request feature
        } else if (event.request.type === "CanFulfillIntentRequest") {
	    console.log("can fulfill request received ");
            onFulfillRequest(event.request, event.session, event.context,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildNoSessionResponse(speechletResponse));
                });
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
function onLaunch(launchRequest, session, context, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId + ", sessionId=" + session.sessionId);

    // need to determine which type of device is being used to remain backward compatibility
    var device = {};
    
    if (context) {
        console.log("Supported Interfaces:" + JSON.stringify(context.System.device.supportedInterfaces));
        if (context.System.device.supportedInterfaces.Display) {
            device.type = "Show";
        } else {
            device.type = "Legacy";
        }
    } else {
        console.log("Test Dummy - no device info");
        device.type = "Test";
    }

    // Dispatch to your skill's launch.
    getWelcomeResponse(session, device, callback);
}

// Called when Alexa is polling for more detail
function onFulfillRequest(intentRequest, session, context, callback) {
    console.log("processing on fulfillment request.");

    handleCanFulfillRequest(intentRequest, session, callback);
}

/**
 * Called when the user specifies an intent for this skill. This drives
 * the main logic for the function.
 */
function onIntent(intentRequest, session, context, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    // need to determine which type of device is being used to remain backward compatibility
    var device = {};
    
    if (context) {
        console.log("Supported Interfaces:" + JSON.stringify(context.System.device.supportedInterfaces));
        if (context.System.device.supportedInterfaces.Display) {
            device.type = "Show";
        } else {
            device.type = "Legacy";
        }
    } else {
        console.log("Test Dummy - no device info");
        device.type = "Test";
    }

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;
        country = intentRequest.locale;        

    // Dispatch to the individual skill handlers
    if ("ListStormNames" === intentName) {
        getStormNames(intent, session, device, callback);
    } else if ("SetOceanPreference" === intentName) {
        setOceanInSession(intent, session, device, callback);
    } else if ("StormsFromPriorYears" == intentName && intent.slots.Date.value == 2018) {
        getCurrentYearHistory(intent, session, device, callback);
    } else if ("StormsFromPriorYears" == intentName && intent.slots.Date.value != 2018) {
        getWhichYear(intent, session, device, callback);
    } else if ("ThisYearsStorms" === intentName || "AMAZON.YesIntent" === intentName) {
        console.log("Intent Name: " + intentName + " From: " + country);
        getThisYearStorm(intent, session, device, callback);
    } else if ("CurrentYearHistory" === intentName) {
        getCurrentYearHistory(intent, session, device, callback);
    } else if ("CompleteListOfStorms" === intentName) {
        getCompleteList(intent, session, device, callback);
    } else if ("GetStormDetail" === intentName) {
        getStormDetail(intent, session, device, callback);
    } else if ("GiveStormFact" === intentName || "AMAZON.MoreIntent" === intentName) {
        getStormFact(intent, session, device, callback);
    } else if ("StormStrength" === intentName) {
	getHurricaneStrength(intent, session, device, callback);
    } else if ("TropicalStormStrength" === intentName) {
        getTropicalStormStrength(intent, session, device, callback);
    } else if ("DifferenceStorms" === intentName) {
	getDifferenceStorms(intent, session, device, callback);
    } else if ("AMAZON.StartOverIntent" === intentName || "AMAZON.PreviousIntent" === intentName) {
        getWelcomeResponse(session, device, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(device, callback);
    } else if ("AMAZON.RepeatIntent" === intentName || "AMAZON.NextIntent" === intentName) {
        getWelcomeResponse(session, device, callback);
    } else if ("AMAZON.CancelIntent" === intentName || "AMAZON.NoIntent" === intentName) {
        handleSessionEndRequest(device, callback);
    } else if ("AMAZON.StopIntent" === intentName) {
	handleSessionStopRequest(device, callback);
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
}

// --------------- Base Functions that are invoked based on standard utterances -----------------------

// this is the function that gets called to format the response to the user when they first boot the app
function getWelcomeResponse(session, device, callback) {
    var sessionAttributes = {};
    var shouldEndSession = false;
    var cardTitle = "Welcome to Hurricane Center";

    var cardOutput = "No Current Storms in either the Atlantic or Pacific Ocean.";
    var speechOutput = "Welcome to the Hurricane Center, the best source for information " +
        "related to tropical storms, past or present. There are no active tropical storms " +
        "right now, but if you would like to learn more about storms, please say something " +
        "like tell me a storm fact.";
    var repromptText = "Please tell me how I can help you by saying phrases like, " +
        "list storm names or storm history for 2013.";
    var activeStorms = false;

    console.log("Get Welcome Message - Device Type: " + JSON.stringify(device.type));
    
    // check current data to see if there are active storms and if so change the welcome message
    var s3 = new aws.S3();

    var getParams = {Bucket : stormDataBucket,
                    Key : 'currStorms.json'};

    s3.getObject(getParams, function(err, data) {
        if(err)
            console.log('Error getting history data : ' + err);
        else {
            var returnData = eval('(' + data.Body + ')');
            //
            if (returnData[0].activeStorms === false) {
                console.log('welcome message - no active storms');
            } else {
                console.log('there is an active storm: ' + JSON.stringify(returnData[0].storms));
                // parse through the array and build an appropriate welcome message
                speechOutput = "Welcome to the Hurricane Center. ";
                var storms = returnData[0].storms;
                var activeStormAtlantic = false;
                var activeStormPacific = false;
                var activeStorms = 0;
                var activeStormNames = [];
                var currentStormLocation = "";
                var currentStormLoc = [];
                // rotate through the array of current storm data to determine where the active storms are
                for (i = 0; i < storms.length; i++) {
                    console.log('storm data: ' + JSON.stringify(returnData[0].storms[i]));
                    if (storms[i].formed) {
                        activeStormNames.push(returnData[0].storms[i].stormType + " " + returnData[0].storms[i].stormName);
                        activeStorms++;
                        currentStormLocation = returnData[0].storms[i].location.proximity;
                        currentStormLoc.push(returnData[0].storms[i].location.proximity);
                        if (storms[i].ocean == "Atlantic")
                            activeStormAtlantic = true;
                        else
                            activeStormPacific = true;
                    }
                }
                console.log("total number of storms: " + activeStorms);
                console.log("storm names: " + JSON.stringify(activeStormNames));
                //speechOutput = speechOutput + "<break time=\"1s\"/>";
                // build a different message depending on where the oceans are at and how many are active
                if (activeStormAtlantic === true && activeStormPacific === false) {
                    if (activeStorms === 1) {
                        console.log("Current Location: " + currentStormLoc[0]);
                        speechOutput = speechOutput + activeStormNames[0] + " is currently active, approximately " + currentStormLoc[0];
                    } else if (activeStorms === 2) {
                        speechOutput = speechOutput + activeStormNames[0] + " is currently active, approximately " + currentStormLoc[0] + " " +
                            activeStormNames[1] + " is currently active, approximately " + currentStormLoc[1] + " ";
                    } else if (activeStorms === 3) {
                        speechOutput = speechOutput + activeStormNames[0] + " is currently active, approximately " + currentStormLoc[0] +
                            activeStormNames[1] + " is currently active, approximately " + currentStormLoc[1] + ". " +
                            activeStormNames[2] + " is currently active, approximately " + currentStormLoc[2]; 
                    } else {
                        speechOutput = speechOutput + "There are currently " + activeStorms + " storms active in the Atlantic Ocean. ";
                    }
                } else if (activeStormAtlantic === false && activeStormPacific === true) {
                    if (activeStorms === 1) {
                        speechOutput = speechOutput + activeStormNames[0] + " is currently active in the Pacific Ocean. ";
                    } else if (activeStorms === 2) {
                        speechOutput = speechOutput + activeStormNames[0] + " and " + activeStormNames[1] + " are currently " +
                            "active in the Pacific Ocean. ";
                    } else {
                        speechOutput = speechOutput + "There are currently " + activeStorms + " storms active in the Pacific Ocean. ";
                    }
                } else if (activeStormAtlantic === true && activeStormPacific === true) {
                    if (activeStorms === 2) {
                        speechOutput = speechOutput + activeStormNames[0] + " is currently active, approximately " + currentStormLoc[0] + ". " +
                            activeStormNames[1] + " is currently active, approximately " + currentStormLoc[1] + ".";
                    } else if (activeStorms === 3) {
                        speechOutput = speechOutput + activeStormNames[0] + " is currently active, approximately " + currentStormLoc[0] + ". " +
                            activeStormNames[1] + " is currently active, approximately " + currentStormLoc[1] + ". " +
                            activeStormNames[2] + " is currently active, approximately " + currentStormLoc[2]; 
                    } else {
                        speechOutput = speechOutput + "There are active storms in both the Atlantic and Pacific Oceans. ";
                    }
                }
                //speechOutput = speechOutput + "<break time=\"1s\"/>";
                cardOutput = speechOutput;
                speechOutput = speechOutput + "Please say yes if you would like to hear additional details including the forecast.";
                repromptText = "There are currently active tropical storms. To hear specific details about them, just say yes.";
            }
        }

	    callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, device, shouldEndSession));
    });
}

// this is the function that handles broad requests coming in natively from Alexa
function handleCanFulfillRequest(intentRequest, session, callback) {
    var sessionAttributes = {};
    const intentName = intentRequest.intent.name;

    console.log("Can Fulfill Request for intent name:" + intentName);

    // depending on the intent determine if a response can be provided
    if ("ListStormNames" === intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", null));	
    } else if ("SetOceanPreference" === intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("NO", buildSlotDetail("Ocean", intentRequest.intent.slots)));
    } else if ("StormsFromPriorYears" == intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", buildSlotDetail("Date", intentRequest.intent.slots)));
    } else if ("ThisYearsStorms" === intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", null));
    } else if ("CurrentYearHistory" === intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", null));
    } else if ("CompleteListOfStorms" === intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", null));
    } else if ("GetStormDetail" === intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", buildSlotDetail("Storm", intentRequest.intent.slots)));
    } else if ("GiveStormFact" === intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", null));
    } else if ("StormStrength" === intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", buildSlotDetail("HurricaneStrength", intentRequest.intent.slots)));
    } else if ("TropicalStormStrength" === intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", null));
    } else if ("DifferenceStorms" === intentName) {
        callback(sessionAttributes,
            buildFulfillQueryResponse("YES", null));
    } else {
	// this handles all the other scenarios - i.e. Scroll Down Intent - that make no sense
	console.log("No match on intent name: " + intentName);
	callback(sessionAttributes, buildFulfillQueryResponse("NO", null));
    }
}

// this is the function that gets called to format the response to the user when they ask for help
function getHelpResponse(device, callback) {
    var sessionAttributes = {};
    var cardTitle = "Help";
    // this will be what the user hears after asking for help
    var speechOutput = "The Hurricane Center provides information about tropical storms. " +
        "If you would like to hear about storms from this year, say What are storms from this year. " +
        "For information related to storms from prior years, please say What is the storm history " +
        "for a specific year. If you would like to hear a fact about tropical storms, please say " +
        "tell me a storm fact.";

    console.log("Get Help Response");
        
    // if the user still does not respond, they will be prompted with this additional information
    var repromptText = "Please tell me how I can help you by saying phrases like, " +
        "list storm names or storm history.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, device, shouldEndSession));
}

// this is the function that describes the difference between a hurricane and tropical storm
function getDifferenceStorms(intent, session, device, callback) {
    var sessionAttributes = {};
    var cardTitle = "Storm Strength";

    console.log("Get difference betwen tropical storm and a hurricane requested.");

    const speechOutput = "Peak wind speed is what differentiates storm types. " +
	"A tropical storm has wind speeds ranging from 39 to 73 miles per hour. " +
        "Anything at 74 miles per hour and above is classified as a hurricane. " +
	"Hurricanes start off as tropical storms, and if conditions are favorable, " +
	"the winds gain in strength and the storm grows into a hurricane. " +
	"Weaker storms that have wind speeds below 39 miles per hour are called Tropical Depressions. " +
        "If you would like to know about different strengths of hurricanes, just say something like, " +
        "How strong are the winds on a category three hurricane?";
    const cardOutput = "Tropical Storms have wind speed from 39 to 73 miles per hour.";

    // if the user still does not respond, they will be prompted with this additional information
    const repromptText = "Please tell me how I can help you by saying phrases like, " +
        "list storm names or storm history.";

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, device, false));
}

// this is the function that handles describing a tropical storm
function getTropicalStormStrength(intent, session, device, callback) {
    var sessionAttributes = {};
    var cardTitle = "Storm Strength";

    console.log("Get Tropical Storm Strength requested.");

    const speechOutput = "A tropical storm has wind speeds ranging from 39 to 73 miles per hour. " +
	"Anything at 74 miles per hour and above is classified as a hurricane. " +
	"If you would like to know about different strengths of hurricanes, just say something like, " +
	"How strong are the winds on a category three hurricane?";
    const cardOutput = "Tropical Storms have wind speed from 39 to 73 miles per hour.";

    // if the user still does not respond, they will be prompted with this additional information
    const repromptText = "Please tell me how I can help you by saying phrases like, " +
        "list storm names or storm history.";

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, device, false));
}

// this is the function that handles how strong a hurricane winds are
function getHurricaneStrength(intent, session, device, callback) {
    var sessionAttributes = {};
    var cardTitle = "Storm Strength";

    console.log("Get Hurricane Strength requested.");

    var speechOutput = "A category x hurricane is y miles per hour.";

    // check the slot data and provide a response accordingly
    if (intent.slots.HurricaneStrength.value === "1") {
	cardOutput = "A category one hurricane is between 74 and 95 miles per hour.";
        speechOutput = "A category one hurricane is between 74 and 95 miles per hour. " +
	    "What other information can I help you on? For example, ask me for a storm fact.";
    } else if (intent.slots.HurricaneStrength.value === "2") {
	cardOutput = "A category two hurricane is between 96 and 110 miles per hour.";
        speechOutput = "A category two hurricane is between 96 and 110 miles per hour. " +
            "What other information can I help you on? For example, ask me for a storm fact.";
    } else if (intent.slots.HurricaneStrength.value === "3") {
	cardOutput = "A category three hurricane is between 111 and 129 miles per hour.";
        speechOutput = "A category three hurricane is between 111 and 129 miles per hour. " +
            "What other information can I help you on? For example, ask me for a storm fact.";
    } else if (intent.slots.HurricaneStrength.value === "4") {
	cardOutput = "A category four hurricane is between 130 and 156 miles per hour.";
        speechOutput = "A category four hurricane is between 130 and 156 miles per hour. " +
            "What other information can I help you on? For example, ask me for a storm fact.";
    } else if (intent.slots.HurricaneStrength.value === "5") {
	cardOutput = "A category five hurricane is 157 miles per hour and above.";
        speechOutput = "A category five hurricane is 157 miles per hour and above. " +
            "What other information can I help you on? For example, ask me for a storm fact.";
    } else {
	console.log("Invalid hurricane level provided");
	cardOutput = "The Saffir-Simpson Scale is a range from one to five.";
        speechOutput = "Sorry, hurricanes are classified in a range from one to five. " +
	    "Please provide me the hurricane strength by saying something like, " +
	    "How strong are the winds on a category three hurricane?";
    }

    // if the user still does not respond, they will be prompted with this additional information
    const repromptText = "Please tell me how I can help you by saying phrases like, " +
        "list storm names or storm history.";

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, device, false));
}

// this is the function that gets called to format the response when the user is done
function handleSessionEndRequest(device, callback) {
    var cardTitle = "Thanks for using Hurricane Center";
    var speechOutput = "Thank you for using Hurricane Center. ";
        //"If this skill was useful, please " +
        //"let others know by writing a review in the Alexa app.";
    // Setting this to true ends the session and exits the skill.
    var shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, speechOutput, null, device, shouldEndSession));
}

// this is the function that gets called to format the response when the user requests stop
function handleSessionStopRequest(device, callback) {
    const cardTitle = "Thanks for using Hurricane Center";
    const speechOutput = "Okay, is there any other information I can provide you about tropical storms? " +
	"For example, you can say, tell me a storm fact.";
    const repromptText = "What other information would you like on tropical storms? For example, you can " +
	"say, What are the storms for this year?";

    const shouldEndSession = false;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, device, shouldEndSession));
}

// Sets the ocean in the session and prepares the speech to reply to the user.
function setOceanInSession(intent, session, device, callback) {
    var cardTitle = "Hurricane Center";
    var preferredOcean = intent.slots.Ocean;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";

    console.log("Setting ocean preference");
    console.log("preferred ocean : " + JSON.stringify(preferredOcean));

    if ("Atlantic" == preferredOcean.value || "pacific" == preferredOcean.value) {
        var ocean = preferredOcean.value.charAt(0).toUpperCase() + preferredOcean.value.slice(1);

        sessionAttributes = storeOceanAttributes(ocean);
        speechOutput = "Okay. My understanding is that you want information on the " + ocean + " ocean. " +
            "Would you like to hear about this years storms, or storms from prior years?";
        repromptText = "Here is the storm information for the " + ocean + " ocean.";
    } else {
        speechOutput = "I'm not sure which ocean you are looking for. Please try again by " +
            "saying Atlantic or Pacific.";
        repromptText = "I'm not sure which ocean you want information on. " +
            "Please say either Atlantic or Pacific.";
    }

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, device, shouldEndSession));
}

function storeOceanAttributes(ocean) {
    return {
        ocean: ocean
    };
}

// Sets the ocean name in case it has not done so already
function getStormNames(intent, session, device, callback) {
    var oceanPreference;
    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";
    var cardTitle = "Hurricane Center";

    console.log("Get Storm Names");

    if (session.attributes) {
        oceanPreference = session.attributes.ocean;
    }

    if (oceanPreference) {
        speechOutput = "Your ocean preference is " + oceanPreference + ". " +
            "Please let me know what information I can provide, for example say " +
            "List storm names.";
        sessionAttributes = storeOceanAttributes(oceanPreference);
        repromptText = "What would you like me to read you this years storms? If so, " +
            "please say List storm names.";
    } else {
        speechOutput = "Which ocean would you like details for, please say, Atlantic Ocean or Pacific Ocean";
        repromptText = "Please let me know which ocean you would like details " +
            "by saying Atlantic Ocean or Pacific Ocean";
    }

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, device, shouldEndSession));
}

// This highlights the summary of storms for the current year - 2018
function getCurrentYearHistory(intent, session, device, callback) {
    var oceanPreference;
    var sessionAttributes = {};
    var shouldEndSession = false;
    var cardTitle = "Storm History for 2018";

    console.log("Get Current Year History");

    var atlanticTropStorms = 0;
    var atlanticHurricanes = 0;
    var pacificTropStorms = 0;
    var pacificHurricanes = 0;

    // rotate through all of the current storms and count categories

    for (i = 0; i < currYearStormArray.length; i++) {
        if(currYearStormArray[i].ocean == "Atlantic") {
            if(currYearStormArray[i].level == "Hurricane") {
                atlanticHurricanes += 1;
            } else {
                atlanticTropStorms += 1;
            }
        } else {
            if(currYearStormArray[i].level == "Hurricane") {
                pacificHurricanes += 1;
            } else {
                pacificTropStorms += 1;
            }
        }
    }

    // format response by merging the summary from the array with natural language

    var speechOutput = "So far this year there have been " + atlanticHurricanes +
        " hurricanes in the Atlantic and " + pacificHurricanes + " in the Pacific. ";
//    var speechOutput = "It is still early in the season, and there have been no hurricanes " +
//        "in either the Atlantic or Pacific Oceans. " +
//        "If you would like to hear about current active storms please say " +
//        "Current Storms and I will give a detailed overview of what is currently active. ";
        speechOutput = speechOutput + "There have been " + atlanticTropStorms +
        " Tropical Storms in the Atlantic and " + pacificTropStorms + " in the Pacific. " +
	"If you want information on current storms, please say List Current Storms. ";
//        " I have detailed information about Hurricanes Harvey, Irma, and Maria. If you would like details " +
//        " please say something like, Tell me about Hurricane Harvey. ";
        
    var cardOutput = "Atlantic Ocean\n" + atlanticHurricanes +
        " Hurricanes\n" + atlanticTropStorms +
        " Tropical Storms\n" + "Pacific Ocean\n" + pacificHurricanes +
        " Hurricanes\n" + pacificTropStorms +
        " Tropical Storms\n" +
        " Major Storms\n";

    const repromptText = "If you would like information about current storms, please " +
        "say List Current Storms.";

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, device, shouldEndSession));
}

// This function returns storm history. It checks to make sure that the year one where data
// can be provided back, and if so pulls it from an S3 bucket. The data is parsed and a response
// is formatted
function getWhichYear(intent, session, device, callback) {
    var oceanPreference;
    var shouldEndSession = false;
    var sessionAttributes = {};
    var speechOutput = "";
    var cardOutput = "";
    var repromptText = "";
    var cardTitle = "Storm History";

    console.log("Retrieve Storm History");

    // get what ocean has been requested
    if (session.attributes) {
        oceanPreference = session.attributes.ocean;
        sessionAttributes = storeOceanAttributes(oceanPreference);
        //console.log('set default');
    } else {
        oceanPreference = "Atlantic";
        sessionAttributes = storeOceanAttributes(oceanPreference);
    }

    //console.log("session attributes: " + JSON.stringify(session.attributes));
    //console.log("intent attributes: " + JSON.stringify(intent.slots.Date));

    if (intent.slots.Date.value) {
        requestYear = intent.slots.Date.value;
        cardTitle = "Storm History for " + requestYear;
        if (requestYear > 1990 && requestYear < 2018) {
            
            var s3 = new aws.S3();
            
            if (oceanPreference == null) {
                oceanPreference = "Atlantic";
            }
    
            var oceanObject = 'stormHistory' + oceanPreference + '.json';
            //var oceanObject = 'stormHistoryAtlTest.json';
    
            var getParams = {Bucket : stormDataBucket, 
                             Key : oceanObject }; 

            console.log('attempt to pull an object from an s3 bucket' + JSON.stringify(getParams));

            s3.getObject(getParams, function(err, data) {
                if(err)
                    console.log('Error getting history data : ' + err)
                else {
                    // data retrieval was successfull - now parse through it and provide back in the reponse.
                    var historyArray = eval('(' + data.Body + ')');

                    // parse through the history and find the data for the requested year
                    for (j = 0; j < historyArray.length; j++) {
                        //console.log('year: ' + historyArray[j].stormYear);
                        if (historyArray[j].stormYear == requestYear)
                            var stormHistoryArray = historyArray[j];
                    }
                    
                    // build the response back based on stringing together all information for the year
                    var stormReading = {};
                    var moreStormData = [];
                    
                    speechOutput = 'In the ' + oceanPreference + ' ocean ' +
                        'there were ' + stormHistoryArray.storms.length + 
                        ' storms in ' + stormHistoryArray.stormYear + '. ';

                    var hurricaneNames = [];
                    var tropicalStormNames = [];

                    // sort the storm names into separate arrays
                    for (i = 0; i < stormHistoryArray.storms.length; i++) {
                        if (stormHistoryArray.storms[i].stormType == "Hurricane")
                            hurricaneNames.push(stormHistoryArray.storms[i].stormName);
                        else
                            tropicalStormNames.push(stormHistoryArray.storms[i].stormName);
                        if (stormHistoryArray.storms[i].scale != null) {
                            console.log('more data available on ' + stormHistoryArray.storms[i].stormName);
                            moreStormData.push(stormHistoryArray.storms[i]);
                        }
                    }

                    // now go through each array and create sentance structure
                    speechOutput = speechOutput + "The hurricane names are ";
                    cardOutput = cardOutput + "Hurricanes:\n";

                    for (i = 0; i < hurricaneNames.length; i++) {
                        speechOutput = speechOutput + hurricaneNames[i] + ", ";
                        cardOutput = cardOutput + hurricaneNames[i] + "\n";
                    }

                    speechOutput = speechOutput + "The tropical storm names are ";
                    cardOutput = cardOutput + "\nTropical Storms:\n";

                    for (i = 0; i < tropicalStormNames.length; i++) {
                        speechOutput = speechOutput + tropicalStormNames[i] + ", ";
                        cardOutput = cardOutput + tropicalStormNames[i] + "\n";
                    }

                    for (i = 0; i < moreStormData.length; i++) {
                        cardOutput = cardOutput + 'More data available on ' + stormHistoryArray.storms[i].stormName + "\n";
                        console.log('storm data on : ' + JSON.stringify(moreStormData[i]));
                    }
                    
                    if (moreStormData.length == 0) {
                        speechOutput = speechOutput + " Would you like to hear information about another year?";
                        repromptText = "Would you like to hear information about another year? If so, please say " +
                            "something like tell me about storms from 2007.";
                    } else {
                        speechOutput = speechOutput + " I have more information on " + moreStormData[0].stormType + 
                        " " + moreStormData[0].stormName + ". Would you like to hear it? If so, please say " +
                        "tell me more about " + moreStormData[0].stormName + ".";
                        repromptText = "Would you like to hear information about another year? If so, please say " +
                            "something like tell me about storms from 2007.";
                    }

                    callback(sessionAttributes,
                        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, device, shouldEndSession));
                };
            });
            
        } else {
            console.log('Year selected for storm history outside of available data');

            speechOutput = "Sorry, I don't have information for " + requestYear + ". " +
                "I do have information on storms between 1991 and 2018.  Please let me " +
                "know which year I can provide within that range.";

            repromptText = "Please state a year between 1991 and 2018. " +
                "For example, say Storms for 2012.";

            callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, device, shouldEndSession));
            };
        }
    else {
        console.log("No year provided. Reprompt user to select a year for storm history");
        
        speechOutput = "Which year would you like storm history for? If you would like me to check for " +
            "storms that are currently active, please say something like current storms. ";
        repromptText = "Please state a year you would like to hear storm history for. " +
            "For example say Storms for 2012, or for storms that are currently active, say current storms. ";

        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, device, shouldEndSession));
    }
}

// this function gets information about this years storms
function getThisYearStorm(intent, session, device, callback) {
    var oceanPreference;
    var repromptText = "";
    var shouldEndSession = false;
    var sessionAttributes = {};
    var speechOutput = "";
    var cardOutput = "";
    var cardTitle = "Storm Information for 2018";

    if (session.attributes) {
        oceanPreference = session.attributes.ocean;
        sessionAttributes = storeOceanAttributes(oceanPreference);
    }

    console.log("get information about this years storms");

    // first check if there are any active storms, and if so provide current details
    var s3 = new aws.S3();

    var getParams = {Bucket : stormDataBucket,
                    Key : 'currStorms.json'};

    //console.log('attempt to pull an object from an s3 bucket' + JSON.stringify(getParams));

    s3.getObject(getParams, function(err, data) {
        if(err)
            console.log('Error getting history data : ' + err);
        else {
            var returnData = eval('(' + data.Body + ')');
            //console.log('Successfully retrieved history data : ' + data.Body);
            //
            if (returnData[0].activeStorms === false) {
                // if there are no active storms, provide what the names will be
                speechOutput = "There aren't any active tropical storms in either ocean right now. ";
    
                if (oceanPreference == null) {
                    // this logic is processed in case that there is no ocean preference set
                    speechOutput = speechOutput + "If you would like to hear this years storm names " +
                        "please let me know which set by saying Atlantic Ocean or Pacific Ocean";

                    cardOutput = speechOutput;

                    repromptText = "Please let me know which ocean you would like to hear storm data " +
                        "for by saying Atlantic Ocean or Pacific Ocean";
                } else {
                    // no current storms, but ocean preference is set - so share what the first five storm names are
                    //
                    speechOutput = speechOutput + "The first five storm names for the " + oceanPreference + " Ocean will be ";
                    if (oceanPreference == "Atlantic") 
                        currentYearStorms = atlanticStorms[0];
                    else
                        currentYearStorms = pacificStorms[0];

                    console.log("current year storms: " + JSON.stringify(currentYearStorms));
            
                    speechOutput = speechOutput + 
                        currentYearStorms.stormNames[0] + ", " +
                        currentYearStorms.stormNames[1] + ", " +
                        currentYearStorms.stormNames[2] + ", " +
                        currentYearStorms.stormNames[3] + ", and " +
                        currentYearStorms.stormNames[4] + ". ";

                    cardOutput = oceanPreference + " Ocean\n" +
                        currentYearStorms.stormNames[0] + "\n" +
                        currentYearStorms.stormNames[1] + "\n" +
                        currentYearStorms.stormNames[2] + "\n" +
                        currentYearStorms.stormNames[3] + "\n" +
                        currentYearStorms.stormNames[4] + "\n";

                    speechOutput = speechOutput + "If you would like the complete list, say complete list of this years storms.";

                    repromptText = "Would you like more information? If you would like a complete list of this years " +
                        "storms, say Complete list of this years storms. If you would like storm history from prior years " +
                        "please say Storm History.";
                }

                callback(sessionAttributes,
                    buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, device, shouldEndSession));
                
            } else {
                console.log('read detail about an active storm');
                var storms = returnData[0].storms;
                var latestUpdate = returnData[0].latestUpdate;
                
                replyActiveStorms(storms, returnData, intent, session, device, callback);

            }
        }
    });
}

// this function prepares the response on active storms
function replyActiveStorms(storms, returnData, intent, session, device, callback) {
    var sessionAttributes = {};
    var cardOutput = "";
    var cardTitle = "Storm Information for 2018";
    var activeStorms = [];
    
    if (session.attributes) {
        oceanPreference = session.attributes.ocean;
        sessionAttributes = storeOceanAttributes(oceanPreference);
    }

    // parse through the array and build an appropriate welcome message
    var speechOutput = "Here is the latest forecast. ";
    //    speechOutput = speechOutput + "<break time=\"1s\"/>";
                
    // go through the returned array and build language and cards depicting the storm data.
    for (i = 0; i < storms.length; i++) {
        var activeStormDetail = {};
        if (storms[i].formed) {
                        
            // this is the introduction message with the high level information on the storm
                        
            speechOutput = speechOutput + "As of " + returnData[0].latestUpdate +
                ", in the " + storms[i].ocean + " Ocean, " +
                storms[i].stormType + " " + storms[i].stormName + " is currently " +
                "producing winds of " + storms[i].peakWinds + " miles per hour. " +
                "The storm center has a low pressure of " + storms[i].pressure + " millibars. ";
            //speechOutput = speechOutput + "<break time=\"1s\"/>";

            // this will only be processed if there is a tropical storm warning
                        
            if (storms[i].tropStormWarning === true)
                speechOutput = speechOutput + "From the National Hurricane Center in Miami, Florida. " +
                    "A Tropical Storm Warning has been issued for " + storms[i].tropStormLocation + ". " +
                    "A Tropical Storm Warning means that tropical storm conditions are expected somewhere " +
                    "within the warning area within the next 36 hours. ";

            if (storms[i].hurricaneWarning === true)
                speechOutput = speechOutput + "From the National Hurricane Center in Miami, Florida. " +
                    "A Hurricane Warning has been issued for " + storms[i].tropStormLocation + ". " +
                    "A Hurricane Warning means that hurricane conditions are expected somewhere " +
                    "within the warning area within the next 36 hours. ";

            if (storms[i].hurricaneWatch === true)
                speechOutput = speechOutput + "From the National Hurricane Center in Miami, Florida. " +
                    "A Hurricane Watch has been issued for " + storms[i].hurrWatchLocation + ". " +
                    "A Hurricane Watch means that hurricane conditions are possible " +
                    "within the watch area. A Hurricane Watch is typically issued 48 " +
                    "hours before the anticipated first occurrence of tropical storm " +
                    "force winds, conditions that make outside preparations difficult " +
                    "or dangerous. "

            // this will build around the location then movement and is always expected to be present
                                
            speechOutput = speechOutput + "The storm center is currently located near " +
                storms[i].location.lat + " and " + storms[i].location.long + " and approximately " +
                storms[i].location.proximity + ". ";
                
            speechOutput = speechOutput + "Present movement is toward the " + storms[i].movement.direction +
                " at " + storms[i].movement.speed + " miles per hour, and this general motion is expected to " +
                storms[i].movement.forecast + ". ";
                    
            //speechOutput = speechOutput + "<break time=\"1s\"/>";

            // this adds the specific details for the forecast

            if (storms[i].landfall === true && storms[i].tropStormWarning === true)    
                speechOutput = speechOutput + "Looking ahead, tropical storm conditions are expected to first reach " +
                    storms[i].landfallPredict + ". ";
                        
            speechOutput = speechOutput + storms[i].hazards.rainfall + ". " + storms[i].hazards.stormSurge;

            if (storms[i].hazards.surf != null)
                speechOutput = speechOutput + "This system is expected to produce " + storms[i].hazards.surf + ". ";

            if (storms[i].hazards.wind != null)
                speechOutput = speechOutput + " " + storms[i].hazards.wind + ". ";

            // this closes the dialog highlighting when the next update will be provided
                        
            //speechOutput = speechOutput + "<break time=\"1s\"/>";
            speechOutput = speechOutput + "The next complete advisory will be at " + returnData[0].nextUpdate + ". ";

            // format card data
                        
            cardOutput = cardOutput + "Data from the NWS National Hurricane Center\n" +
                "Update on : " + storms[i].stormType + " " + storms[i].stormName + "\n" +
                "Data as of : " + returnData[0].latestUpdate + "\n" +
                "Current Location : " + storms[i].location.lat + " and " + storms[i].location.long + "\n" +
                "Movement : " + storms[i].movement.direction + " at " + storms[i].movement.speed + "mph\n" +
                "Peak Winds : " + storms[i].peakWinds + " mph\n" +
                "Core Pressure : " + storms[i].pressure + " mb\n" +
                "Forecast :\n";
                            
            if (storms[i].hazards.rainfall != null)
                cardOutput = cardOutput + "Rainfall : " + storms[i].hazards.rainfall + "\n";
                            
            if (storms[i].hazards.stormSurge != null)
                cardOutput = cardOutput + "Storm Surge : " + storms[i].hazards.stormSurge + "\n";
                            
            if (storms[i].hazards.surf != null)
                cardOutput = cardOutput + "Surf : " + storms[i].hazards.surf + "\n";
                            
            cardOutput = cardOutput + "Next Update : " + returnData[0].nextUpdate;
            
            // this detail is used for building response specific to an Echo Show
            activeStormDetail.stormType    = storms[i].stormType;
            activeStormDetail.stormName    = storms[i].stormName;
            activeStormDetail.ocean        = storms[i].ocean;
            activeStormDetail.locationLat  = storms[i].location.lat;
            activeStormDetail.locationLong = storms[i].location.long;
            activeStormDetail.peakWinds    = storms[i].peakWinds;
            activeStormDetail.pressure     = storms[i].pressure;
            
            activeStorms.push(activeStormDetail);
        }
    }

    // after all the storms are processed, add on a closing section
    speechOutput = speechOutput + " Please check back later as we track this potentially dangerous event. " +
    //    "If you would like to hear storm information from prior years, say something like Storm History for 2011.";
        "If you would like to learn more about storms, please say something like Tell me a Storm Fact.";
                
    var repromptText = "Would you like to learn more about storms? If so, please say give me a storm fact.";
    var shouldEndSession = false;

    if (device.type === "Legacy") {
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, device, shouldEndSession));
    } else {
        console.log("Active Storms: " + JSON.stringify(activeStorms));
        callback(sessionAttributes,
            buildVisualListResponse(cardTitle, speechOutput, cardOutput, repromptText, activeStorms, shouldEndSession));
    }
}

// this function prepares the response when the user requests a full list of storm names
function getCompleteList(intent, session, device, callback) {
    var oceanPreference;
    var repromptText = "";
    var shouldEndSession = false;
    var sessionAttributes = {};
    var speechOutput = "";
    var cardTitle = "Storm Inventory";

    console.log("Get complete list of this years storms");

    if (session.attributes) {
        oceanPreference = session.attributes.ocean;
        sessionAttributes = storeOceanAttributes(oceanPreference);
    }
    
    // first check to make sure an ocean has been selected, and if so list all of the storm names for it

    if (oceanPreference == null) {
        console.log("Did not provide storm names as no ocean was set");
        speechOutput = "If you would like to hear this years storm names " +
            "please first let me know which set by saying Atlantic Ocean or Pacific Ocean.";
            
        repromptText = "Please let me know which storm I can provide information on by saying " +
            "Atlantic Ocean or Pacific Ocean.";
    } else {
        speechOutput = speechOutput + "The 2018 storm names for the " + oceanPreference + " Ocean will be ";
        if (oceanPreference == "Atlantic") 
            currentYearStorms = atlanticStorms[0];
        else
            currentYearStorms = pacificStorms[0];
        
        console.log('current year storms: ' + JSON.stringify(currentYearStorms));
        
        for (i = 0; i < currentYearStorms.stormNames.length; i++) { 
            speechOutput = speechOutput + currentYearStorms.stormNames[i] + ", ";
        }
        speechOutput = speechOutput + ". Would you like to hear information about a prior year? " +
            "If so, please say something like storms from 2011.";
        repromptText = "Would you like to hear storm information about prior years storms? If so " +
            "please say Storm History.";
    }

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, device, shouldEndSession));
}

// this function provides details about a particular storm
function getStormDetail(intent, session, device, callback) {
    var shouldEndSession = false;
    var sessionAttributes = {};
    var cardTitle = "Storm Details";
    var cardOutput = "";
    var repromptText = "";

    //console.log("Providing detail on storm name: " + stormName);

    var stormDetailExists = false;
    var stormName = intent.slots.Storm.value;

    console.log("Providing detail on storm name: " + stormName);
    
    // attempt to find a match of the storm name provided in the slot
    for (i = 0; i < stormDetailAvail.length ; i++) {
        if (stormName != null) {
	    // check if period was added to end of storm name
	    if (stormName[stormName.length-1] === ".") {
                console.log("Removed extra period from slot name.");
                stormName = stormName.slice(0,(stormName.length - 1));;
            }

            if (stormDetailAvail[i].stormName.toLowerCase() == stormName.toLowerCase()) {
                stormDetailExists = true;
                var ocean = stormDetailAvail[i].ocean;
            }
	}
    }

    if (stormDetailExists) {
        var speechOutput = "Getting detail on storm " + stormName;

        var s3 = new aws.S3();
    
        var stormHistoryObject = 'stormHistory' + ocean + '.json';
        //var stormHistoryObject = 'stormHistoryAtlTest.json';
    
        var getParams = {Bucket : stormDataBucket, 
                         Key : stormHistoryObject}; 

        //console.log('attempt to pull an object from an s3 bucket' + JSON.stringify(getParams));

        s3.getObject(getParams, function(err, data) {
            if(err)
                console.log('Error getting history data : ' + err)
            else {
                // data retrieval was successfull - now parse through it and provide back in the reponse.
                //console.log('data retrieved: ' + data.Body);
                    
                var historyArray = eval('(' + data.Body + ')');

                // parse through the history and find the data for the requested storm
                for (j = 0; j < historyArray.length; j++) {
                    //console.log('year: ' + historyArray[j].stormYear);
                    for (k = 0; k <historyArray[j].storms.length; k++) {
                        //console.log('detail: ' + JSON.stringify(historyArray[j].storms[k]));
                        if (historyArray[j].storms[k].stormName.toLowerCase() == stormName.toLowerCase() && historyArray[j].storms[k].scale != null) {
                            console.log('found match for ' + stormName);
                            stormDetail = historyArray[j].storms[k];
                            stormDetail.year = historyArray[j].stormYear;
                        }
                    }
                }
                
                //console.log('Storm Detail: ' + JSON.stringify(stormDetail));
                
                // taking the returned object, build the response string that will be returned to the user
                
                var speechOutput = "In " + stormDetail.year + ", " + stormDetail.stormType + " " + stormDetail.stormName +
                    " was a " + stormDetail.scale + " hurricane with peak winds of " +
                    stormDetail.peakWinds + " miles per hour. ";
                    
                var speechOutput = speechOutput + stormDetail.stormName + " formed in the " + ocean + " Ocean " +
                    "as a Tropical Storm on " + stormDetail.tropStormStart + " and became a hurricane on " +
                    stormDetail.hurrStart + ". ";

                var cardTitle = stormDetail.year + " " + stormDetail.stormType + " " + stormDetail.stormName;
                    
                var cardOutput = "Became a Tropical Storm on " + stormDetail.tropStormStart + "\n" +
                    "Became a Hurricane on " + stormDetail.hurrStart + "\n" +
                    "Top Wind Speed : " + stormDetail.peakWinds + " mph\n";
                    
                if (stormDetail.landfall) {
                    speechOutput = speechOutput + "It made initial landfall hitting " + stormDetail.initialLandfallLocation + ". ";
                    cardOutput = cardOutput + "Initial Landfall Location: " + stormDetail.initialLandfallLocation + "\n";
                }
                else
                    speechOutput = speechOutput + "It did not make landfall. ";
                    
                speechOutput = speechOutput + "On " + stormDetail.hurrEnd + " the winds dropped below hurricane status. ";

                if (stormDetail.financialDamage != null) {
                    speechOutput = speechOutput + " It caused significant physical damage, totalling " + 
                        stormDetail.financialDamage + ". ";
                    cardOutput = cardOutput + "Financial Damage : " + stormDetail.financialDamage;
                }

                speechOutput = speechOutput + "If you would like to hear information about another storm, " +
                    "please prompt me with another name.";
                    
                repromptText = "Would you like to hear more about other storms?  If so, please " +
                    "let me know by saying something like Tell me about Hurricane Katrina.";

                callback(sessionAttributes,
                    buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, device, shouldEndSession));
            }
        });
    } else {
 	var speechOutput = "";
   
        // this will be processed in case there wasn't a matching storm name to provide details about
        if (stormName == null) {
            console.log("No storm name provided - redirect with a response message.")
            speechOutput = "Please provide a storm name to hear details. To check on active storms, " +
                "say current storms. ";
        // new logic added on Sept 19th - trying to catch condition where people are looking for current storms.
        } else if (stormName.toLowerCase() === "chris") {
            console.log("New storm condition");
            speechOutput = "Tropical Storm Chris is an active storm currently in the Atlantic Ocean. " +
		"For specifics on it's latest location as well as forecast details, please say, Current Storm Details.";
        } else {
            console.log("Storm name " + stormName + " did not exist in records. Respond back with message as such.")
            speechOutput = "I'm sorry, I don't have any details about " + stormName + ". " +
                "Please provide a different storm name that you would like information on. For example, " +
                "say, Tell me about Hurricane Katrina.";
        }
    
        cardOutput = speechOutput;
    
        var repromptText = "Would you like to hear about specific storms? If so, please respond with " +
            "the storm name. If you want me to check on any current storms, please say current storms.";
    
        callback(sessionAttributes,
             buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, device, shouldEndSession));
    }
}

// this function provides a random fact about tropical storms or a historical storm
function getStormFact(intent, session, device, callback) {
    var shouldEndSession = false;
    var sessionAttributes = {};
    var cardTitle = "Storm Facts";
    var repromptText = "If you would like another tropical storm fact, please say give me a storm fact.";

    const factIndex = Math.floor(Math.random() * stormFacts.length);
    const randomFact = stormFacts[factIndex].stormFact;

    var speechOutput = "Here is your tropical storm fact. " + randomFact + " If you would like to hear another fact, please " +
        "say something like Give me a storm fact.";
    var cardOutput = "Tropical Storm Fact\n" + randomFact;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, device, shouldEndSession));

}
// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, cardInfo, repromptText, device, shouldEndSession) {
    console.log("build speechlet response");
    if (device.type === "Legacy") {
        return {
            outputSpeech: {
                type: "PlainText",
                text: output
            },
            card: {
                type: "Simple",
                title: title,
                content: cardInfo
            },
            reprompt: {
                outputSpeech: {
                    type: "PlainText",
                    text: repromptText
                }
            },
            shouldEndSession: shouldEndSession
        };
    } else {
        return {
            outputSpeech: {
                type: "PlainText",
                text: output
            },
            card: {
                type: "Simple",
                title: title,
                content: cardInfo
            },
            reprompt: {
                outputSpeech: {
                    type: "PlainText",
                    text: repromptText
                }
            },
            directives: [
                {
                type: "Display.RenderTemplate",
                template: {
                    type: "BodyTemplate1",
                    token: "T123",
                    backButton: "HIDDEN",
                    backgroundImage: {
                        contentDescription: "StormPhoto",
                        sources: [
                            {
                                url: "https://s3.amazonaws.com/hurricane-data/hurricaneBackground.png"
                            }
                        ]
                    },
                    title: "Hurricane Center",
                    textContent: {
                        primaryText: {
                            text: cardInfo,
                            type: "PlainText"
                        }
                    }
                }
            }],
            shouldEndSession: shouldEndSession
        };        
    }
}

function buildVisualListResponse(title, output, cardInfo, repromptText, activeStorms, shouldEndSession) {
    var stormList = [];

    // first build the list array based on the active storms
    for (i = 0; i < activeStorms.length; i++) {
        var stormDetail = {};
            stormDetail.token = "item_" + i;

        var stormImageLocation = {};
        
        // set image based on storm type
        if (activeStorms[i].stormType === "Tropical Storm") {
            stormImageLocation.url = "https://s3.amazonaws.com/hurricane-data/images/tropicalStorm.png";
        } else if (activeStorms[i].stormType === "Hurricane") {
            stormImageLocation.url = "https://s3.amazonaws.com/hurricane-data/images/hurricane.png";
        } else {
            stormImageLocation.url = "https://s3.amazonaws.com/hurricane-data/images/tropicalDepression.png";
        }
        var stormImage = [];
            stormImage.push(stormImageLocation);    
        var stormImageSources = {};
            stormImageSources.sources = stormImage;
            stormImageSources.contentDescription = "Storm Description";

            stormDetail.image = stormImageSources;

        var stormTextContent = {};
            stormPrimaryText = {};
            stormPrimaryText.type = "RichText";
            stormPrimaryText.text = "<font size='3'>" + activeStorms[i].stormType + "<br/>" +
                activeStorms[i].stormName + "</font>";
            stormSecondaryText = {};
            stormSecondaryText.type = "RichText";
            stormSecondaryText.text = "Peak Winds - " + activeStorms[i].peakWinds + " mph";

            stormTextContent.primaryText   = stormPrimaryText;
            stormTextContent.secondaryText = stormSecondaryText;

            stormDetail.textContent = stormTextContent;
        
            stormList.push(stormDetail);
    }

    // now return the object formated in the proper way and include the storm list
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: cardInfo
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        directives: [
            {
            type: "Display.RenderTemplate",
            template: {
                type: "ListTemplate2",
                token: "T123",
                backButton: "HIDDEN",
                backgroundImage: {
                    contentDescription: "StormPhoto",
                    sources: [
                        {
                            url: "https://s3.amazonaws.com/hurricane-data/hurricaneBackground.png"
                        }
                    ]
                },
                title: "Hurricane Center",
                listItems : stormList
            }
        }],
        shouldEndSession: shouldEndSession
    };        
}

function buildAudioResponse(title, output, cardInfo, repromptText, shouldEndSession) {
    console.log("build audio response");
    return {
        outputSpeech: {
            type: "SSML",
            ssml: output
        },
        card: {
            type: "Simple",
            title: title,
            content: cardInfo
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

function buildNoSessionResponse(speechletResponse) {
    return {
	version: "1.0",
	response: speechletResponse
    };
}

function buildFulfillQueryResponse(canFulfill, slotInfo) {
    console.log("build fulfill query response");
    if (slotInfo !== null) {
        return {
    	    "canFulfillIntent": {
	        "canFulfill": canFulfill,
	        "slots": slotInfo
	    }
        };
    } else {
	return {
	    "canFulfillIntent": {
		"canFulfill": canFulfill
	    }
	};
    }
}

// this validates information coming in from slots and manufactures the correct responses
function buildSlotDetail(slotName, slots) {
    console.log("build slot detail");
    console.log("Slots:" + JSON.stringify(slots));

    if (slotName === "Ocean") {
	return {
	    "Ocean": {
		"canUnderstand": "YES",
		"canFulfill": "NO"
	    }
	};
    } else if (slotName === "Date") {
	// validate that the date of the storm is in the last thirty years
        if (slots.Date.value > 1990 && slots.Date.value < 2018) {
            return {
                "Date": {
                    "canUnderstand": "YES",
                    "canFulfill": "YES"
                }
            };
	} else {
            return {
                "Date": {
                    "canUnderstand": "YES",
                    "canFulfill": "NO"
                }
            };
	}
    } else if (slotName === "Storm") {
	// validate that the storm name is in the available list of names
	var stormDetailExists = false;
	if (slots.Storm.value) {
    	    for (var i = 0; i < stormDetailAvail.length ; i++) {
                if (stormDetailAvail[i].stormName.toLowerCase() == slots.Storm.value.toLowerCase()) {
                    stormDetailExists = true;
                }
	    }
	} else {
	    console.log("No storm name provided");
	}
	// create correct response object
	if (stormDetailExists) {
            return {
                "Storm": {
                    "canUnderstand": "YES",
                    "canFulfill": "YES"
                }
	    };
	} else {
            return {
                "Storm": {
                    "canUnderstand": "YES",
                    "canFulfill": "NO"
                }
            };
	}
    } else if (slotName === "HurricaneStrength") {
	// validate that the hurricane level is valid
	if (slots.HurricaneStrength.value) {
	    console.log("Validate Hurricane Strength Slot");
	    var validStrengthLevel = false;
	    if (slots.HurricaneStrength.value === "1") {
		validStrengthLevel = true;
	    } else if (slots.HurricaneStrength.value === "2") {
                validStrengthLevel = true;
            } else if (slots.HurricaneStrength.value === "3") {
                validStrengthLevel = true;
            } else if (slots.HurricaneStrength.value === "4") {
                validStrengthLevel = true;
            } else if (slots.HurricaneStrength.value === "5") {
                validStrengthLevel = true; 
	    }
	    console.log("Flag:" + validStrengthLevel);
	    // now create response object based on if the slot was valid
	    if (validStrengthLevel) {
		return {
		    "HurricaneStrength": {
			"canUnderstand": "YES",
			"canFulfill": "YES"
		    }
		};
	    } else {
                return {
                    "HurricaneStrength": {
                        "canUnderstand": "YES",
                        "canFulfill": "NO"
                    }
                };
	    }
	} else {
	    // this handles if the query was made without a valid slot
            return {
                "HurricaneStrength": {
                    "canUnderstand": "NO",
                    "canFulfill": "NO"
                }
            };
	}
    } else {
	// this means that there is no match in the slot provided - respond accordingly
	return {
	    "slotName1": {
                "canUnderstand": "NO",
                "canFulfill": "NO"
            }
        };
    }
}
