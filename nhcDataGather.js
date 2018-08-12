'use strict';

const http = require('http');
var aws = require('aws-sdk');

exports.handler = (event, context, callback) => {
    const APIurl = 'http://www.prh.noaa.gov/cphc/tcpages/archive/2018/TCPCP1.EP102018.049.201808121452';

    http.get(APIurl, (res) => {
        console.log('API Call HTTP Code: ', res.statusCode); // this indicates if the HTTP request was valid

        var tempData = "";

        res.on('data', (d) => {
            tempData += d;
        });
                        
        // this is the logic that gets executed once a successful API call is completed
        res.on('end', (d) => {
            console.log('completed request');
            // now process data returned from the API call
            var returnData = tempData.toString('utf8');
            //var returnData = eval('(' + tempData.toString('utf8') + ')');
            //console.log(JSON.stringify(returnData));
            //console.log(returnData.slice(0,100));
            
            const bulletinStart = returnData.search("BULLETIN");
            const yearStart = returnData.search(" 2018");
            const timeStart = returnData.search("2018");
            console.log("Time Start:" + timeStart);
            var forecastDate = returnData.slice(timeStart + 5, yearStart + 5);
                forecastDate = forecastDate.replace("00",":00");
                forecastDate = forecastDate.replace("HST", "Hawaiian Standard Time,");
                forecastDate = forecastDate.replace("MDT", "Mountain Daylight Time,");
                forecastDate = forecastDate.replace("PDT", "Pacific Daylight Time,");
                forecastDate = forecastDate.replace("Aug", "August");
                forecastDate = forecastDate.replace("Mon", "Monday,");
                forecastDate = forecastDate.replace("Fri", "Friday,");
                forecastDate = forecastDate.replace("Sat", "Saturday,");
            console.log("Forecast Date: " + forecastDate);

            const nextAdvisoryStart = returnData.search("NEXT ADVISORY");
            var nextAdvisory = returnData.slice(nextAdvisoryStart + 54, nextAdvisoryStart + 65);
                nextAdvisory = nextAdvisory.replace("00",":00");
                nextAdvisory = nextAdvisory.replace("MDT", "Mountain Daylight Time");
                nextAdvisory = nextAdvisory.replace("PDT", "Pacific Daylight Time");
                nextAdvisory = nextAdvisory.replace("HST", "Hawaiian Standard Time");
                
            console.log("Next Advisory: " + nextAdvisory);
            
            const coordinatesStart = returnData.search("LOCATION");
            const coordinates = returnData.slice(coordinatesStart + 11, coordinatesStart + 23);
            const northCoordinateEnd = coordinates.search("N");
            const westCoordinateStart = coordinates.search("W");
            const northCoordinate = coordinates.slice(0, northCoordinateEnd);
            const westCoordinate = coordinates.slice(westCoordinateStart - 5, westCoordinateStart);
            
            //console.log("Coordinates: " + coordinates);
            console.log("North Coordinate: " + northCoordinate + " North");
            console.log("West Coordinate: " + westCoordinate + " West");
            
            const locationStart = returnData.search("ABOUT");
            const windsStart = returnData.search("MAXIMUM SUSTAINED WINDS");

            const location = returnData.slice(locationStart + 6, windsStart - 1);
            const locationMilesEnd = location.search("MI");
            const locationKiloEnd = location.search("KM");
            const locationValue = location.slice(0, locationMilesEnd - 1);
            var locationGeography = location.slice(locationKiloEnd + 3, 99);
                locationGeography = locationGeography.replace("WSW OF","West Southwest of");            
                locationGeography = locationGeography.replace("W OF","West of");
                locationGeography = locationGeography.replace("N OF","North of");
                locationGeography = locationGeography.replace("SSE OF", "South Southeast of");
                locationGeography = locationGeography.replace("ESE OF", "East Southeast of");
                locationGeography = locationGeography.replace("SE OF", "Southeast of");
            const secondLocation = locationGeography.search("ABOUT");
            if (secondLocation > 1) {
                console.log("Removed second location details");
                locationGeography = locationGeography.slice(0, secondLocation - 1);
            }
            console.log("Second Location: " + secondLocation);
            console.log("Location: " + locationValue + " miles " + locationGeography);
            //console.log("Geography: " + locationGeography);
            
            const winds = returnData.slice(windsStart + 26, windsStart + 33);
            const windsValueDigits = winds.search("MPH") - 1; 
            const windsValue = winds.slice(0, windsValueDigits);
            console.log("Winds: " + windsValue + " MPH");

            var stormType = "Tropical Storm";
            if (windsValue < 39) {
                stormType = "Tropical Depression";
            } else if (windsValue > 74) {
                stormType = "Hurricane";
            }
            console.log("Storm Type: " + stormType);
            
            const movementStart = returnData.search("PRESENT MOVEMENT");
            const movement = returnData.slice(movementStart + 19, movementStart + 45);
            const movementAT = movement.search("AT");
            const movementMPH = movement.search("MPH");
            const movementOR = movement.search("OR");
            const movementSpeed = movement.slice(movementAT + 3, movementMPH - 1);
            var movementDirection = movement.slice(0, movementOR);
                movementDirection = movementDirection.replace("WNW ", "West Northwest");
                movementDirection = movementDirection.replace("NNW ", "North Northwest");
                movementDirection = movementDirection.replace("NW ", "Northwest");
                movementDirection = movementDirection.replace("N ", "North");
                movementDirection = movementDirection.replace("W ", "West");
            //console.log("Movement: " + movement);
            console.log("Movement: " + movementDirection + " at " + movementSpeed + " MPH");
            //console.log("Movement Speed: " + movementSpeed + " MPH");
                
            const pressureStart = returnData.search("MINIMUM CENTRAL PRESSURE");
            const pressure = returnData.slice(pressureStart + 27, pressureStart + 33);
            const pressureDigits = pressure.search("MB") - 1;
            const pressureValue = pressure.slice(0, pressureDigits);
            //console.log("Pressure Digits: " + pressureDigits);
            console.log("Pressure: " + pressureValue);

            const surfStart = returnData.search("SURF: ");
            const windStart = returnData.search("WIND: ");
            if (surfStart > 0) {
                var surfForecast = returnData.slice(surfStart + 6, windStart);
                    surfForecast = surfForecast.replace("\n", " ");
                    surfForecast = surfForecast.replace("\n", " ");
                    surfForecast = surfForecast.replace("\n", " ");
                    surfForecast = surfForecast.replace("\n", " ");
                    surfForecast = surfForecast.replace("\n", " ");
                    surfForecast = surfForecast.replace("\n", " ");
                    surfForecast = surfForecast.replace("\n", " ");
                console.log("Surf Forecast: " + surfForecast);
            }
            
            var s3 = new aws.S3();
            
            var getParams = {Bucket : 'hurricane-data', Key : 'currStorms.json'}; 
                    
            s3.getObject(getParams, function(err, data) {
                if(err)
                    console.log('Error getting storm data : ' + err);
                else {
                    var returnData = eval('(' + data.Body + ')');
                    // this is the storm number in the array
                    const stormNumber = 0;
                    // this is the detail unique to the storm
                    var stormData = returnData[0].storms[stormNumber];
                    console.log('current storm data: ' + JSON.stringify(stormData));
                    stormData.peakWinds = Number(windsValue);
                    stormData.pressure = Number(pressureValue);
                    stormData.location.lat = northCoordinate + " North";
                    stormData.location.long = westCoordinate + " West";
                    stormData.location.proximity = locationValue + " miles " + locationGeography;
                    stormData.location.name = "Hawaii";
                    stormData.location.distance = Number(locationValue);
                    stormData.movement.direction = movementDirection;
                    stormData.movement.speed = Number(movementSpeed);
                    console.log('updated storm data: ' + JSON.stringify(stormData));

                    if (returnData[0].latestUpdate === forecastDate &&
                        returnData[0].storms[stormNumber] === stormData) {
                        console.log("No Changes");
                    } else {
                        console.log("Updated Forecast");
                        
                        // overlay updated storm information
                        returnData[0].latestUpdate = forecastDate;
                        returnData[0].nextUpdate = nextAdvisory;
                        returnData[0].storms[stormNumber] = stormData;
                    
                        var s3 = new aws.S3();

                        var postData = JSON.stringify(returnData);

                        var putParams = {Bucket : 'hurricane-data', Key : 'currStorms.json', Body: postData};

                        // write to an S3 bucket
                        s3.putObject(putParams, function(err, data) {
                            if(err)
                                console.log('Error posting data' + err);
                            else
                                console.log('Successfully posted data' + putParams.Body);
                        });
                    }
                }
            });
        });
    }).on('error', (e) => {
        console.error(e);
    });
};
