'use strict';

const https = require('https');

exports.handler = (event, context, callback) => {
    //var APIurl = 'http://api.wunderground.com/api/f9815242167ffac0/currenthurricane/view.json';
    var APIurl = 'https://www.nhc.noaa.gov/text/refresh/MIATCPEP5+shtml/051435.shtml';

    https.get(APIurl, (res) => {
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
            const forecastDate = returnData.slice(bulletinStart + 100, bulletinStart + 126);
            console.log("Forecast Date: " + forecastDate);

            const nextAdvisoryStart = returnData.search("NEXT ADVISORY");
            const nextAdvisory = returnData.slice(nextAdvisoryStart + 54, nextAdvisoryStart + 65);
            console.log("Next Advisory: " + nextAdvisory);
            
            const coordinatesStart = returnData.search("LOCATION");
            const coordinates = returnData.slice(coordinatesStart + 11, coordinatesStart + 23);
            const northCoordinateEnd = coordinates.search("N");
            const westCoordinateStart = coordinates.search("W");
            const northCoordinate = coordinates.slice(0, northCoordinateEnd);
            const westCoordinate = coordinates.slice(westCoordinateStart - 5, westCoordinateStart);
            
            //console.log("Coordinates: " + coordinates);
            console.log("North Coordinate: " + northCoordinate);
            console.log("West Coordinate: " + westCoordinate);
            
            const locationStart = returnData.search("ABOUT");
            const windsStart = returnData.search("MAXIMUM SUSTAINED WINDS");

            const location = returnData.slice(locationStart + 6, windsStart - 1);
            console.log("Location: " + location);
            
            const winds = returnData.slice(windsStart + 26, windsStart + 33);
            console.log("Winds: " + winds);
            
            const movementStart = returnData.search("PRESENT MOVEMENT");
            const movement = returnData.slice(movementStart + 19, movementStart + 45);
            console.log("Movement: " + movement);
            
            const pressureStart = returnData.search("MINIMUM CENTRAL PRESSURE");
            const pressure = returnData.slice(pressureStart + 27, pressureStart + 33);
            const pressureDigits = pressure.search("MB") - 1;
            const pressureValue = pressure.slice(0, pressureDigits);
            //console.log("Pressure Digits: " + pressureDigits);
            console.log("Pressure: " + pressureValue);
            
            
            //console.log("BULLETIN:" + returnData.search("BULLETIN"));
            //console.log("LOCATION:" + returnData.search("LOCATION"));
        });
    }).on('error', (e) => {
        console.error(e);
    });
};
