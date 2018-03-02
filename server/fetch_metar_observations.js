var fetch = require('node-fetch');
var Visibility = require('../utils/visibility');
var Wind = require('../utils/wind');
var Temperature = require('../utils/temperature');
var metarUrl = 'http://tgftp.nws.noaa.gov/data/observations/metar/stations/';
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/wxdata');
var MetarSite = require('../models/metar_sites');
var MetarObs = require('../models/metar_obs');

var getWindDirection = function (windSpeedData) {
    return windSpeedData.substr(0, 3);
}

var getWindSpeed = function (windSpeedData) {
    var windSpeed = windSpeedData.substr(3, 2);
    windSpeed = Wind.convertKnotsToMiles(windSpeed);
    return windSpeed;
}

var getWindGust = function (windSpeedData) {
    var windGust = 0;
    if (windSpeedData.length > 7) {
        windGust = windSpeedData.substr(6, 2);
        windGust = Wind.convertKnotsToMiles(windGust);
    }
    return windGust;
}

var getTemperature = function (tempData) {
    var firstDigit = tempData.substr(0, 1);
    if (firstDigit == "M") {
        var temp = tempData.substr(1, 2);
        return "-" + Temperature.celciusTempToFarenheit(temp);
    } else {
        var temp = tempData.substr(0, 2);
        return Temperature.celciusTempToFarenheit(temp);
    }
}

var getDewPoint = function (tempData) {
    var startIndex = tempData.indexOf("/");
    var firstDigit = tempData.substr(startIndex, 1);
    if (firstDigit == "M") {
        var dewPoint = tempData.substr((startIndex + 1), 2);
        dewPoint = Temperature.celciusTempToFarenheit(dewPoint);
        if (!isNaN(dewPoint)) {
            return "-" + dewPoint;
        }
    } else {
        var dewPoint = tempData.substr((startIndex + 1), 2);
        dewPoint = Temperature.celciusTempToFarenheit(dewPoint);
        if (!isNaN(dewPoint)) {
            return dewPoint;
        }
    }
    return null;
}

var getPrecipIntensity = function (precipData) {
    var precipIntensity = null;
    var intensityValues = {
        "-": "Light",
        "+": "Heavy",
        "VC": "Vicinity"
    };
    Object.keys(intensityValues).forEach(function (intensity) {
        if (precipData.indexOf(intensity) >= 0) {
            precipIntensity = intensityValues[intensity];
            return;
        }
    });

    return precipIntensity;
}

var getDescriptor = function (precipData) {
    var returnDescriptor;
    var descriptors = {
        'MI': 'Shallow',
        'PR': 'Partial',
        'BC': 'Patches',
        'DR': 'Low Drifting',
        'BL': 'Blowing',
        'SH': 'Showers',
        'TS': 'Thunderstorm',
        'FZ': 'Freezing'
    };
    Object.keys(descriptors).forEach(function (descriptor) {
        if (precipData.indexOf(descriptor) >= 0) {
            returnDescriptor = descriptors[descriptor];
        }
    });
    return returnDescriptor;
}

var getPrecipitation = function (precipData) {
    var precip;
    var precipitationTypes = {
        'DZ': 'Drizzle',
        'RA': 'Rain',
        'SN': 'Snow',
        'SG': 'Snow',
        'IC': 'Ice',
        'PL': 'Ice',
        'GR': 'Hail',
        'GS': 'Hail',
        'UP': 'Unknown'
    };
    Object.keys(precipitationTypes).forEach(function (precipType) {
        if (precipData.indexOf(precipType) >= 0) {
            precip = precipitationTypes[precipType];
            return precip;
        }
    });
    return precip;
}

var getPrecipType = function (precipData) {
    var precipType = getPrecipitation(precipData);
    if (precipType !== undefined) {
        var descriptor = getDescriptor(precipData);
        if (descriptor !== undefined) {
            precipType = descriptor + precipType;
        }
    }
    return precipType;
}

var buildMetarObservation = function (metarSite, rows) {
    var observationDate = new Date(rows[0] + "Z");
    var observationData = buildObservationData(rows[1]);
    var windDirection = getWindDirection(observationData[2]);
    var windSpeed = getWindSpeed(observationData[2]);
    var windGust = getWindGust(observationData[2]);
    var visibilityObs = Visibility.convertStatuteMiles(observationData[3]);

    var tempIdx = findTemperatureIndex(observationData);
    var temperature = getTemperature(observationData[tempIdx]);
    var dewpoint = getDewPoint(observationData[tempIdx]);

    var conditionIdx = findSkyConditionIndex(observationData, tempIdx);
    var surfaceCondition = [];
    var precipitationIntensity;
    var precipitationType;
    var precipitationIntensity2;
    var precipitationType2;
    if (conditionIdx > 0) {
        if (conditionIdx > 4) {
            precipitationIntensity = getPrecipIntensity(observationData[4]);
            precipitationType = getPrecipType(observationData[4]);
            if (conditionIdx > 5) {
                precipitationIntensity2 = getPrecipIntensity(observationData[5]);
                precipitationType2 = getPrecipType(observationData[5]);
            }
        }
    }
    for (var idx = conditionIdx; idx < tempIdx; idx++) {
        surfaceCondition.push(observationData[idx]); //TODO parse sfc condition
    }

    var metarObservation = new MetarObs({
        metar_site: metarSite,
        timestamp: observationDate,
        air_temp: temperature,
        dewpoint: dewpoint,
        precipitation_intensity: precipitationIntensity,
        precipitation_type: precipitationType,
        precipitation_intensity2: precipitationIntensity2,
        precipitation_type2: precipitationType2,
        surface_condition: surfaceCondition,
        wind_direction: windDirection,
        wind_speed: windSpeed,
        wind_gust: windGust,
        visibility: visibilityObs
    });
    return metarObservation;
}

var findTemperatureIndex = function (observationData) {
    for (var idx = 4; idx < observationData.length; idx++) {
        var patt = /[M]?\d{2}\/([M]?\d{2})?/;
        if (patt.test(observationData[idx])) {
            return idx;
        }
    }
    return 6;
}

var findSkyConditionIndex = function (observationData, tempIdx) {
    for (var idx = 4; idx < tempIdx; idx++) {
        var patt = /\w{3}\d{3}(\w+)?|\w{3}|CAVOK/;
        if (patt.test(observationData[idx])) {
            return idx;
        }
    }
    return -1;
}

var buildObservationData = function (row) {
    var observationData = row.split(" ");
    if (observationData[2] == 'AUTO') {
        observationData.splice(1, 2, observationData[1] + " " + observationData[2]);
    }
    return observationData;
}
var visitedSites = 0;
MetarSite.find({}, function (err, metarSites) {
    metarSites.map(function (metarSite) {
        var url = metarUrl + metarSite.sensor_id + ".TXT";
        fetch(url).then(function (response) {
            visitedSites++;
            if (response.status != '404') {
                return response.text();
            }
            return;
        }).then(function (data) {
            if (data !== undefined) {
                var rows = data.split("\n");
                var metarObservation = buildMetarObservation(metarSite, rows);
                metarObservation.save();
            }
            if (visitedSites == metarSites.length - 1) {
                mongoose.connection.close();
            }
        });
    });

});
