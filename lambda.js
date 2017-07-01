/**
 * This skill provides details about hurricanes through 2016, both prior years as well as current
 */

var aws = require('aws-sdk');

// this is used by the VoiceLabs analytics
var APP_ID = 'amzn1.echo-sdk-ams.app.709af9ef-d5eb-48dd-a90a-0dc48dc822d6';
var VoiceInsights =require('voice-insights-sdk'),
  VI_APP_TOKEN = '17373460-06c4-11a7-2596-0eb19d13e26e';

// Get this years storm names

var atlanticStorms = [
    {
        "stormYear": 2017,
        "stormNames": [
            "Arlene", 
            "Bret", 
            "Cindy",
            "Don",
            "Emily",
            "Franklin",
            "Gert",
            "Harvey",
            "Irma",
            "Jose",
            "Katia",
            "Lee",
            "Maria",
            "Nate",
            "Ophelia",
            "Philippe",
            "Rina",
            "Sean",
            "Tammy",
            "Vince",
            "Whitney"
        ]
    }
];

var pacificStorms = [
    {
        "stormYear": 2017,
        "stormNames": [
            "Adrian", 
            "Beatriz", 
            "Calvin",
            "Dora",
            "Eugene",
            "Fernanda",
            "Greg",
            "Hilary",
            "Irwin",
            "Jova",
            "Kenneth",
            "Lidia",
            "Max",
            "Norma",
            "Otis",
            "Pilar",
            "Ramon",
            "Selma",
            "Todd",
            "Veronica",
            "Wiley",
            "Xina",
            "York",
            "Zelda"
        ]
    }
];

// storm names that historical information is available for in the datasets

var stormDetailAvail = [
            {"stormName":"Danny", "ocean":"Atlantic", "stormYear":2015}, 
            {"stormName":"Katrina", "ocean":"Atlantic", "stormYear":2005}, 
            {"stormName":"Sandy", "ocean":"Atlantic", "stormYear":2012}, 
            {"stormName":"Irene", "ocean":"Atlantic", "stormYear":2011}, 
            {"stormName":"Ike", "ocean":"Atlantic", "stormYear":2008},
            {"stormName":"Gonzalo", "ocean":"Atlantic", "stormYear":2014},
            {"stormName":"Isaac", "ocean":"Atlantic", "stormYear":2012},
            {"stormName":"Alex", "ocean":"Atlantic", "stormYear":2010},
            {"stormName":"Karl", "ocean":"Atlantic", "stormYear":2010},
            {"stormName":"Dean", "ocean":"Atlantic", "stormYear":2007},
            {"stormName":"Ernesto", "ocean":"Atlantic", "stormYear":2006},
            {"stormName":"Rita", "ocean":"Atlantic", "stormYear":2005},
            {"stormName":"Wilma", "ocean":"Atlantic", "stormYear":2005},
            {"stormName":"Linda", "ocean":"Pacific", "stormYear":2015},
            {"stormName":"Patricia", "ocean":"Pacific", "stormYear":2015},
            {"stormName":"Odile", "ocean":"Pacific", "stormYear":2014},
            {"stormName":"Manuel", "ocean":"Pacific", "stormYear":2013},
            {"stormName":"Paul", "ocean":"Pacific", "stormYear":2012},
            {"stormName":"Jova", "ocean":"Pacific", "stormYear":2011},
            {"stormName":"Andrew", "ocean":"Atlantic", "stormYear":1992},
            {"stormName":"Matthew", "ocean":"Atlantic", "stormYear":2016}, 
];

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
            console.log("session ended request received");
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
    getWelcomeResponse(session, callback);
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
        country = intentRequest.locale;        

    // Dispatch to the individual skill handlers
    if ("ListStormNames" === intentName) {
        getStormNames(intent, session, callback);
    } else if ("SetOceanPreference" === intentName) {
        setOceanInSession(intent, session, callback);
    } else if ("StormsFromPriorYears" == intentName && intent.slots.Date.value == 2017) {
        getCurrentYearHistory(intent, session, callback);
    } else if ("StormsFromPriorYears" == intentName && intent.slots.Date.value != 2017) {
        getWhichYear(intent, session, callback);
    } else if ("ThisYearsStorms" === intentName || "AMAZON.YesIntent" === intentName) {
        console.log("Intent Name: " + intentName + " From: " + country);
        getThisYearStorm(intent, session, callback);
    } else if ("CurrentYearHistory" === intentName) {
        getCurrentYearHistory(intent, session, callback);
    } else if ("CompleteListOfStorms" === intentName) {
        getCompleteList(intent, session, callback);
    } else if ("GetStormDetail" === intentName) {
        getStormDetail(intent, session, callback);
    } else if ("GiveStormFact" === intentName) {
        getStormFact(intent, session, callback);        
    } else if ("AMAZON.StartOverIntent" === intentName) {
        getWelcomeResponse(session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(callback);
    } else if ("AMAZON.RepeatIntent" === intentName) {
        getWelcomeResponse(session, callback);
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName || "AMAZON.NoIntent" === intentName) {
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
function getWelcomeResponse(session, callback) {
    var sessionAttributes = {};
    var shouldEndSession = false;
    var cardTitle = "Welcome to Hurricane Center";

    var speechOutput = "Welcome to the Hurricane Center, the best source for information " +
        "related to tropical storms, past or present. There are no active tropical storms " +
        "right now, but if you would like to learn more about storms, please say something " +
        "like tell me a storm fact.";
    var repromptText = "Please tell me how I can help you by saying phrases like, " +
        "list storm names or storm history for 2012.";
    var activeStorms = false;

    console.log("Get Welcome Message");
    
    // initialize voice analytics 
    VoiceInsights.initialize(session, VI_APP_TOKEN);

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
                // rotate through the array of current storm data to determine where the active storms are
                for (i = 0; i < storms.length; i++) {
                    console.log('storm data: ' + JSON.stringify(returnData[0].storms[i]));
                    if (storms[i].formed) {
                        activeStormNames.push(returnData[0].storms[i].stormType + " " + returnData[0].storms[i].stormName);
                        activeStorms++;
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
                        speechOutput = speechOutput + activeStormNames[0] + " is currently active in the Atlantic Ocean. ";
                    } else if (activeStorms === 2) {
                        speechOutput = speechOutput + activeStormNames[0] + " and " + activeStormNames[1] + " are currently " +
                            "active in the Atlantic Ocean. ";
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
                } else if (activeStormAtlantic === true && activeStormPacific === true)
                    speechOutput = speechOutput + "There are active storms in both the Atlantic and Pacific Oceans. ";
                //speechOutput = speechOutput + "<break time=\"1s\"/>";
                speechOutput = speechOutput + "Please say yes if you would like to hear more details.";
                repromptText = "There are currently active tropical storms. To hear specific details about them, just say yes.";
            }
        }

        VoiceInsights.track('WelcomeMessage', null, speechOutput, (err, res) => {
	        console.log('voice insights logged' + JSON.stringify(res));
	        callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
        });
    });
}

// this is the function that gets called to format the response to the user when they ask for help
function getHelpResponse(callback) {
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

    VoiceInsights.track('HelpMessage', null, speechOutput, (err, res) => {
	    console.log('voice insights logged' + JSON.stringify(res));
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
    });
}

// this is the function that gets called to format the response when the user is done
function handleSessionEndRequest(callback) {
    var cardTitle = "Thanks for using Hurricane Center";
    var speechOutput = "Thank you for checking in with the Hurricane Center. Have a nice day!";
    // Setting this to true ends the session and exits the skill.
    var shouldEndSession = true;

    VoiceInsights.track('EndMessage', null, speechOutput, (err, res) => {
	    console.log('voice insights logged' + JSON.stringify(res));

        callback({}, buildSpeechletResponse(cardTitle, speechOutput, speechOutput, null, shouldEndSession));
    });
}

// Sets the ocean in the session and prepares the speech to reply to the user.
function setOceanInSession(intent, session, callback) {
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

    VoiceInsights.track('SetOceanPref', null, speechOutput, (err, res) => {
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
    });
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

    VoiceInsights.track('GetStormNames', null, speechOutput, (err, res) => {
        console.log('voice insights logged' + JSON.stringify(res));

        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
    });
}

// This highlights the summary of storms for the current year - 2017
function getCurrentYearHistory(intent, session, callback) {
    var oceanPreference;
    var sessionAttributes = {};
    var shouldEndSession = false;
    var cardTitle = "Storm History for 2017";

    console.log("Get Current Year History");

    var currYearStormArray = [
            {"stormName":"Arlene", "ocean":"Atlantic", "level":"Tropical Storm"}, 
            {"stormName":"Bret", "ocean":"Atlantic", "level":"Tropical Storm"}, 
            {"stormName":"Cindy", "ocean":"Atlantic", "level":"Tropical Storm"}, 
            {"stormName":"Adrian", "ocean":"Pacific", "level":"Tropical Storm"}, 
            {"stormName":"Beatriz", "ocean":"Pacific", "level":"Tropical Storm"},
            {"stormName":"Calvin", "ocean":"Pacific", "level":"Tropical Storm"},
            {"stormName":"Dora", "ocean":"Pacific", "level":"Tropical Storm"}
        ];

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

    var speechOutput = "It is early in the season, and Hurricane Dora in the Pacific has been " +
        "the only storm to reach hurricane status. ";
//    var speechOutput = "So far this year there have been " + atlanticHurricanes +
//        " hurricanes in the Atlantic and " + pacificHurricanes +
//    var speechOutput = "It is still early in the season, and there have been no hurricanes " +
//        "in either the Atlantic or Pacific Oceans. " +
        speechOutput = speechOutput + "There have been " + atlanticTropStorms +
        " Tropical Storms in the Atlantic and " + pacificTropStorms + " in the Pacific. " +
//        " I have detailed information about Hurricane Matthew. If you would like details " +
//        " please say, Details on Hurricane Matthew. " +
        " If you would like to hear about current active storms please say " +
        " Current Storms and I will give a detailed overview of what is currently active. ";
        
    var cardOutput = "Atlantic Ocean\n" + atlanticHurricanes +
        " Hurricanes\n" + atlanticTropStorms +
        " Tropical Storms\n" + "Pacific Ocean\n" + pacificHurricanes +
        " Hurricanes\n" + pacificTropStorms +
        " Tropical Storms\n" +
        " Major Storms\n" +
 //       " Hurricane Matthew - caused $5 Billion in damage in Haiti and Southeastern " +
        "United States.";

    var repromptText = "If you would like information about current storms, please " +
        "say List Current Storms.";

    VoiceInsights.track('GetCurrentYearHistory', null, speechOutput, (err, res) => {
        console.log('voice insights logged' + JSON.stringify(res));
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
    });
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
        if (requestYear > 1990 && requestYear < 2017) {
            
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

                    VoiceInsights.track('StormHistory', stormHistoryArray.stormYear, speechOutput, (err, res) => {
                        console.log('voice insights logged' + JSON.stringify(res));
                        callback(sessionAttributes,
                            buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
                    });
                };
            });
            
        } else {
            console.log('Year selected for storm history outside of available data');

            speechOutput = "Sorry, I don't have information for " + requestYear + ". " +
                "I do have information on storms between 1991 and 2017.  Please let me " +
                "know which year I can provide within that range.";

            repromptText = "Please state a year between 1991 and 2017. " +
                "For example, say Storms for 2012.";

            callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
            };
        }
    else {
        console.log("No year provided. Reprompt user to select a year for storm history");
        
        speechOutput = "Which year would you like storm history for? If you would like me to check for " +
            "storms that are currently active, please say something like current storms. ";
        repromptText = "Please state a year you would like to hear storm history for. " +
            "For example say Storms for 2012, or for storms that are currently active, say current storms. ";

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
    var cardTitle = "Storm Information for 2017";

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

                VoiceInsights.track('ListCurrentYearStorms', null, speechOutput, (err, res) => {
                    console.log('voice insights logged' + JSON.stringify(res));
                    callback(sessionAttributes,
                        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
                });
                
            } else {
                console.log('read detail about an active storm');
                var storms = returnData[0].storms;
                var latestUpdate = returnData[0].latestUpdate;
                
                replyActiveStorms(storms, returnData, intent, session, callback);

            }
        }
    });
}

// this function prepares the response on active storms
function replyActiveStorms(storms, returnData, intent, session, callback) {
    var sessionAttributes = {};
    var cardOutput = "";
    var cardTitle = "Storm Information for 2017";
    
    if (session.attributes) {
        oceanPreference = session.attributes.ocean;
        sessionAttributes = storeOceanAttributes(oceanPreference);
    }

    // parse through the array and build an appropriate welcome message
    var speechOutput = "Here is the latest forecast. ";
    //    speechOutput = speechOutput + "<break time=\"1s\"/>";
                
    // go through the returned array and build language and cards depicting the storm data.
    for (i = 0; i < storms.length; i++) {
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
                    "A Hurricane Watch has been issued for " + storms[i].tropStormLocation + ". " +
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
        }
    }

    // after all the storms are processed, add on a closing section
    speechOutput = speechOutput + " Please check back later as we track this potentially dangerous event. " +
        "If you would like to hear storm information from prior years, say something like Storm History for 2011.";
                
    var repromptText = "Would you like to learn more about storms? If so, please say give me a storm fact.";
    var shouldEndSession = false;

    VoiceInsights.track('GetActiveStorm', null, speechOutput, (err, res) => {
        console.log('voice insights logged' + JSON.stringify(res));
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
    });
}

// this function prepares the response when the user requests a full list of storm names
function getCompleteList(intent, session, callback) {
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
        speechOutput = speechOutput + "The 2017 storm names for the " + oceanPreference + " Ocean will be ";
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

    VoiceInsights.track('GetCompleteList', null, speechOutput, (err, res) => {
        console.log('voice insights logged' + JSON.stringify(res));

        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, speechOutput, repromptText, shouldEndSession));
    });
}

// this function provides details about a particular storm
function getStormDetail(intent, session, callback) {
    var shouldEndSession = false;
    var sessionAttributes = {};
    var cardTitle = "Storm Details";
    var cardOutput = "";
    var repromptText = "";

    //console.log("Providing detail on storm name: " + stormName);

    var stormDetailExists = false;
    var stormName = intent.slots.Storm.value;

    console.log("Providing detail on storm name: " + stormName);
    
    //console.log("session attributes: " + sessionAttributes);

    for (i = 0; i < stormDetailAvail.length ; i++) {
        if (stormName != null)
            if (stormDetailAvail[i].stormName.toLowerCase() == stormName.toLowerCase()) {
                stormDetailExists = true;
                var ocean = stormDetailAvail[i].ocean;
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

                VoiceInsights.track('GetStormDetail', stormDetail.stormName, speechOutput, (err, res) => {
                    console.log('voice insights logged' + JSON.stringify(res));
    
                    callback(sessionAttributes,
                        buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
                });
            }
        });
    } else {
    
        // this will be processed in case there wasn't a matching storm name to provide details about
        if (stormName == null) {
            console.log("No storm name provided - redirect with a response message.")
            var speechOutput = "Please provide a storm name to hear details. To check on active storms, " +
                "say current storms. ";
        } else {
            console.log("Storm name " + stormName + " did not exist in records. Respond back with message as such.")
            var speechOutput = "I'm sorry, I don't have any details about " + stormName + ". " +
                "Please provide a different storm name that you would like information on. For example, " +
                "say Tell me about Hurricane Katrina.";
        }
    
        cardOutput = speechOutput;
    
        var repromptText = "Would you like to hear about specific storms? If so, please respond with " +
            "the storm name. If you want me to check on any current storms, please say current storms.";
    
        callback(sessionAttributes,
             buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
    }
}

// this function provides a random fact about tropical storms or a historical storm
function getStormFact(intent, session, callback) {
    var shouldEndSession = false;
    var sessionAttributes = {};
    var cardTitle = "Storm Facts";
    var repromptText = "If you would like another tropical storm fact, please say give me a storm fact.";

    var stormFacts = [
        'The threshold for a tropical storm is sustained winds at 39 miles per hour. Tropical storms below this level are considered a tropical depression.',
        'The threshold for a hurricane is sustained winds at 74 miles per hour.',
        'The Saffir–Simpson scale categories hurricanes into five levels. The classifications can provide some indication of the potential damage and flooding a hurricane will cause upon landfall.',
        'In the Northern hemisphere, the tropical storm season begins on June 1st. Storms may begin before this date, however they are quite rare.',
        'Category one hurricanes are defined as having sustained winds ranging from 74 to 95 miles per hour. Storms of this intensity usually cause no significant structural damage to most well-constructed permanent structures. They can topple unanchored mobile homes, as well as uproot or snap weak trees.',
        'Category two hurricanes are defined as having sustained winds ranging from 96 to 110 miles per hour. Storms of this intensity often damage roofing material and inflict damage upon poorly constructed doors and windows.',
        'Category three hurricanes are defined as having sustained winds ranging from 111 to 129 miles per hour. At this level, they are considered a major hurricane, and can cause some structural damage to small residences and utility buildings, particularly those of wood frame or manufactured materials.',
        'Category four hurricanes are defined as having sustained winds ranging from 130 to 156 miles per hour. At this level, they can cause complete structural failure on small residences. Mobile and manufactured homes are often flattened. Most trees, except for the heartiest, are uprooted or snapped, isolating many areas.',
        'Category five hurricanes are the strongest recorded, and are defined as having sustained winds above 157 miles per hour. At this level, they can cause catastophic damage if making landfall, both to structures and trees. Widespread power outages are common, and rebuilding efforts can take years.',
        'No Category five hurricane is known to have made landfall as such in the eastern Pacific basin.',
        'Hurricane Patricia was the most intense hurricane on record in the Western Hemisphere. On October 23rd, 2015, the maximum sustained winds were recorded at 215 mph for a one minute interval, and it recorded a pressure reading of 872 millibars. The storm lessened before hitting the Pacific coast of Mexico near Cuixmala, Jalisco, with winds of 150 mph. This made it the strongest landfalling hurricane on record along the Pacific coast of Mexico.',
        'Hurricane Felix was the southernmost landfalling Category 5 hurricane in the Atlantic. It is also the most recent Atlantic hurricane to make landfall as a Category 5. Hurricane Felix made landfall in 2007, with initial impacts to Honduras and Nicaragua. At least 133 people were reported dead. At least 130 of them were in Nicaragua.',
        'Hurricane Katrina was the costliest natural disaster and one of the five deadliest hurricanes in the history of the United States. Overall, at least 1,245 people died in the hurricane and subsequent floods, making it the deadliest United States hurricane since the 1928 Okeechobee hurricane. Total property damage was estimated at $108 billion in 2005 US Dollars. ',
        'Hurricane Rita was the fourth-most intense Atlantic hurricane ever recorded and the most intense tropical cyclone ever observed in the Gulf of Mexico. Southeast Texas where Rita made landfall suffered from catastrophic-to-severe flooding and wind damage.',
        'Hurricane Wilma was the most intense tropical cyclone ever recorded in the Atlantic basin, and was the most intense tropical cyclone recorded in the western hemisphere until Hurricane Patricia in 2015. Wilma made several landfalls, with the most destructive effects felt in the Yucatán Peninsula of Mexico, Cuba, and the US state of Florida.',
        'The 2005 Atlantic hurricane season was the most active Atlantic hurricane season in recorded history, shattering numerous records. The impact of the season was widespread and ruinous with an estimated 3,913 deaths and record damage of about $159.2 billion.',
        'Hurricane Hugo was a powerful Cape Verde-type hurricane that caused widespread damage and loss of life in the Leeward Islands, Puerto Rico, and the Southeast United States. It formed over the eastern Atlantic near the Cape Verde Islands on September 9, 1989. Hurricane Hugo caused 34 fatalities (most by electrocution or drowning) in the Caribbean and 27 in South Carolina, left nearly 100,000 homeless, and resulted in $10 billion in damage overall, making it the most damaging hurricane ever recorded at the time.',
        'Hurricane Andrew was a Category 5 Atlantic hurricane that struck South Florida in August 1992, and was the most destructive hurricane in Floridas history. The storm was also ranked as the costliest hurricane in United States history until being surpassed by Katrina in 2005. Andrew caused major damage in the Bahamas and Louisiana as well, but the greatest impact was in South Florida, where it produced devastating winds with speeds as high as 165 mph.',
        'Forming in 1969, Hurricane Camille was the second strongest U.S. landfalling hurricane in recorded history in terms of atmospheric pressure, behind the Labor Day Hurricane in 1935. The hurricane flattened nearly everything along the coast of the U.S. state of Mississippi, and caused additional flooding and deaths inland while crossing the Appalachian Mountains of Virginia.',
        'The 1935 Labor Day Hurricane was the most intense hurricane to make landfall in the United States on record, as well as the 3rd most intense Atlantic hurricane ever. The compact and intense hurricane caused extreme damage in the upper Florida Keys, as a storm surge of approximately 18 to 20 feet swept over the low-lying islands. The hurricane also caused additional damage in northwest Florida, Georgia, and the Carolinas.',
        'The 1938 New England Hurricane (also referred to as the Great New England Hurricane and Long Island Express) was one of the deadliest and most destructive tropical cyclones to strike New England.  It is estimated that the hurricane killed 682 people, damaged or destroyed more than 57,000 homes. Damaged trees and buildings were still seen in the affected areas as late as 1951.',
        'Hurricane Mitch was the second deadliest Atlantic hurricane on record, after the Great Hurricane of 1780. Nearly 11,000 people were killed with over 11,000 left missing by the end of 1998. Additionally, roughly 2.7 million were left homeless as a result of the hurricane. Hurricane Mitch dropped historic amounts of rainfall in Honduras, Guatemala, and Nicaragua, with unofficial reports of up to 75 inches.',
        'Hurricane Carol in 1953 was the strongest storm of the Atlantic hurricane season that year, and the first Category 5 hurricane in the Atlantic basin since the 1938 New England hurricane. Carol is also the first named storm to attain Category 5 status. Carol developed on August 28 off the west coast of Africa, although the Weather Bureau did not initiate advisories until five days later.',
        'In 1992, Hurricane Iniki was the most powerful hurricane to strike the U.S. state of Hawaii in recorded history. Iniki struck the island of Kauai on September 11 at peak intensity. It had winds of 145 miles per hour. Damage was greatest on Kauai, where the hurricane destroyed more than 1,400 houses and severely damaged more than 5,000.'
    ];
    
    const factIndex = Math.floor(Math.random() * stormFacts.length);
    const randomFact = stormFacts[factIndex];

    var speechOutput = "Here is your tropical storm fact. " + randomFact + " If you would like to hear another fact, please " +
        "say something like Give me a storm fact.";
    var cardOutput = "Tropical Storm Fact\n" + randomFact;

    VoiceInsights.track('GetStormFact', null, speechOutput, (err, res) => {
        console.log('voice insights logged' + JSON.stringify(res));
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, cardOutput, repromptText, shouldEndSession));
    });

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

function buildAudioResponse(title, output, cardInfo, repromptText, shouldEndSession) {
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

