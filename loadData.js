console.log('starting up process');

var aws = require('aws-sdk');

var bucketName = 'hurricane-data';

exports.handler = function(event, context) {

    // create an object that will be stored 
    
    var stormData = {};
        stormData.stormYear = 2016;
        stormData.latestUpdate = "Saturday, May 28th, 2016 at 8:00AM Eastern Daylight Time";
        stormData.nextUpdate = "Saturday, May 28th, 2016 at 11:00AM Eastern Daylight Time"
        stormData.activeStorms = true;
    
    var stormArray = [];
    
    var atlanticStorm = {};
        atlanticStorm.stormName = "Two";
        atlanticStorm.ocean = "Atlantic";
        atlanticStorm.formed = true;
        atlanticStorm.stormType = "Tropical Depression";
        atlanticStorm.scale = "None";
        atlanticStorm.tropStormStart = "None";
        atlanticStorm.hurrStart = "None";
        atlanticStorm.landfall = false;
        atlanticStorm.peakWinds = 35;
        atlanticStorm.pressure = 1009;
        atlanticStorm.hurrEnd = "None";
        
    var location = {};
        location.lat = "30.0 North";
        location.long = "78.0 West";
        
        atlanticStorm.location = location;

    var movement = {};
        movement.direction = "Northwest";
        movement.speed = 14;

        atlanticStorm.movement = movement;
    
        atlanticStorm.generalForecast = "From the National Hurricane Center in Miami, Florida. " +
            "A Tropical Storm Warning has been issued " +
            "for the coast of South Carolina from the Savannah River northeastward to Little River Inlet. " +
            "A Tropical Storm Warning means that tropical storm conditions are expected somewhere " +
            "within the warning area within 36 hours. " +
            "The tropical depression center is currently located near " +
            "30.0 North and 78.0 West. " +
            "Present movement toward the Northwest at 14 miles per hour " +
            "and this general motion is expected to continue for the next 24 hours. " +
            "A reduction of the forward speed is expected by Saturday " +
            "night as the system nears the coast. " +
            "Looking ahead, tropical storm conditions are expected to first reach " +
            "the coast within the warning area by this evening, or early Sunday morning. " +
            "The depression is expected to produce total rainfall accumulations of 1 to 3 inches from " +
            "eastern South Carolina through southeastern North Carolina. " +
            "Storm surge inundation of 1 to 2 feet above ground level is expected within the tropical storm warning area. " +
            "This system is expected to produce life-threatening surf and rip current conditions along portions " +
            "of the southeastern United States coast through the weekend. Please consult products from your " +
            "local weather office. " +
            "The next complete advisory will be at 11:00AM Eastern Daylight Time. ";

    var hazards = {};
        hazards.rainfall = "1 to 3 inches from eastern South Carolina through southeastern North Carolina";
        hazards.stormSurge = "1 to 2 feet above ground level";
        hazards.surf = "life-threatening surf and rip current conditions along portions of the southeastern " +
            "United States coast through the weekend";
            
        atlanticStorm.hazards = hazards;

    //  atlanticStorm.generalForecast = "Shower activity associated with the low pressure area located between " +
    //      "Bermuda and the Bahamas continues to show signs of organization, and the circulation of the low has " +
    //      "become a little better defined overnight.  Environmental conditions are generally conducive for a " +
    //        "tropical or subtropical cyclone to form later today or Saturday while this system moves west north " +
    //        "westward to north westward toward the southeastern United States coast. " +
    //        "All interests along the southeast coast from Georgia through North Carolina should monitor the " +
    //        "progress of this low. " +
    //        "An Air Force Reserve Hurricane Hunter Aircraft is scheduled to investigate the low on Friday afternoon. " +
    //        "The next Special Tropical Weather Outlook on this disturbance will be issued by " +
    //        "3PM Eastern Daylight Time Friday afternoon. ";

    //    atlanticStorm.generalForecast = "Shower activity associated with the low pressure area located between " +
    //        "Bermuda and the Bahamas has become somewhat better organized since yesterday, and the circulation " +
    //        "of the low has become a little better defined. Environmental conditions are expected to be generally " +
    //        "conducive for a tropical or subtropical cyclone to form on Friday or Saturday while this system " +
    //        "moves west-northwestward or northwestward toward the southeastern United States coast. " +
    
    stormArray.push(atlanticStorm);
    stormData.storms = stormArray;
    
    var saveData = [];
    saveData.push(stormData);
      
    // now setup to put the object in the S3 bucket

    var s3 = new aws.S3();

    var postData = JSON.stringify(saveData);
    //var postData = stormData;

    var putParams = {Bucket : bucketName,
                    Key : 'currStorms.json',
                    Body: postData};

    // write to an S3 bucket

    s3.putObject(putParams, function(err, data) {
        if(err)
            console.log('Error posting data' + err);
        else
            console.log('Successfully posted data' + putParams.Body);
    });

    console.log(stormData.description);
};
