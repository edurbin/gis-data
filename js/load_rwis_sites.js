var fs = require('fs');
var rwis_sites = '../conf/rwis_sensors.csv';
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/wxdata');
var RwisSite = require('./models/rwis_sites');
var CSV = require('csv-string');
var db = mongoose.connection;

var fn = function buildRwisSite(row) {
    var rpuId = row[0];
    var sensorName = row[1];
    var township = row[2];
    var lat = row[7];
    var lon = row[8];
    var altitude = row[9];
    var county = row[10];
    var routeName = row[11];
    var milePost = row[12];
    var garageName = row[14];
    var sensorId = row[17];
    var priority = row[19];

    var rwisSite = new RwisSite({
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
    var promise = rwisSite.save();
    return promise;
}

fs.readFile(rwis_sites, 'utf8', function (err, data) {
    if (err) {
        return console.log(err);
    }
    var csvArr = CSV.parse(data);
    var actions = csvArr.map(fn);
    Promise.all(actions).then(function () {
        mongoose.connection.close();
    });
});

