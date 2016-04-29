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

    // Dispatch to the individual skill handlers
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
    } else if ("GetStormDetail" === intentName) {
        getStormDetail(intent, session, callback);
    } else if ("AMAZON.StartOverIntent" === intentName) {
        getWelcomeResponse(callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(callback);
    } else if ("AMAZON.RepeatIntent" === intentName) {
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
}

// --------------- Base Functions that are invoked based on standard utterances -----------------------

// this is the function that gets called to format the response to the user when they first boot the app
function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to the Hurricane Center, the best source for information " +
        "related to tropical storms, past or present. Please begin by asking me " +
        "about current storms for 2016 or storms for prior years.";
        
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Please tell me how I can help you by saying phrases like, " +
        "list storm names or storm history for 2012.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
}

// this is the function that gets called to format the response to the user when they ask for help
function getHelpResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Help";
    // this will be what the user hears after asking for help
    var speechOutput = "The Hurricane Center provides information about tropical storms. " +
        "If you would like to hear about storms from this year, say What are storms from this year. " +
        "For information related to storms from prior years, please say What is the storm history " +
        "for a specific year.";
        
    // if the user still does not respond, they will be prompted with this additional information
    var repromptText = "Please tell me how I can help you by saying phrases like, " +
        "list storm names or storm history.";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
}

// this is the function that gets called to format the response when the user is done
function handleSessionEndRequest(callback) {
    var cardTitle = "Thanks for using Hurricane Center";
    var speechOutput = "Thank you for checking in with the Hurricane Center. Have a nice day!";
    // Setting this to true ends the session and exits the skill.
    var shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, speechOutput, null, shouldEndSession));
}

// Sets the ocean in the session and prepares the speech to reply to the user.
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
        speechOutput = "I'm not sure which ocean you are looking for. Please try again by " +
            "saying Atlantic or Pacific.";
        repromptText = "I'm not sure which ocean you want information on. " +
            "Please say either Atlantic or Pacific.";
    }

    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
}

function storeOceanAttributes(ocean) {
    return {
        ocean: ocean
    };
}

// Sets the ocean name in case it has not done so already
function getStormNames(intent, session, callback) {
    var oceanPreference;
    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";
    var cardTitle = "Hurricane Center";

    console.log("session attributes: " + sessionAttributes);

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
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
}

// This function returns storm history. It checks to make sure that the year one where data
// can be provided back, and if so pulls it from an S3 bucket. The data is parsed and a response
// is formatted
function getWhichYear(intent, session, callback) {
    var oceanPreference;
    var shouldEndSession = false;
    var sessionAttributes = {};
    var speechOutput = "";
    var cardOutput = "";
    var repromptText = "";
    var cardTitle = "Storm History";

    if (session.attributes) {
        oceanPreference = session.attributes.ocean;
        sessionAttributes = storeOceanAttributes(oceanPreference);
    }

    console.log("session attributes: " + JSON.stringify(session.attributes));
    console.log("intent attributes: " + JSON.stringify(intent.slots.Date));

    if (intent.slots.Date.value) {
        requestYear = intent.slots.Date.value;
        cardTitle = "Storm History for " + requestYear;
        if (requestYear > 2004 && requestYear < 2016) {
            
            var s3 = new aws.S3();
    
            var ocean = "Atlantic";
    
            var getParams = {Bucket : 'hurricane-data', 
                             Key : 'stormHistoryAtlantic.json'}; 

            console.log('attempt to pull an object from an s3 bucket' + JSON.stringify(getParams));

            s3.getObject(getParams, function(err, data) {
                if(err)
                    console.log('Error getting history data : ' + err)
                else {
                    // data retrieval was successfull - now parse through it and provide back in the reponse.
                    //console.log('data retrieved: ' + data.Body);
                    
                    var historyArray = eval('(' + data.Body + ')');

                    // parse through the history and find the data for the requested year
                    for (j = 0; j < historyArray.length; j++) {
                    //    console.log('year: ' + historyArray[j].stormYear);
                        if (historyArray[j].stormYear == requestYear)
                            var stormHistoryArray = historyArray[j];
                    }
                    
                    console.log('using data' + JSON.stringify(stormHistoryArray));
                    
                    // build the response back based on stringing together all information for the year
                    var stormReading = {};
                    var moreStormData = [];
                    
                    speechOutput = 'In the ' + ocean + ' ocean ' +
                        'there were ' + stormHistoryArray.storms.length + 
                        ' storms in ' + stormHistoryArray.stormYear + '. ';

                    //stormReading = stormReading + 'The storm names were ';

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

                    console.log('process hurricane array' + JSON.stringify(hurricaneNames));

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
                        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
                };
            });
            
        } else {
            console.log('Year selected for storm history outside of available data');

            speechOutput = "Sorry, I don't have information for " + requestYear + ". " +
                "I do have information on storms between 2005 and 2016.  Please let me " +
                "know which year I can provide within that range.";

            repromptText = "Please state a year between 2005 and 2016. " +
                "For example, say Storms for 2012.";

            callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
            };
        }
    else {
        console.log('No year provided for storm history');
        
        speechOutput = "Which year would you like storm history for?";

        repromptText = "Please state a year you would like to hear storm history for. " +
            "For example say Storms for 2012.";

        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
    }
}

// this function gets information about this years storms
function getThisYearStorm(intent, session, callback) {
    var oceanPreference;
    var repromptText = "";
    var shouldEndSession = false;
    var sessionAttributes = {};
    var speechOutput = "";
    var cardOutput = "";
    var cardTitle = "Storm Information for 2016";

    if (session.attributes) {
        oceanPreference = session.attributes.ocean;
        sessionAttributes = storeOceanAttributes(oceanPreference);
    }

    // first check if there are any active storms, and if so provide current details
    // NOTE: this will be completed at a later time
    
    // if there are no active storms, provide what the names will be
    speechOutput = "There aren't any active storms yet for this year. ";
    
    if (oceanPreference == null) {
        speechOutput = speechOutput + "If you would like to hear this years storm names " +
            "please let me know which set by saying Atlantic Ocean or Pacific Ocean";
        cardOutput = speechOutput;
        repromptText = "Please let me know which ocean you would like to hear storm data " +
            "for by saying Atlantic Ocean or Pacific Ocean";
    } else {
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
         buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
}

// this function prepares the response when the user requests a full list of storm names
function getCompleteList(intent, session, callback) {
    var oceanPreference;
    var repromptText = "";
    var shouldEndSession = false;
    var sessionAttributes = {};
    var speechOutput = "";
    var cardTitle = "Storm Inventory";

    console.log("session attributes: " + sessionAttributes);

    if (session.attributes) {
        oceanPreference = session.attributes.ocean;
        sessionAttributes = storeOceanAttributes(oceanPreference);
    }
    
    // first check to make sure an ocean has been selected, and if so list all of the storm names for it

    if (oceanPreference == null) {
        speechOutput = "If you would like to hear this years storm names " +
            "please first let me know which set by saying Atlantic Ocean or Pacific Ocean.";
            
        repromptText = "Please let me know which storm I can provide information on by saying " +
            "Atlantic Ocean or Pacific Ocean.";
    } else {
        speechOutput = speechOutput + "The 2016 storm names for the " + oceanPreference + " Ocean will be ";
        if (oceanPreference == "Atlantic") 
            currentYearStorms = atlanticStorms[0];
        else
            currentYearStorms = pacificStorms[0];
        
        for (i = 0; i < currentYearStorms.stormNames.length; i++) { 
            speechOutput = speechOutput + currentYearStorms.stormNames[i] + ", ";
        }
        speechOutput = speechOutput + ". Would you like to hear information about a prior year? " +
            "If so, please say something like storms from 2011.";
        repromptText = "Would you like to hear storm information about prior years storms? If so " +
            "please say Storm History.";
    }
    
    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
}

// this function provides details about a particular storm
function getStormDetail(intent, session, callback) {
    var shouldEndSession = false;
    var sessionAttributes = {};
    var cardTitle = "Storm Details";
    var cardOutput = "";
    var repromptText = "";

    // this is used to process if the name passed in has available detail
    var stormDetailAvail = ["Danny", "Katrina", "Sandy", "Irene", "Ike"];
    var stormDetailExists = false;

    var stormName = intent.slots.Storm.value;

    console.log("storm name: " + stormName);
    
    //console.log("session attributes: " + sessionAttributes);

    for (i = 0; i < stormDetailAvail.length ; i++) {
        if (stormName != null)
            if (stormDetailAvail[i].toLowerCase() == stormName.toLowerCase())
                stormDetailExists = true;
    }

    if (stormDetailExists) {
        var speechOutput = "Getting detail on storm " + stormName;

        var s3 = new aws.S3();
    
        var ocean = "Atlantic";
    
        var getParams = {Bucket : 'hurricane-data', 
                         Key : 'stormHistoryAtlantic.json'}; 

        console.log('attempt to pull an object from an s3 bucket' + JSON.stringify(getParams));

        s3.getObject(getParams, function(err, data) {
            if(err)
                console.log('Error getting history data : ' + err)
            else {
                // data retrieval was successfull - now parse through it and provide back in the reponse.
                //console.log('data retrieved: ' + data.Body);
                    
                var historyArray = eval('(' + data.Body + ')');

                // parse through the history and find the data for the requested storm
                for (j = 0; j < historyArray.length; j++) {
                    console.log('year: ' + historyArray[j].stormYear);
                    for (k = 0; k <historyArray[j].storms.length; k++) {
                        //console.log('detail: ' + JSON.stringify(historyArray[j].storms[k]));
                        if (historyArray[j].storms[k].stormName.toLowerCase() == stormName.toLowerCase() && historyArray[j].storms[k].scale != null) {
                            console.log('found match');
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
                    
                var speechOutput = speechOutput + stormDetail.stormName + " formed in the Atlantic Ocean " +
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
                    
                speechOutput = speechOutput + "On " + stormDetail.hurrEnd + " the winds dropped below hurricane status.";

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
                    buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));

            }
        });
    } else {
    
        // this will be processed in case there wasn't a matching storm name to provide details about
        if (stormName == null)
            var speechOutput = "Please provide a storm name to hear details.";
        else
            var speechOutput = "I'm sorry, I don't have any details about " + stormName + ". " +
                "Please provide a different storm name that you would like information on. For example, " +
                "say Tell me about Hurricane Katrina.";
    
        cardOutput = speechOutput;
    
        var repromptText = "Would you like to hear more about other storms?";
    
        callback(sessionAttributes,
             buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
    }
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, cardInfo, repromptText, shouldEndSession) {
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
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
