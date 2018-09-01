"use strict"
const fetch = require('node-fetch');
const Visibility = require('../utils/visibility');
const Wind = require('../utils/wind');
const Temperature = require('../utils/temperature');
const metarUrl = 'http://tgftp.nws.noaa.gov/data/observations/metar/stations/';
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/wxdata');
const MetarSite = require('../models/metar_sites');
const MetarObs = require('../models/metar_obs');
let getWindDirection = (windSpeedData) => {
    return windSpeedData.substr(0, 3);
}

let getWindSpeed = (windSpeedData) => {
    let windSpeed = windSpeedData.substr(3, 2);
    windSpeed = Wind.convertKnotsToMiles(windSpeed);
    return windSpeed;
}

let getWindGust = (windSpeedData) => {
    let windGust = 0;
    if (windSpeedData.length > 7) {
        windGust = windSpeedData.substr(6, 2);
        windGust = Wind.convertKnotsToMiles(windGust);
    }
    return windGust;
}

let getTemperature = (tempData) => {
    let firstDigit = tempData.substr(0, 1);
    if (firstDigit == "M") {
        let temp = tempData.substr(1, 2);
        return "-" + Temperature.celciusTempToFarenheit(temp);
    } else {
        let temp = tempData.substr(0, 2);
        return Temperature.celciusTempToFarenheit(temp);
    }
}

let getDewPoint = (tempData) => {
    let startIndex = tempData.indexOf("/");
    let firstDigit = tempData.substr(startIndex, 1);
    if (firstDigit == "M") {
        let dewPoint = tempData.substr((startIndex + 1), 2);
        dewPoint = Temperature.celciusTempToFarenheit(dewPoint);
        if (!isNaN(dewPoint)) {
            return "-" + dewPoint;
        }
    } else {
        let dewPoint = tempData.substr((startIndex + 1), 2);
        dewPoint = Temperature.celciusTempToFarenheit(dewPoint);
        if (!isNaN(dewPoint)) {
            return dewPoint;
        }
    }
    return null;
}

let getPrecipIntensity = (precipData) => {
    let precipIntensity = null;
    const intensityValues = {
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

let getDescriptor = (precipData) => {
    let returnDescriptor;
    const descriptors = {
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

let getPrecipitation = (precipData) => {
    let precip;
    const precipitationTypes = {
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

let getPrecipType = (precipData) => {
    let precipType = getPrecipitation(precipData);
    if (precipType !== undefined) {
        let descriptor = getDescriptor(precipData);
        if (descriptor !== undefined) {
            precipType = descriptor + precipType;
        }
    }
    return precipType;
}

let buildMetarObservation = (metarSite, rows) => {
    let observationDate = new Date(rows[0] + "Z");
    let observationData = buildObservationData(rows[1]);
    let windDirection = getWindDirection(observationData[2]);
    let windSpeed = getWindSpeed(observationData[2]);
    let windGust = getWindGust(observationData[2]);
    let visibilityObs = Visibility.convertStatuteMiles(observationData[3]);

    let tempIdx = findTemperatureIndex(observationData);
    let temperature = getTemperature(observationData[tempIdx]);
    let dewpoint = getDewPoint(observationData[tempIdx]);

    let conditionIdx = findSkyConditionIndex(observationData, tempIdx);
    let surfaceCondition = [];
    let precipitationIntensity;
    let precipitationType;
    let precipitationIntensity2;
    let precipitationType2;
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
    for (let idx = conditionIdx; idx < tempIdx; idx++) {
        surfaceCondition.push(observationData[idx]); //TODO parse sfc condition
    }

    let metarObservation = new MetarObs({
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

let findTemperatureIndex = (observationData) => {
    for (let idx = 4; idx < observationData.length; idx++) {
        let patt = /[M]?\d{2}\/([M]?\d{2})?/;
        if (patt.test(observationData[idx])) {
            return idx;
        }
    }
    return 6;
}

let findSkyConditionIndex = (observationData, tempIdx) => {
    for (let idx = 4; idx < tempIdx; idx++) {
        let patt = /\w{3}\d{3}(\w+)?|\w{3}|CAVOK/;
        if (patt.test(observationData[idx])) {
            return idx;
        }
    }
    return -1;
}

let buildObservationData = (row) => {
    let observationData = row.split(" ");
    if (observationData[2] == 'AUTO') {
        observationData.splice(1, 2, observationData[1] + " " + observationData[2]);
    }
    return observationData;
}
let visitedSites = 0;
MetarSite.find({}, function (err, metarSites) {
    metarSites.map(function (metarSite) {
        let url = metarUrl + metarSite.sensor_id + ".TXT";
        fetch(url).then((response) => {
            visitedSites++;
            if (response.status != '404') {
                return response.text();
            }
            return;
        }).then((data) => {
            if (data !== undefined) {
                let rows = data.split("\n");
                let metarObservation = buildMetarObservation(metarSite, rows);
                //console.log(metarObservation);
                metarObservation.save();
            }
            if (visitedSites == metarSites.length - 1) {
                mongoose.connection.close();
            }
        });
    });
});
