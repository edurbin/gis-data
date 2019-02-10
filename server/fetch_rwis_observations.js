#!/usr/bin/env node
"use strict"
const fetch = require('node-fetch');
const Temperature = require('../utils/temperature');
const rwis_surface_url = 'https://mesonet.agron.iastate.edu/data/rwis_sf.txt';
const rwis_atmos_url = 'https://mesonet.agron.iastate.edu/data/rwis.txt';
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/wxdata');
const RwisSite = require('../models/rwis_sites');
const RwisObs = require('../models/rwis_obs');
const CSV = require('csv-string');
const url_array = [rwis_surface_url, rwis_atmos_url];
let rwisObservations = {};
let atmosObservations = {}; //only 1 atmospheric observation per site
let siteMap = {};
let isSurfaceData = (row) => {
    return row.length == 15 ? true : false;
}

let buildAtmosphericObservation = (row) => {
    let rpuId = row[1];
    let timestamp = row[3];
    let obsKey = JSON.stringify({ rpu_id: rpuId, time: timestamp });
    atmosObservations[obsKey] = {
        air_temp: Temperature.rwisTempToFarenheit(row[4]),
        dewpoint: row[5],
        relative_humidity: row[6],
        wind_speed: row[7],
        wind_gust: row[8],
        wind_direction: row[10],
        atmospheric_pressure: row[11],
        precipitation_intensity: row[12],
        precipitation_type: row[13],
        precipitation_rate: row[14],
        accumulation: row[15],
        visibility: row[16],
        timestamp: timestamp
    };
}

let buildSurfaceObservations = (row) => {
    let rpuId = row[1];
    let sensorId = row[2];
    let timestamp = row[3];
    let obsKey = JSON.stringify({ rpu_id: rpuId, sensor_id: sensorId, time: timestamp });
    let surfaceCondition = row[4];
    let surfaceTemp = Temperature.rwisTempToFarenheit(row[5]);
    let freezeTemp = Temperature.rwisTempToFarenheit(row[6]);
    let depth = row[8];
    let icePct = row[9];
    let subTemp = Temperature.rwisTempToFarenheit(row[10]);
    rwisObservations[obsKey] = new RwisObs({
        surface_condition: surfaceCondition,
        surface_temp: surfaceTemp,
        freeze_temp: freezeTemp,
        depth: depth,
        ice_pct: icePct,
        sub_temp: subTemp
    });
}


RwisSite.find({}, (err, rwisSites) => {
    rwisSites.forEach((rwisSite) => {
        let rpuId = rwisSite.rpu_id;
        let sensorId = rwisSite.sensor_id;
        let siteKey = JSON.stringify({ rpu_id: rpuId, sensor_id: sensorId });
        siteMap[siteKey] = rwisSite;
    });

    let promises = url_array.map(url => fetch(url).then(response => response.text()));
    Promise.all(promises).then(results => {
        results.forEach((data) => {
            let rows = CSV.parse(data);
            let firstRow = rows.shift();
            rows.forEach(function (row) {
                if (isSurfaceData(firstRow)) {
                    buildSurfaceObservations(row);
                } else {
                    buildAtmosphericObservation(row);
                }
            });
        });
        let actions = Object.keys(rwisObservations).map((key, index) => {
            let rwisObservation = rwisObservations[key];
            let keyObj = JSON.parse(key);
            let rpuId = keyObj.rpu_id;
            let sensorId = keyObj.sensor_id;
            let timestamp = keyObj.time;
            let obsKey = JSON.stringify({ rpu_id: rpuId, time: timestamp });
            if (atmosObservations[obsKey]) {
                var atmosphericObservation = atmosObservations[obsKey];
                Object.keys(atmosphericObservation).forEach(function (atmosKey) {
                    rwisObservation[atmosKey] = atmosphericObservation[atmosKey];
                });
            }
            let siteKey = JSON.stringify({ rpu_id: rpuId, sensor_id: sensorId });
            let rwisSite = siteMap[siteKey];
            rwisObservation.rwis_site = rwisSite;
            let promise = rwisObservation.save();
            return promise;

        });
        Promise.all(actions).then(() => {
            mongoose.connection.close();
        });
    });
});

