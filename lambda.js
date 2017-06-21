'use strict';
var Alexa = require("alexa-sdk");
var appId = 'amzn1.ask.skill.95647780-a17b-4734-9c8b-b089719c24fa';

const https = require('https');

// This is used by the VoiceLabs analytics
var APP_ID = appId;
var VoiceLabs = require('voicelabs')('924a1f90-49e1-11a7-14ec-0e2486876586');

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = appId;
    alexa.dynamoDBTableName = 'parliamentUsers';
    alexa.registerHandlers(newSessionHandlers, electionModeHandlers, startHandlers);
    alexa.execute();
};

var states = {
    STARTMODE: '_STARTMODE',  // Prompt the user to start navigating the information
    ELECTIONMODE: '_ELECTIONMODE', // User wants to know who is running for office
};

var electionCandidates = require("candidates.json");
var validDistricts = require("districts.json");
var electionResults = require("results.json");

var newSessionHandlers = {
    'NewSession': function () {
        if(Object.keys(this.attributes).length === 0) {
            this.attributes['endedSessionCount'] = 0;
        }
        console.log("New Session " + JSON.stringify(this.event.request.type));
        if(this.event.request.type === "LaunchRequest") {
            this.handler.state = states.STARTMODE;
            this.emit(':ask', 'Welcome to the Parliament Facts skill. The election has now concluded, and we have ' +
                'full results available. Would you like to hear who ran and the results for an individual constituency?',
                'Say yes for more information or no to quit.');
        } else if (this.event.request.intent.name === "ElectionIntent" && this.event.request.intent.slots.constituency.value) {

            // fix defect to remove a dot at the end of the constituency name.
            var constituencyRequested = this.event.request.intent.slots.constituency.value;

            if (constituencyRequested.substring( constituencyRequested.length - 1, constituencyRequested.length ) === '.') {
                console.log("need to replace dot");
                constituencyRequested = constituencyRequested.substring( 0, constituencyRequested.length - 1);
            }

            console.log("attempt to match: " + constituencyRequested);
            var userProvidedValidDistrict = false;
            var districtId = 0;
            for (var i = 0; i < validDistricts.length; i++) {
                if (validDistricts[i].name.toLowerCase() === constituencyRequested.toLowerCase()) {
                    console.log("valid district entered");
                    userProvidedValidDistrict = true;
                    districtId = validDistricts[i].id;
                }
            }

            if (userProvidedValidDistrict) {
                var localCandidates = electionCandidates[0].candidates;
                var localDistrict = electionCandidates[0].districtName;

                for (var j = 0; j < electionCandidates.length; j++) {
                    if (electionCandidates[j].districtId === districtId) {
                        localCandidates = electionCandidates[j].candidates;
                        localDistrict = electionCandidates[j].districtName;
                    }
                }

                var speechOutput = "The candidates for the 2017 Parliamentary election for " + localDistrict + " were as follows. ";
                var cardOutput = localDistrict + "\n";
                var cardTitle = "Candidates for 2017 Parliamentary Election";

                var incumbentRace = false;
                var incumbentName = "None";

                for (var i = 0; i < localCandidates.length; i++ ) {
                    console.log(JSON.stringify(localCandidates[i]));
                    if (localCandidates[i].incumbent === true) {
                        incumbentRace = true;
                        incumbentName = localCandidates[i].fullName;
                    }
                    speechOutput = speechOutput + "<break time=\"1s\"/>";
                    speechOutput = speechOutput + localCandidates[i].fullName + 
                        " is from " + localCandidates[i].party + ". ";
                    cardOutput = cardOutput + localCandidates[i].fullName + " (" + localCandidates[i].party + ")\n";
                }
            
                if (incumbentRace) {
                    speechOutput = speechOutput + "<break time=\"1s\"/>";
                    speechOutput = speechOutput + incumbentName + " served in this position during the prior term " +
                    "and was considered the incumbent. ";
                    cardOutput = cardOutput + "Incumbent: " + incumbentName + "\n";
                }

                var memberParliamentName  = "Unknown";
                var memberParliamentParty = "Unknown";

                for (var k = 0; k < electionResults.length; k++ ) {
                    if (electionResults[k].districtId === districtId) {
                        memberParliamentName = electionResults[k].candidateName;
                        memberParliamentParty = electionResults[k].partyName;
                    }
                }

                speechOutput = speechOutput + "<break time=\"1s\"/>";
                speechOutput = speechOutput + memberParliamentName + " was the victor in the election from " +
                    memberParliamentParty + ". "; 
                cardOutput = cardOutput + "Winner: " + memberParliamentName + " (" + memberParliamentParty + ")";

                VoiceLabs.track(this.event.session, 'FindCandidates', localDistrict, speechOutput, (error, response) => {
                    console.log('VoiceLabs Response: ' + JSON.stringify(response));
                    this.emit(':tellWithCard', speechOutput, cardTitle, cardOutput);
                });

            } else {
                var speechOutput = "I'm sorry, " + this.event.request.intent.slots.constituency.value + 
                    " wasn't a valid constituency name. Please try again.";
                var reprompt = "You didn't provide a constituency with your query. Please restate your question " +
                    "with one. For example, please say something like Who is running for office in Canterbury.";
                console.log("Invalid Value for Constituency: " + this.event.request.intent.slots.constituency.value);
                this.emit(':ask', speechOutput, reprompt);
            }
        } else if (this.event.request.intent.name === "FindDistrict") {
            var speechOutput = "Excellent, lets find your district.  Which country is this for?  Please say something like England. ";
            var reprompt = "This feature will walk you through finding your constituency.  Please say a country name like England to begin.";
            this.handler.state = states.ELECTIONMODE;
            this.emit(':ask', speechOutput, reprompt);
        } else if (this.event.request.intent.name === "FindByPostCode") {
            console.log('Attempting to find by Postal Code');
            var postalCode = this.event.request.intent.slots.postalCodeDistrict.value;
            var APIurl = 'https://api.postcodes.io/postcodes/';
            https.get(APIurl + postalCode, (res) => {
                console.log('API Call HTTP Code: ', res.statusCode); // this indicates if the HTTP request was valid

                var tempData = "";

                res.on('data', (d) => {
                    tempData += d;
                });
                        
                // this is the logic that gets executed once a successful API call is completed
                res.on('end', (d) => {
                    console.log('completed request');
                    // now process data returned from the API call
                    var returnData = eval('(' + tempData.toString('utf8') + ')');
                    console.log(JSON.stringify(returnData));

                    if(returnData.status === 200) {
                        console.log('postal code was valid');
                        console.log(JSON.stringify(returnData.result));
                        var constituency = returnData.result.parliamentary_constituency;
                        console.log(constituency);

                        // using the constituency from the API call, match with the lookup data
                        var validDistrict = false;
                        for (var i = 0; i < validDistricts.length; i++) {
                            if (validDistricts[i].name.toLowerCase() === constituency.toLowerCase()) {
                                console.log("valid district entered");
                                validDistrict = true;
                                districtId = validDistricts[i].id;
                            }
                        }

                        if (validDistrict) {
                            // format the message based on the API call
                            var message = "This postal code matches constituency " + constituency + ". ";
                                message = message + "The representative is " + electionResults[districtId].candidateName;
                                message = message + " from " + electionResults[districtId].partyName + ".";

                            this.emit(':tell', message);
                        } else {
                            console.log('could not match in lookup table');
                            var message = "Sorry, I couldn't find a constituency matching postal code " + postalCode;
                            this.emit(':tell', message);
                        }

                    } else if (returnData.status === 404) {
                        console.log('postal code not found');
                        var message = "Sorry, I couldn't find a constituency matching postal code " + postalCode;
                        this.emit(':tell', message);
                    }
                });
            }).on('error', (e) => {
                var message = "Sorry, I'm having trouble looking up postal codes right now. Please try again later.";
                this.emit(':tell', message);
                //console.error(e);
            });
        } else {
            console.log("Unhandled Response: " + JSON.stringify(this.event.request));
            var message = "I'm sorry, I didn't understand your request. Please try again.";
            var reprompt = "If you would like me to query who is running for office in a given constituency, please say " +
                "something like Who is running for office in Caterbury.";
            this.emit(':ask', message, reprompt);
        }
    },
    "AMAZON.StopIntent": function() {
      VoiceLabs.track(this.event.session, intent.name, intent.slots, null, (error, response) => {
          this.emit(':tell', "Goodbye!");
      });  
    },
    "AMAZON.CancelIntent": function() {
      VoiceLabs.track(this.event.session, intent.name, intent.slots, null, (error, response) => {
          this.emit(':tell', "Goodbye!");
      });  
    },
    'SessionEndedRequest': function () {
        console.log('session ended!');
        //this.attributes['endedSessionCount'] += 1;
        VoiceLabs.track(this.event.session, intent.name, intent.slots, null, (error, response) => {
            this.emit(":tell", "Goodbye!");
        });
    },
    'Unhandled': function() {
        console.log("UNHANDLED");
        var message = "I'm sorry, I didn't understand your request. Please try again.";
        VoiceLabs.track(this.event.session, intent.name, intent.slots, message, (error, response) => {
            this.emit(':tell', message);
        });
    }    
};

var startHandlers = Alexa.CreateStateHandler(states.STARTMODE, {
    'NewSession': function() {
        this.emit('NewSession');
    },
    'FindDistrict': function() {
        var speechOutput = "Excellent, lets find your district.  Which country is this for?  Please say something like England. ";
        var reprompt = "This feature will walk you through finding your constituency.  Please say a country name like England to begin.";
        this.emit(':ask', speechOutput, reprompt);
        this.handler.state = states.ELECTIONMODE;
    },
    'ElectionIntent': function() {
        console.log("election intent from start handler");
        if (this.event.request.intent.slots.constituency.value) {
            console.log("Constituency Provided");

            // fix defect to remove a dot at the end of the constituency name.
            var constituencyRequested = this.event.request.intent.slots.constituency.value;

            if (constituencyRequested.substring( constituencyRequested.length - 1, constituencyRequested.length ) === '.') {
                console.log("need to replace dot");
                constituencyRequested = constituencyRequested.substring( 0, constituencyRequested.length - 1);
            }

            console.log("attempt to match: " + constituencyRequested);
            var userProvidedValidDistrict = false;
            var districtId = 0;
            for (var i = 0; i < validDistricts.length; i++) {
                if (validDistricts[i].name.toLowerCase() === constituencyRequested.toLowerCase()) {
                    console.log("valid district entered");
                    userProvidedValidDistrict = true;
                    districtId = validDistricts[i].id;
                }
            }

            if (userProvidedValidDistrict) {
                var localCandidates = electionCandidates[0].candidates;
                var localDistrict = electionCandidates[0].districtName;

                for (var j = 0; j < electionCandidates.length; j++) {
                    if (electionCandidates[j].districtId === districtId) {
                        localCandidates = electionCandidates[j].candidates;
                        localDistrict = electionCandidates[j].districtName;
                    }
                }

                var speechOutput = "The candidates for the 2017 Parliamentary election for " + localDistrict + " are as follows. ";
                var cardOutput = localDistrict + "\n";
                var cardTitle = "Candidates for 2017 Parliamentary Election";

                var incumbentRace = false;
                var incumbentName = "None";

                for (var i = 0; i < localCandidates.length; i++ ) {
                    console.log(JSON.stringify(localCandidates[i]));
                    if (localCandidates[i].incumbent === true) {
                        incumbentRace = true;
                        incumbentName = localCandidates[i].fullName;
                    }
                    speechOutput = speechOutput + "<break time=\"1s\"/>";
                    speechOutput = speechOutput + localCandidates[i].fullName + 
                        " is from " + localCandidates[i].party + ". ";
                    cardOutput = cardOutput + localCandidates[i].fullName + " (" + localCandidates[i].party + ")\n";
                }
            
                if (incumbentRace) {
                    speechOutput = speechOutput + "<break time=\"1s\"/>";
                    speechOutput = speechOutput + incumbentName + " served in this position during the prior term " +
                        "and is considered the incumbent. ";
                    cardOutput = cardOutput + "Incumbent: " + incumbentName;
                }

                var memberParliamentName  = "Unknown";
                var memberParliamentParty = "Unknown";

                for (var k = 0; k < electionResults.length; k++ ) {
                    if (electionResults[k].districtId === districtId) {
                        memberParliamentName = electionResults[k].candidateName;
                        memberParliamentParty = electionResults[k].partyName;
                    }
                }

                speechOutput = speechOutput + "<break time=\"1s\"/>";
                speechOutput = speechOutput + memberParliamentName + " was the victor in the election from " +
                    memberParliamentParty + ". ";
                cardOutput = cardOutput + "Winner: " + memberParliamentName + " (" + memberParliamentParty + ")";

                this.emit(':tellWithCard', speechOutput, cardTitle, cardOutput);
            } else {
                var speechOutput = "I'm sorry, " + this.event.request.intent.slots.constituency.value + 
                    " wasn't a valid constituency name. Please try again.";
                var reprompt = "Please provide a constituency name with your query. For example, say something like " +
                    "Who is running for office in Canterbury.";                  
                console.log("Invalid Value for Constituency: " + this.event.request.intent.slots.constituency.value);
                this.emit(':ask', speechOutput, reprompt);
            }
        } else {
            var speechOutput = "Sorry, you didn't provide a constituency name along with your query. If you would " +
                "like me to find who is running for office, please say something like Who is running for office in Canterbury.";
            var reprompt = "Please provide a constituency name with your query. For example, say something like " +
                "Who is running for office in Canterbury.";
            console.log("No Constituency Provided");
            this.emit(':ask', speechOutput, reprompt);
        }
    },
    'FindByPostCode': function () {
        console.log('Attempting to find by Postal Code');
        var postalCode = this.event.request.intent.slots.postalCodeDistrict.value;
        var APIurl = 'https://api.postcodes.io/postcodes/';
        https.get(APIurl + postalCode, (res) => {
            console.log('API Call HTTP Code: ', res.statusCode); // this indicates if the HTTP request was valid

            var tempData = "";

            res.on('data', (d) => {
                tempData += d;
            });
                        
            // this is the logic that gets executed once a successful API call is completed
            res.on('end', (d) => {
                console.log('completed request');
                // now process data returned from the API call
                var returnData = eval('(' + tempData.toString('utf8') + ')');
                console.log(JSON.stringify(returnData));

                if(returnData.status === 200) {
                    console.log('postal code was valid');
                    console.log(JSON.stringify(returnData.result));
                    var constituency = returnData.result.parliamentary_constituency;
                    console.log(constituency);

                    // using the constituency from the API call, match with the lookup data
                    var validDistrict = false;
                    for (var i = 0; i < validDistricts.length; i++) {
                        if (validDistricts[i].name.toLowerCase() === constituency.toLowerCase()) {
                            console.log("valid district entered");
                            validDistrict = true;
                            var districtId = validDistricts[i].id;
                        }
                    }

                    console.log('now look up district');

                    if (validDistrict) {
                        // format the message based on the API call
                        var message = "This postal code matches constituency " + constituency + ". ";
                            message = message + "The representative is " + electionResults[districtId].candidateName;
                            message = message + " from " + electionResults[districtId].partyName + ".";

                        this.emit(':tell', message);
                    } else {
                        console.log('could not match in lookup table');
                        var message = "Sorry, I couldn't find a constituency matching postal code " + postalCode;
                        this.emit(':tell', message);
                    }

                } else if (returnData.status === 404) {
                    console.log('postal code not found');
                    var message = "Sorry, I couldn't find a constituency matching postal code " + postalCode;
                    this.emit(':tell', message);
                }
            });
        }).on('error', (e) => {
            var message = "Sorry, I'm having trouble looking up postal codes right now. Please try again later.";
            this.emit(':tell', message);
        });
    },
    'LocateDistrict': function () {
        if (this.event.request.intent.slots.country.value === "England") {
            var speechOutput = "To narrow down the selection, please choose a region within England. " +
                "Your choices are East Midlands, Eastern, London, North East, North West, South East, " +
                "South West, West Midlands, Yorkshire. ";
            var repeatOutput = "Please select either East Midlands, Eastern, London, North East, North West, South East, " +
                "South West, West Midlands, Yorkshire.";
            this.emit(':ask', speechOutput, repeatOutput);
        } else if (this.event.request.intent.slots.country.value === "Scotland") {
            var speechOutput = "There are 59 different constituencies in Scotland. They are " +
                "Aberdeen North, Aberdeen South, Banff and Buchan, Gordon, West Aberdeenshire and Kincardine, Angus, " +
                "Dundee East, Dundee West, Argyll and Bute, Edinburgh East, Edinburgh North and Leith, Edinburgh South, " + 
                "Edinburgh South West, Edinburgh West, Ochil and South Perthshire, Dumfries and Galloway, " +
                "Dumfriesshire Clydesdale and Tweeddale, Kilmarnock and Loudoun, Ayr Carrick and Cumnock, " +
                "East Dunbartonshire, Cumbernauld Kilsyth and Kirkintilloch East, East Lothian, East Renfrewshire, " +
                "Falkirk, Dunfermline and West Fifem, Glenrothes, Kirkcaldy and Cowdenbeath, North East Fife, " +
                "Glasgow Central, Glasgow East, Glasgow North, Glasgow North East, Glasgow North West, Glasgow South, " +
                "Glasgow South West, Caithness, Sutherland and Easter Ross, Inverness, Nairn, Badenoch and Strathspey, " +
                "Ross Skye and Lochaber, Inverclyde, Midlothian, Moray, Na h-Eileanan an Iar, North Ayrshire and Arran, " +
                "Central Ayrshire, Airdrie and Shotts, Coatbridge, Chryston and Bellshill, Motherwell and Wishaw, Orkney and Shetland, " +
                "Perth and North Perthshire, Paisley and Renfrewshire North, Paisley and Renfrewshire South, " +
                "Berwickshire, Roxburgh and Selkirk, East Kilbride, Strathaven and Lesmahagow, Lanark and Hamilton East, " +
                "Rutherglen and Hamilton West, Stirling, West Dunbartonshire, Livingston, Linlithgow and East Falkirk. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Glasgow North.";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Glasgow North.";
            this.emit(':ask', speechOutput, reprompt);
        } else if (this.event.request.intent.slots.country.value === "wales") {
            var speechOutput = "There are 40 different constituencies in Wales. They are " +
                "Blaenau Gwent, Bridgend, Islwyn, Caerphilly, Cardiff Central, Cardiff North, " +
                "Cardiff South and Penarth, Cardiff West, Carmarthen East and Dinefwr, " +
                "Carmarthen West and South Pembrokeshire, Llanelli, Ceredigion, Clwyd West, Clwyd South, " +
                "Aberconwy, Vale of Clwyd, Delyn, Alyn and Deeside, Arfon, Dwyfor Meirionnydd, " +
                "Ynys MÃ´n, Merthyr Tydfil and Rhymney, Monmouth, Aberavon, Neath, Newport East, " +
                "Newport West, Preseli Pembrokeshire, Brecon and Radnorshire, Montgomeryshire, " +
                "Cynon Valley, Ogmore, Pontypridd, Rhondda, Gower, Swansea East, " +
                "Swansea West, Torfaen, Vale of Glamorgan, Wrexham. If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Bridgend.";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Bridgend.";
            this.emit(':ask', speechOutput, reprompt);
        } else if (this.event.request.intent.slots.country.value === "northern Ireland") {
            var speechOutput = "There are 18 different constituencies in Northern Ireland. They are " +
                "South Antrim, Strangford, North Down, Newry and Armagh, North Antrim, Belfast East, " +
                "Belfast South, Belfast West, Belfast North, East Antrim, East Londonderry, " +
                "Upper Bann, South Down, Fermanagh and South Tyrone, Lagan Valley, Foyle, Mid Ulster " +
                "West Tyrone. If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Strangford.";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Strangford.";
            this.emit(':ask', speechOutput, reprompt);
        } else {
            var speechOutput = "I'm sorry, I didn't understand which country you asked for. Please try again.";
            var reprompt = "Please name one of the countries of the UK and I will provide choices for it. " +
                "For example, say England.";
            this.emit(':ask', speechOutput, reprompt);
        }
    },
    'LocateEngland': function () {
        if (this.event.request.intent.slots.region.value === "east Midlands") {
            var speechOutput = "There are 46 different constituencies in the East Midlands region of England. " +
                "In the Derbyshire area, Amber Valley, Bolsover, Chesterfield, Derby North, Derby South, " +
                "Derbyshire Dales, Erewash, High Peak, Mid Derbyshire, North East Derbyshire, South Derbyshire. " +
                "In the Leicestershire area, Bosworth, Charnwood, Harborough, Leicester East, Leicester South, " +
                "Leicester West, Loughborough, North West Leicestershire, South Leicestershire, Rutland and Melton. " +
                "In the Lincolnshire area, Boston and Skegness, Gainsborough, Grantham and Stamford, Lincoln, " +
                "Louth and Horncastle, Sleaford and North Hykeham, South Holland and The Deepings. " +
                "In the Northamptonshire area, Corby, Daventry, Kettering, Northampton North, Northampton South, " +
                "South Northamptonshire, Wellingborough. " +
                "In the Nottinghamshire area, Ashfield, Bassetlaw, Broxtowe, Gedling, Mansfield, Newark, Nottingham East, " +
                "Nottingham North, Nottingham South, Rushcliffe, Sherwood. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Chesterfield. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Chesterfield. ";
        } else if (this.event.request.intent.slots.region.value === "eastern") {
            var speechOutput = "There are 56 different constituencies in the Eastern region of England. " +
                "In the Bedfordshire area, Bedford, Luton North, Luton South, Mid Bedfordshire, " +
                "North East Bedfordshire, South West Bedfordshire. " +
                "In the Cambridgeshire area, Cambridge, Huntingdon, North East Cambridgeshire, North West Cambridgeshire, " +
                "Peterborough, South Cambridgeshire, South East Cambridgeshire. " +
                "In the Essex area, Basildon and Billericay, Braintree, Brentwood and Ongar, Castle Point, Chelmsford, " +
                "Clacton, Colchester, Epping Forest, Harlow, Harwich and North Essex, Maldon, Rayleigh and Wickford, " +
                "Rochford and Southend East, Saffron Walden, South Basildon and East Thurrock, Southend West, Thurrock, Witham. " +
                "In the Hertfordshire area, Broxbourne, Hemel Hempstead, Hertford and Stortford, Hertsmere, Hitchin and Harpenden, " +
                "North East Hertfordshire, South West Hertfordshire, St Albans, Stevenage, Watford, Welwyn Hatfield. " +
                "In the Norfolk area, Broadland, Great Yarmouth, Mid Norfolk, North Norfolk, North West Norfolk, " +
                "Norwich North, Norwich South, South Norfolk, South West Norfolk. " +
                "In the Suffolk area, Bury St Edmunds, Central Suffolk and North Ipswich, Ipswich, South Suffolk, " +
                "Suffolk Coastal, Waveney, West Suffolk. " + 
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Cambridge. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Cambridge. ";
        } else if (this.event.request.intent.slots.region.value === "London") {
            var speechOutput = "There are 72 different constituencies in London. " +
                "Their names are as follows. " +
                "Dagenham and Rainham, Barking, Chipping Barnet, Finchley and Golders Green, Hendon, " +
                "Erith and Thamesmead, Bexleyheath and Crayford, Old Bexley and Sidcup, Hampstead and Kilburn, " +
                "Brent Central, Brent North, Lewisham West and Penge, Beckenham, Bromley and Chislehurst, " +
                "Orpington, Holborn and St Pancras, Cities of London and Westminster, Croydon Central, Croydon North, " +
                "Croydon South, Ealing Central and Acton, Ealing North, Ealing, Southall, Edmonton, Enfield North, " +
                "Enfield, Southgate, Eltham, Greenwich and Woolwich, Hackney North and Stoke Newington, " +
                "Hackney South and Shoreditch, Hammersmith, Chelsea and Fulham, Hornsey and Wood Green, " +
                "Tottenham, Ruislip, Northwood and Pinner, Harrow East, Harrow West, Hornchurch and Upminster, " +
                "Romford, Hayes and Harlington, Uxbridge and South Ruislip, Brentford and Isleworth, Feltham and Heston, " +
                "Islington North, Islington South and Finsbury, Kensington, Kingston and Surbiton, Dulwich and West Norwood, " +
                "Streatham, Vauxhall, Lewisham East, Lewisham, Deptford, Mitcham and Morden, Wimbledon, East Ham, West Ham, " + 
                "Chingford and Woodford Green, Leyton and Wanstead, Ilford North, Ilford South, Twickenham, " +
                "Bermondsey and Old Southwark, Camberwell and Peckham, Carshalton and Wallington, Sutton and Cheam, " +
                "Bethnal Green and Bow, Poplar and Limehouse, Walthamstow, Battersea, Putney, Tooting, Westminster North. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Battersea. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Battersea. ";
        } else if (this.event.request.intent.slots.region.value === "north east") {
            var speechOutput = "There are 29 different constituencies in the North East region of England. " +
                "In the County Durham area, Bishop Auckland, City of Durham, Darlington, Easington, " +
                "North Durham, North West Durham, Sedgefield. " +
                "In the Northumberland area, Berwick-upon-Tweed, Blyth Valley, Hexham, Wansbeck. " +
                "In the South East Durham and North East Yorkshire area, Hartlepool, Middlesbrough, " +
                "Middlesbrough South and East Cleveland, Redcar, Stockton North, Stockton South. " +
                "In the Tyne and Wear area, Blaydon, Gateshead, Houghton and Sunderland South, Jarrow, " +
                "Newcastle upon Tyne Central, Newcastle upon Tyne East, Newcastle upon Tyne North, " +
                "North Tyneside, South Shields, Sunderland Central, Tynemouth, Washington and Sunderland West. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in North Durham. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in North Durham. ";
        } else if (this.event.request.intent.slots.region.value === "north west") {
            var speechOutput = "There are 74 different constituencies in the North West region of England. " +
                "In the Cheshire region, those are City of Chester, Congleton, Crewe and Nantwich, Eddisbury, " +
                "Ellesmere Port and Neston, Halton, Macclesfield, Tatton, Warrington North, Warrington South, " +
                "Weaver Vale, Barrow and Furness, Carlisle, Copeland, Penrith and The Border, Westmorland and Lonsdale, " +
                "Workington. " +
                "In the Greater Manchester region, those are Altrincham and Sale West, Ashton-under-Lyne, " +
                "Blackley and Broughton, Bolton North East, Bolton South East, Bolton West, Bury North, " +
                "Bury South, Cheadle, Denton and Reddish, Hazel Grove, Heywood and Middleton, Leigh, " +
                "Makerfield, Manchester Central, Manchester Gorton, Manchester Withington, " +
                "Oldham East and Saddleworth, Oldham West and Royton, Rochdale, Salford and Eccles, " +
                "Stalybridge and Hyde, Stockport, Stretford and Urmston, Wigan,Worsley and Eccles South, " +
                "Wythenshawe and Sale East. " +
                "In the Lancashire region, those are Blackburn, Blackpool North and Cleveleys, Blackpool South, " +
                "Burnley, Chorley, Fylde, Hyndburn, Lancaster and Fleetwood, Morecambe and Lunesdale, " +
                "Pendle, Preston, Ribble Valley, Rossendale and Darwen, South Ribble, West Lancashire, " +
                "Wyre and Preston North. " +
                "In the Merseyside region, those are Birkenhead, Bootle, Garston and Halewood, Knowsley, " +
                "Liverpool Riverside, Liverpool Walton, Liverpool Wavertree, Liverpool West Derby, " +
                "Sefton Central, Southport, St Helens North, St Helens South and Whiston, " +
                "Wallasey, Wirral South, Wirral West. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Halton. ";                
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Halton. ";
        } else if (this.event.request.intent.slots.region.value === "south east") {
            var speechOutput = "There are 83 different constituencies in the South East region of England. " +
                "In the Berkshire region, those are Bracknell, Maidenhead, Newbury, Reading East, Reading West, " +
                "Slough, Windsor, Wokingham. " +
                "In the Buckinghamshire region, those are Aylesbury, Beaconsfield, Buckingham, " +
                "Chesham and Amersham, Milton Keynes North, Milton Keynes South, Wycombe. " +
                "In the East Sussex region, those are Bexhill and Battle, Brighton Kemptown, Brighton Pavilion, " +
                "Eastbourne, Hastings and Rye, Hove, Lewes, Wealden. " +
                "In the Hampshire region, those are Aldershot, Basingstoke, East Hampshire, Eastleigh, Fareham, " +
                "Gosport, Havant, Meon Valley, New Forest East, New Forest West, North East Hampshire, " +
                "North West Hampshire, Portsmouth North, Portsmouth South, Romsey and Southampton North, " + 
                "Southampton Itchen, Southampton Test, Winchester. " +
                "In the Kent region, those are Ashford, Canterbury, Chatham and Aylesford, Dartford, Dover, " +
                "Faversham and Mid Kent, Folkestone and Hythe, Gillingham and Rainham, Gravesham, " +
                "Maidstone and The Weald, North Thanet, Rochester and Strood, Sevenoaks, Sittingbourne and Sheppey, " +
                "South Thanet, Tonbridge and Malling, Tunbridge Wells. " +
                "In the Oxfordshire region, those are Banbury, Henley, Oxford East, Oxford West and Abingdon, " +
                "Wantage, Witney. " +
                "In the Surrey region, those are East Surrey, Epsom and Ewell, Esher and Walton, Guildford, " +
                "Mole Valley, Reigate, Runnymede and Weybridge, South West Surrey, Spelthorne, " +
                "Surrey Heath, Woking. " +
                "In the West Sussex region, those are Arundel and South Downs, Bognor Regis and Littlehampton, " +
                "Chichester, Crawley, East Worthing and Shoreham, Horsham, Mid Sussex, Worthing West. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Canterbury. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Canterbury. ";
        } else if (this.event.request.intent.slots.region.value === "south west") {
            var speechOutput = "There are 54 different constituencies in the South West region of England. " +
                "In the Bristol region, those are Bristol East, Bristol North West, Bristol South, and Bristol West. " +
                "In the Cornwall region, those are Camborne and Redruth, North Cornwall, South East Cornwall, " +
                "St Austell and Newquay, St Ives, Truro and Falmouth. " +
                "In the Devon region, those are Central Devon, East Devon, Exeter, Newton Abbot, North Devon, " +
                "Plymouth Moor View, Plymouth Sutton and Devonport, South West Devon, Tiverton and Honiton, " +
                "Torbay, Torridge and West Devon, Totnes. " + 
                "In the Dorset region, those are Bournemouth East, Bournemouth West, Christchurch, " +
                "Mid Dorset and North Poole, North Dorset, Poole, South Dorset, West Dorset. " + 
                "In the Gloucestershire region, those are Cheltenham, Forest of Dean, Gloucester, Stroud, Tewkesbury, The Cotswolds. " +
                "In the Somerset region, those are Bridgwater and West Somerset, Somerton and Frome, Taunton Deane, Wells, Yeovil. " +
                "In the South Gloucestershire region, those are Filton and Bradley Stoke, Kingswood, Thornbury and Yate. " +
                "In the Wiltshire region, those are Chippenham, Devizes, North Swindon, North Wiltshire, " +
                "Salisbury, South Swindon, South West Wiltshire. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Salisbury. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Salisbury. ";
        } else if (this.event.request.intent.slots.region.value === "west Midlands") {
            var speechOutput = "There are 59 different constituencies in the West Midlands region of England. " +
                "In the Shropshire region, those are Ludlow, North Shropshire, Shrewsbury and Atcham, Telford, The Wrekin. " +
                "In the Staffordshire region, those are Burton, Cannock Chase, Lichfield, " +
                "Newcastle-under-Lyme, South Staffordshire, Stafford, Staffordshire Moorlands, " +
                "Stoke-on-Trent Central, Stoke-on-Trent North, Stoke-on-Trent South, Stone, Tamworth. " +
                "In the Warwickshire region, those are Kenilworth and Southam, North Warwickshire, " +
                "Nuneaton, Rugby, Stratford-on-Avon, Warwick and Leamington. " +
                "In the West Midlands region, those are Aldridge-Brownhills, Birmingham Edgbaston, Birmingham Erdington, " +
                "Birmingham Hall Green, Birmingham Hodge Hill, Birmingham Ladywood, Birmingham Northfield, " +
                "Birmingham Perry Barr, Birmingham Selly Oak, Birmingham Yardley, Coventry North East, " +
                "Coventry North West, Coventry South, Dudley North, Dudley South, Halesowen and Rowley Regis, " +
                "Meriden, Solihull, Stourbridge, Sutton Coldfield, Walsall North, Walsall South, Warley, " +
                "West Bromwich East, West Bromwich West, Wolverhampton North East, Wolverhampton South East, " +
                "Wolverhampton South West. " +
                "In the Worcestershire region, those are Bromsgrove, Mid Worcestershire, Redditch, " +
                "West Worcestershire, Worcester, Wyre Forest. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Ludlow. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Ludlow. ";
        } else if (this.event.request.intent.slots.region.value === "Yorkshire") {
            var speechOutput = "There are 52 different constituencies in the Yorkshire region of England. " + 
                "In the East Yorkshire and North Lincolnshire region, those are Beverley and Holderness, " +
                "Brigg and Goole, Cleethorpes, East Yorkshire, Great Grimsby, Haltemprice and Howden, " +
                "Kingston upon Hull East, Kingston upon Hull North, Kingston upon Hull West and Hessle, " +
                "Scunthorpe. " +
                "In the North Yorkshire region, those are Harrogate and Knaresborough, Richmond, " +
                "Scarborough and Whitby, Selby and Ainsty, Skipton and Ripon, Thirsk and Malton, " +
                "York Central, York Outer. " +
                "In the South Yorkshire region, those are Barnsley Central, Barnsley East, Don Valley, " +
                "Doncaster Central, Doncaster North, Penistone and Stocksbridge, Rother Valley, Rotherham, " +
                "Sheffield Central, Sheffield South East, Sheffield Brightside and Hillsborough, " +
                "Sheffield Hallam, Sheffield Heeley, Wentworth and Dearne. " +
                "In the West Yorkshire region, those are Bradford East, Bradford South, Bradford West, " +
                "Keighley, Shipley, Calder Valley, Halifax, Batley and Spen, Colne Valley, " +
                "Dewsbury, Huddersfield, Morley and Outwood, Elmet and Rothwell, Leeds Central, " +
                "Leeds East, Leeds North East, Leeds North West, Leeds West, Pudsey, " +
                "Hemsworth, Normanton Pontefract and Castleford, Wakefield. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Wakefield. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Wakefield. ";
        } else {
            var speechOutput = "I'm sorry, I couldn't understand what region you are looking for. ";
            var reprompt = "Please provide a region within England.  For example, say West Midlands.";
            console.log("Region Value: " + this.event.request.intent.slots.region.value);
        }
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.HelpIntent': function() {
        var message = 'This skill helps provide information about the upcoming election. If you would like to ' +
            'find out who is running for election in your constituency, please say something like Who is running ' +
            'for office in Strangford.';
        var reprompt = 'If you would like to find out information about who is running for office in your ' +
            'constituency, please says something like Who is running for office in Strangford and I will retrieve ' +
            'those candidates seeking office. This can be done in any of the 650 constituencies in the UK.';
        this.emit(':ask', message, reprompt);
    },
    'AMAZON.YesIntent': function() {
        this.handler.state = states.ELECTIONMODE;
        this.emit(':ask', 'Excellent. Do you know what the name is for the consituency you would ' +
            'like the candidates for? If so, please ask me who is running for office and provide ' +
            'that constituency name. For example, say Who is running for office in Bedford? If you ' +
            'do not know the constituency name, just say No and I will help you find it. ',
            'Do you know your constituency name?');
    },
    'AMAZON.NoIntent': function() {
        console.log("NOINTENT");
        this.emit(':tell', 'Ok, thanks for checking in. See you next time!');
    },
    "AMAZON.StopIntent": function() {
      console.log("STOPINTENT");
      this.emit(':tell', "Goodbye!");  
    },
    "AMAZON.CancelIntent": function() {
      console.log("CANCELINTENT");
      this.emit(':tell', "Goodbye!");  
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST");
        //this.attributes['endedSessionCount'] += 1;
        this.emit(':tell', "Goodbye!");
    },
    'Unhandled': function() {
        console.log("UNHANDLED");
        this.emit(':tell', 'Sorry, I did not understand what you asked for. Please try again.');
    }
});

var electionModeHandlers = Alexa.CreateStateHandler(states.ELECTIONMODE, {
    'NewSession': function () {
        this.handler.state = '';
        this.emitWithState('NewSession'); // Equivalent to the Start Mode NewSession handler
    },
    'ElectionIntent': function() {
        console.log("election intent from election mode handler");
        if (this.event.request.intent.slots.constituency.value) {
            console.log("Constituency Provided");

            // fix defect to remove a dot at the end of the constituency name.
            var constituencyRequested = this.event.request.intent.slots.constituency.value;

            if (constituencyRequested.substring( constituencyRequested.length - 1, constituencyRequested.length ) === '.') {
                console.log("need to replace dot");
                constituencyRequested = constituencyRequested.substring( 0, constituencyRequested.length - 1);
            }

            console.log("attempt to match: " + constituencyRequested);
            var userProvidedValidDistrict = false;
            var districtId = 0;
            for (var i = 0; i < validDistricts.length; i++) {
                if (validDistricts[i].name.toLowerCase() === constituencyRequested.toLowerCase()) {
                    console.log("valid district entered");
                    userProvidedValidDistrict = true;
                    districtId = validDistricts[i].id;
                }
            }

            if (userProvidedValidDistrict) {
                var localCandidates = electionCandidates[0].candidates;
                var localDistrict = electionCandidates[0].districtName;

                for (var j = 0; j < electionCandidates.length; j++) {
                    if (electionCandidates[j].districtId === districtId) {
                        localCandidates = electionCandidates[j].candidates;
                        localDistrict = electionCandidates[j].districtName;
                    }
                }

                var speechOutput = "The candidates for the 2017 Parliamentary election for " + localDistrict + " are as follows. ";
                var cardOutput = localDistrict + "\n";
                var cardTitle = "Candidates for 2017 Parliamentary Election";

                var incumbentRace = false;
                var incumbentName = "None";

                for (var i = 0; i < localCandidates.length; i++ ) {
                    console.log(JSON.stringify(localCandidates[i]));
                    if (localCandidates[i].incumbent === true) {
                        incumbentRace = true;
                        incumbentName = localCandidates[i].fullName;
                    }
                    speechOutput = speechOutput + "<break time=\"1s\"/>";
                    speechOutput = speechOutput + localCandidates[i].fullName + 
                        " is from " + localCandidates[i].party + ". ";
                    cardOutput = cardOutput + localCandidates[i].fullName + " (" + localCandidates[i].party + ")\n";
                }
            
                if (incumbentRace) {
                    speechOutput = speechOutput + "<break time=\"1s\"/>";
                    speechOutput = speechOutput + incumbentName + " served in this position during the prior term " +
                        "and is considered the incumbent. ";
                    cardOutput = cardOutput + "Incumbent: " + incumbentName;
                }

                var memberParliamentName  = "Unknown";
                var memberParliamentParty = "Unknown";

                for (var k = 0; k < electionResults.length; k++ ) {
                    if (electionResults[k].districtId === districtId) {
                        memberParliamentName = electionResults[k].candidateName;
                        memberParliamentParty = electionResults[k].partyName;
                    }
                }

                speechOutput = speechOutput + "<break time=\"1s\"/>";
                speechOutput = speechOutput + memberParliamentName + " was the victor in the election from " +
                    memberParliamentParty + ". ";
                cardOutput = cardOutput + "Winner: " + memberParliamentName + " (" + memberParliamentParty + ")";

                this.emit(':tellWithCard', speechOutput, cardTitle, cardOutput);
            } else {
                var speechOutput = "I'm sorry, " + this.event.request.intent.slots.constituency.value + 
                    " wasn't a valid constituency name.";
                console.log("Invalid Value for Constituency: " + this.event.request.intent.slots.constituency.value);
                this.emit(':tell', speechOutput);
            }
        } else {
            var speechOutput = "Sorry, you didn't provide a constituency name along with your query. If you would " +
                "like me to find who is running for office, please say something like Who is running for office in Canterbury.";
            var reprompt = "Please provide a constituency name with your query. For example, say something like " +
                "Who is running for office in Canterbury."
            console.log("No Constituency Provided");
            this.emit(':ask', speechOutput, reprompt);
        }        
    },
    'FindByPostCode': function () {
        console.log('Attempting to find by Postal Code');
        var postalCode = this.event.request.intent.slots.postalCodeDistrict.value;
        var APIurl = 'https://api.postcodes.io/postcodes/';
        https.get(APIurl + postalCode, (res) => {
            console.log('API Call HTTP Code: ', res.statusCode); // this indicates if the HTTP request was valid

            var tempData = "";

            res.on('data', (d) => {
                tempData += d;
            });
                        
            // this is the logic that gets executed once a successful API call is completed
            res.on('end', (d) => {
                console.log('completed request');
                // now process data returned from the API call
                var returnData = eval('(' + tempData.toString('utf8') + ')');
                console.log(JSON.stringify(returnData));

                if(returnData.status === 200) {
                    console.log('postal code was valid');
                    console.log(JSON.stringify(returnData.result));
                    var constituency = returnData.result.parliamentary_constituency;
                    console.log(constituency);

                    // using the constituency from the API call, match with the lookup data
                    var validDistrict = false;
                    for (var i = 0; i < validDistricts.length; i++) {
                        if (validDistricts[i].name.toLowerCase() === constituency.toLowerCase()) {
                            console.log("valid district entered");
                            validDistrict = true;
                            var districtId = validDistricts[i].id;
                        }
                    }

                    console.log('now look up district');

                    if (validDistrict) {
                        // format the message based on the API call
                        var message = "This postal code matches constituency " + constituency + ". ";
                            message = message + "The representative is " + electionResults[districtId].candidateName;
                            message = message + " from " + electionResults[districtId].partyName + ".";

                        this.emit(':tell', message);
                    } else {
                        console.log('could not match in lookup table');
                        var message = "Sorry, I couldn't find a constituency matching postal code " + postalCode;
                        this.emit(':tell', message);
                    }

                } else if (returnData.status === 404) {
                    console.log('postal code not found');
                    var message = "Sorry, I couldn't find a constituency matching postal code " + postalCode;
                    this.emit(':tell', message);
                }
            });
        }).on('error', (e) => {
            var message = "Sorry, I'm having trouble looking up postal codes right now. Please try again later.";
            this.emit(':tell', message);
        });
    },
    'LocateDistrict': function () {
        if (this.event.request.intent.slots.country.value === "England") {
            var speechOutput = "To narrow down the selection, please choose a region within England. " +
                "Your choices are East Midlands, Eastern, London, North East, North West, South East, " +
                "South West, West Midlands, Yorkshire. ";
            var repeatOutput = "Please select either East Midlands, Eastern, London, North East, North West, South East, " +
                "South West, West Midlands, Yorkshire.";
            this.emit(':ask', speechOutput, repeatOutput);
        } else if (this.event.request.intent.slots.country.value === "Scotland") {
            var speechOutput = "There are 59 different constituencies in Scotland. They are " +
                "Aberdeen North, Aberdeen South, Banff and Buchan, Gordon, West Aberdeenshire and Kincardine, Angus, " +
                "Dundee East, Dundee West, Argyll and Bute, Edinburgh East, Edinburgh North and Leith, Edinburgh South, " + 
                "Edinburgh South West, Edinburgh West, Ochil and South Perthshire, Dumfries and Galloway, " +
                "Dumfriesshire Clydesdale and Tweeddale, Kilmarnock and Loudoun, Ayr Carrick and Cumnock, " +
                "East Dunbartonshire, Cumbernauld Kilsyth and Kirkintilloch East, East Lothian, East Renfrewshire, " +
                "Falkirk, Dunfermline and West Fifem, Glenrothes, Kirkcaldy and Cowdenbeath, North East Fife, " +
                "Glasgow Central, Glasgow East, Glasgow North, Glasgow North East, Glasgow North West, Glasgow South, " +
                "Glasgow South West, Caithness, Sutherland and Easter Ross, Inverness, Nairn, Badenoch and Strathspey, " +
                "Ross Skye and Lochaber, Inverclyde, Midlothian, Moray, Na h-Eileanan an Iar, North Ayrshire and Arran, " +
                "Central Ayrshire, Airdrie and Shotts, Coatbridge, Chryston and Bellshill, Motherwell and Wishaw, Orkney and Shetland, " +
                "Perth and North Perthshire, Paisley and Renfrewshire North, Paisley and Renfrewshire South, " +
                "Berwickshire, Roxburgh and Selkirk, East Kilbride, Strathaven and Lesmahagow, Lanark and Hamilton East, " +
                "Rutherglen and Hamilton West, Stirling, West Dunbartonshire, Livingston, Linlithgow and East Falkirk. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Glasgow North.";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Glasgow North.";
            this.emit(':ask', speechOutput, reprompt);
        } else if (this.event.request.intent.slots.country.value === "wales") {
            var speechOutput = "There are 40 different constituencies in Wales. They are " +
                "Blaenau Gwent, Bridgend, Islwyn, Caerphilly, Cardiff Central, Cardiff North, " +
                "Cardiff South and Penarth, Cardiff West, Carmarthen East and Dinefwr, " +
                "Carmarthen West and South Pembrokeshire, Llanelli, Ceredigion, Clwyd West, Clwyd South, " +
                "Aberconwy, Vale of Clwyd, Delyn, Alyn and Deeside, Arfon, Dwyfor Meirionnydd, " +
                "Ynys MÃ´n, Merthyr Tydfil and Rhymney, Monmouth, Aberavon, Neath, Newport East, " +
                "Newport West, Preseli Pembrokeshire, Brecon and Radnorshire, Montgomeryshire, " +
                "Cynon Valley, Ogmore, Pontypridd, Rhondda, Gower, Swansea East, " +
                "Swansea West, Torfaen, Vale of Glamorgan, Wrexham. If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Bridgend.";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Bridgend.";
            this.emit(':ask', speechOutput, reprompt);
        } else if (this.event.request.intent.slots.country.value === "northern Ireland") {
            var speechOutput = "There are 18 different constituencies in Northern Ireland. They are " +
                "South Antrim, Strangford, North Down, Newry and Armagh, North Antrim, Belfast East, " +
                "Belfast South, Belfast West, Belfast North, East Antrim, East Londonderry, " +
                "Upper Bann, South Down, Fermanagh and South Tyrone, Lagan Valley, Foyle, Mid Ulster " +
                "West Tyrone. If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Strangford.";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Strangford.";
            this.emit(':ask', speechOutput, reprompt);
        } else {
            var speechOutput = "I'm sorry, I didn't understand which country you asked for. Please try again.";
            var reprompt = "Please inquire about one of the countries of the UK. For example, say England.";
            this.emit(':tell', speechOutput, reprompt);
        }
    },
    'LocateEngland': function () {
        if (this.event.request.intent.slots.region.value === "east Midlands") {
            var speechOutput = "There are 46 different constituencies in the East Midlands region of England. " +
                "In the Derbyshire area, Amber Valley, Bolsover, Chesterfield, Derby North, Derby South, " +
                "Derbyshire Dales, Erewash, High Peak, Mid Derbyshire, North East Derbyshire, South Derbyshire. " +
                "In the Leicestershire area, Bosworth, Charnwood, Harborough, Leicester East, Leicester South, " +
                "Leicester West, Loughborough, North West Leicestershire, South Leicestershire, Rutland and Melton. " +
                "In the Lincolnshire area, Boston and Skegness, Gainsborough, Grantham and Stamford, Lincoln, " +
                "Louth and Horncastle, Sleaford and North Hykeham, South Holland and The Deepings. " +
                "In the Northamptonshire area, Corby, Daventry, Kettering, Northampton North, Northampton South, " +
                "South Northamptonshire, Wellingborough. " +
                "In the Nottinghamshire area, Ashfield, Bassetlaw, Broxtowe, Gedling, Mansfield, Newark, Nottingham East, " +
                "Nottingham North, Nottingham South, Rushcliffe, Sherwood. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Chesterfield. ";
        } else if (this.event.request.intent.slots.region.value === "eastern") {
            var speechOutput = "There are 56 different constituencies in the Eastern region of England. " +
                "In the Bedfordshire area, Bedford, Luton North, Luton South, Mid Bedfordshire, " +
                "North East Bedfordshire, South West Bedfordshire. " +
                "In the Cambridgeshire area, Cambridge, Huntingdon, North East Cambridgeshire, North West Cambridgeshire, " +
                "Peterborough, South Cambridgeshire, South East Cambridgeshire. " +
                "In the Essex area, Basildon and Billericay, Braintree, Brentwood and Ongar, Castle Point, Chelmsford, " +
                "Clacton, Colchester, Epping Forest, Harlow, Harwich and North Essex, Maldon, Rayleigh and Wickford, " +
                "Rochford and Southend East, Saffron Walden, South Basildon and East Thurrock, Southend West, Thurrock, Witham. " +
                "In the Hertfordshire area, Broxbourne, Hemel Hempstead, Hertford and Stortford, Hertsmere, Hitchin and Harpenden, " +
                "North East Hertfordshire, South West Hertfordshire, St Albans, Stevenage, Watford, Welwyn Hatfield. " +
                "In the Norfolk area, Broadland, Great Yarmouth, Mid Norfolk, North Norfolk, North West Norfolk, " +
                "Norwich North, Norwich South, South Norfolk, South West Norfolk. " +
                "In the Suffolk area, Bury St Edmunds, Central Suffolk and North Ipswich, Ipswich, South Suffolk, " +
                "Suffolk Coastal, Waveney, West Suffolk. " + 
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Cambridge. ";
        } else if (this.event.request.intent.slots.region.value === "London") {
            var speechOutput = "There are 72 different constituencies in London. " +
                "Their names are as follows. " +
                "Dagenham and Rainham, Barking, Chipping Barnet, Finchley and Golders Green, Hendon, " +
                "Erith and Thamesmead, Bexleyheath and Crayford, Old Bexley and Sidcup, Hampstead and Kilburn, " +
                "Brent Central, Brent North, Lewisham West and Penge, Beckenham, Bromley and Chislehurst, " +
                "Orpington, Holborn and St Pancras, Cities of London and Westminster, Croydon Central, Croydon North, " +
                "Croydon South, Ealing Central and Acton, Ealing North, Ealing, Southall, Edmonton, Enfield North, " +
                "Enfield, Southgate, Eltham, Greenwich and Woolwich, Hackney North and Stoke Newington, " +
                "Hackney South and Shoreditch, Hammersmith, Chelsea and Fulham, Hornsey and Wood Green, " +
                "Tottenham, Ruislip, Northwood and Pinner, Harrow East, Harrow West, Hornchurch and Upminster, " +
                "Romford, Hayes and Harlington, Uxbridge and South Ruislip, Brentford and Isleworth, Feltham and Heston, " +
                "Islington North, Islington South and Finsbury, Kensington, Kingston and Surbiton, Dulwich and West Norwood, " +
                "Streatham, Vauxhall, Lewisham East, Lewisham, Deptford, Mitcham and Morden, Wimbledon, East Ham, West Ham, " + 
                "Chingford and Woodford Green, Leyton and Wanstead, Ilford North, Ilford South, Twickenham, " +
                "Bermondsey and Old Southwark, Camberwell and Peckham, Carshalton and Wallington, Sutton and Cheam, " +
                "Bethnal Green and Bow, Poplar and Limehouse, Walthamstow, Battersea, Putney, Tooting, Westminster North. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Battersea. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Battersea. ";
        } else if (this.event.request.intent.slots.region.value === "north east") {
            var speechOutput = "There are 29 different constituencies in the North East region of England. " +
                "In the County Durham area, Bishop Auckland, City of Durham, Darlington, Easington, " +
                "North Durham, North West Durham, Sedgefield. " +
                "In the Northumberland area, Berwick-upon-Tweed, Blyth Valley, Hexham, Wansbeck. " +
                "In the South East Durham and North East Yorkshire area, Hartlepool, Middlesbrough, " +
                "Middlesbrough South and East Cleveland, Redcar, Stockton North, Stockton South. " +
                "In the Tyne and Wear area, Blaydon, Gateshead, Houghton and Sunderland South, Jarrow, " +
                "Newcastle upon Tyne Central, Newcastle upon Tyne East, Newcastle upon Tyne North, " +
                "North Tyneside, South Shields, Sunderland Central, Tynemouth, Washington and Sunderland West. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in North Durham. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in North Durham. ";
        } else if (this.event.request.intent.slots.region.value === "north west") {
            var speechOutput = "There are 74 different constituencies in the North West region of England. " +
                "In the Cheshire region, those are City of Chester, Congleton, Crewe and Nantwich, Eddisbury, " +
                "Ellesmere Port and Neston, Halton, Macclesfield, Tatton, Warrington North, Warrington South, " +
                "Weaver Vale, Barrow and Furness, Carlisle, Copeland, Penrith and The Border, Westmorland and Lonsdale, " +
                "Workington. " +
                "In the Greater Manchester region, those are Altrincham and Sale West, Ashton-under-Lyne, " +
                "Blackley and Broughton, Bolton North East, Bolton South East, Bolton West, Bury North, " +
                "Bury South, Cheadle, Denton and Reddish, Hazel Grove, Heywood and Middleton, Leigh, " +
                "Makerfield, Manchester Central, Manchester Gorton, Manchester Withington, " +
                "Oldham East and Saddleworth, Oldham West and Royton, Rochdale, Salford and Eccles, " +
                "Stalybridge and Hyde, Stockport, Stretford and Urmston, Wigan,Worsley and Eccles South, " +
                "Wythenshawe and Sale East. " +
                "In the Lancashire region, those are Blackburn, Blackpool North and Cleveleys, Blackpool South, " +
                "Burnley, Chorley, Fylde, Hyndburn, Lancaster and Fleetwood, Morecambe and Lunesdale, " +
                "Pendle, Preston, Ribble Valley, Rossendale and Darwen, South Ribble, West Lancashire, " +
                "Wyre and Preston North. " +
                "In the Merseyside region, those are Birkenhead, Bootle, Garston and Halewood, Knowsley, " +
                "Liverpool Riverside, Liverpool Walton, Liverpool Wavertree, Liverpool West Derby, " +
                "Sefton Central, Southport, St Helens North, St Helens South and Whiston, " +
                "Wallasey, Wirral South, Wirral West. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Halton. ";                
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Halton. ";
        } else if (this.event.request.intent.slots.region.value === "south east") {
            var speechOutput = "There are 83 different constituencies in the South East region of England. " +
                "In the Berkshire region, those are Bracknell, Maidenhead, Newbury, Reading East, Reading West, " +
                "Slough, Windsor, Wokingham. " +
                "In the Buckinghamshire region, those are Aylesbury, Beaconsfield, Buckingham, " +
                "Chesham and Amersham, Milton Keynes North, Milton Keynes South, Wycombe. " +
                "In the East Sussex region, those are Bexhill and Battle, Brighton Kemptown, Brighton Pavilion, " +
                "Eastbourne, Hastings and Rye, Hove, Lewes, Wealden. " +
                "In the Hampshire region, those are Aldershot, Basingstoke, East Hampshire, Eastleigh, Fareham, " +
                "Gosport, Havant, Meon Valley, New Forest East, New Forest West, North East Hampshire, " +
                "North West Hampshire, Portsmouth North, Portsmouth South, Romsey and Southampton North, " + 
                "Southampton Itchen, Southampton Test, Winchester. " +
                "In the Kent region, those are Ashford, Canterbury, Chatham and Aylesford, Dartford, Dover, " +
                "Faversham and Mid Kent, Folkestone and Hythe, Gillingham and Rainham, Gravesham, " +
                "Maidstone and The Weald, North Thanet, Rochester and Strood, Sevenoaks, Sittingbourne and Sheppey, " +
                "South Thanet, Tonbridge and Malling, Tunbridge Wells. " +
                "In the Oxfordshire region, those are Banbury, Henley, Oxford East, Oxford West and Abingdon, " +
                "Wantage, Witney. " +
                "In the Surrey region, those are East Surrey, Epsom and Ewell, Esher and Walton, Guildford, " +
                "Mole Valley, Reigate, Runnymede and Weybridge, South West Surrey, Spelthorne, " +
                "Surrey Heath, Woking. " +
                "In the West Sussex region, those are Arundel and South Downs, Bognor Regis and Littlehampton, " +
                "Chichester, Crawley, East Worthing and Shoreham, Horsham, Mid Sussex, Worthing West. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Canterbury. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Canterbury. ";
        } else if (this.event.request.intent.slots.region.value === "south west") {
            var speechOutput = "There are 54 different constituencies in the South West region of England. " +
                "In the Bristol region, those are Bristol East, Bristol North West, Bristol South, and Bristol West. " +
                "In the Cornwall region, those are Camborne and Redruth, North Cornwall, South East Cornwall, " +
                "St Austell and Newquay, St Ives, Truro and Falmouth. " +
                "In the Devon region, those are Central Devon, East Devon, Exeter, Newton Abbot, North Devon, " +
                "Plymouth Moor View, Plymouth Sutton and Devonport, South West Devon, Tiverton and Honiton, " +
                "Torbay, Torridge and West Devon, Totnes. " + 
                "In the Dorset region, those are Bournemouth East, Bournemouth West, Christchurch, " +
                "Mid Dorset and North Poole, North Dorset, Poole, South Dorset, West Dorset. " + 
                "In the Gloucestershire region, those are Cheltenham, Forest of Dean, Gloucester, Stroud, Tewkesbury, The Cotswolds. " +
                "In the Somerset region, those are Bridgwater and West Somerset, Somerton and Frome, Taunton Deane, Wells, Yeovil. " +
                "In the South Gloucestershire region, those are Filton and Bradley Stoke, Kingswood, Thornbury and Yate. " +
                "In the Wiltshire region, those are Chippenham, Devizes, North Swindon, North Wiltshire, " +
                "Salisbury, South Swindon, South West Wiltshire. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Salisbury. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Salisbury. ";
        } else if (this.event.request.intent.slots.region.value === "west Midlands") {
            var speechOutput = "There are 59 different constituencies in the West Midlands region of England. " +
                "In the Shropshire region, those are Ludlow, North Shropshire, Shrewsbury and Atcham, Telford, The Wrekin. " +
                "In the Staffordshire region, those are Burton, Cannock Chase, Lichfield, " +
                "Newcastle-under-Lyme, South Staffordshire, Stafford, Staffordshire Moorlands, " +
                "Stoke-on-Trent Central, Stoke-on-Trent North, Stoke-on-Trent South, Stone, Tamworth. " +
                "In the Warwickshire region, those are Kenilworth and Southam, North Warwickshire, " +
                "Nuneaton, Rugby, Stratford-on-Avon, Warwick and Leamington. " +
                "In the West Midlands region, those are Aldridge-Brownhills, Birmingham Edgbaston, Birmingham Erdington, " +
                "Birmingham Hall Green, Birmingham Hodge Hill, Birmingham Ladywood, Birmingham Northfield, " +
                "Birmingham Perry Barr, Birmingham Selly Oak, Birmingham Yardley, Coventry North East, " +
                "Coventry North West, Coventry South, Dudley North, Dudley South, Halesowen and Rowley Regis, " +
                "Meriden, Solihull, Stourbridge, Sutton Coldfield, Walsall North, Walsall South, Warley, " +
                "West Bromwich East, West Bromwich West, Wolverhampton North East, Wolverhampton South East, " +
                "Wolverhampton South West. " +
                "In the Worcestershire region, those are Bromsgrove, Mid Worcestershire, Redditch, " +
                "West Worcestershire, Worcester, Wyre Forest. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Ludlow. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Ludlow. ";
        } else if (this.event.request.intent.slots.region.value === "Yorkshire") {
            var speechOutput = "There are 52 different constituencies in the Yorkshire region of England. " + 
                "In the East Yorkshire and North Lincolnshire region, those are Beverley and Holderness, " +
                "Brigg and Goole, Cleethorpes, East Yorkshire, Great Grimsby, Haltemprice and Howden, " +
                "Kingston upon Hull East, Kingston upon Hull North, Kingston upon Hull West and Hessle, " +
                "Scunthorpe. " +
                "In the North Yorkshire region, those are Harrogate and Knaresborough, Richmond, " +
                "Scarborough and Whitby, Selby and Ainsty, Skipton and Ripon, Thirsk and Malton, " +
                "York Central, York Outer. " +
                "In the South Yorkshire region, those are Barnsley Central, Barnsley East, Don Valley, " +
                "Doncaster Central, Doncaster North, Penistone and Stocksbridge, Rother Valley, Rotherham, " +
                "Sheffield Central, Sheffield South East, Sheffield Brightside and Hillsborough, " +
                "Sheffield Hallam, Sheffield Heeley, Wentworth and Dearne. " +
                "In the West Yorkshire region, those are Bradford East, Bradford South, Bradford West, " +
                "Keighley, Shipley, Calder Valley, Halifax, Batley and Spen, Colne Valley, " +
                "Dewsbury, Huddersfield, Morley and Outwood, Elmet and Rothwell, Leeds Central, " +
                "Leeds East, Leeds North East, Leeds North West, Leeds West, Pudsey, " +
                "Hemsworth, Normanton Pontefract and Castleford, Wakefield. " +
                "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Wakefield. ";
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in Wakefield. ";
        } else {
            var speechOutput = "I'm sorry, I couldn't understand what region you are looking for. ";
            console.log("Region Value: " + this.event.request.intent.slots.region.value);
            var reprompt = "If you would like to know who is running for election in any of these, " +
                "please ask for it by saying something like Who is running for office in North Durham. ";
        }
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.HelpIntent': function() {
        var message = 'Sorry, I did not understand what you asked for. Please try again.';
        var reprompt = 'What region are you looking for? Please say something like England, Wales, or Scotland.';
        this.emit(':ask', message, reprompt);
    },
    'AMAZON.NoIntent': function() {
        console.log("NOINTENT");
        this.emit(':ask', 'To get started, which country is this constituency located in? ',
            'Which country are you looking for? Choices are England, Wales, Scotland, and Northern Ireland');
    },
    "AMAZON.StopIntent": function() {
        console.log("STOPINTENT");
      this.emit(':tell', "Goodbye!");  
    },
    "AMAZON.CancelIntent": function() {
        console.log("CANCELINTENT");
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST");
        this.attributes['endedSessionCount'] += 1;
        this.emit(':tell', "Goodbye!");
    },
    'Unhandled': function() {
        console.log("UNHANDLED");
        this.emit(':tell', 'Sorry, I did not understand what you asked for. Please try again.');
    }
});

