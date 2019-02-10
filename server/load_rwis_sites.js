#!/usr/bin/env node
"use strict"
const fs = require('fs');
const rwis_sites = '../config/rwis_sensors.csv';
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/wxdata');
const RwisSite = require('../models/rwis_sites');
const CSV = require('csv-string');
const db = mongoose.connection;

let fn = (row) => {
    let rpuId = row[0];
    let sensorName = row[1];
    let township = row[2];
    let lat = row[7];
    let lon = row[8];
    let altitude = row[9];
    let county = row[10];
    let routeName = row[11];
    let milePost = row[12];
    let garageName = row[14];
    let sensorId = row[17];
    let priority = row[19];

    let rwisSite = new RwisSite({
        rpu_id: rpuId,
        county_name: county,
        mile_post: milePost,
        route_name: routeName,
        sensor_id: sensorId,
        sensor_name: sensorName,
        garage: garageName,
        altitude: altitude,
        township: township,
        priority: priority,
        lat: lat,
        lon: lon
    });
    let promise = rwisSite.save();
    return promise;
}

fs.readFile(rwis_sites, 'utf8', function (err, data) {
    if (err) {
        return console.log(err);
    }
    let csvArr = CSV.parse(data);
    let actions = csvArr.map(fn);
    Promise.all(actions).then(function () {
        mongoose.connection.close();
    });
});

