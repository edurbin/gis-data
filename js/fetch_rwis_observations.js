var fetch = require('node-fetch');
var rwis_surface_url = 'https://mesonet.agron.iastate.edu/data/rwis_sf.txt';
var rwis_atmos_url = 'https://mesonet.agron.iastate.edu/data/rwis.txt';
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/wxdata');
var RwisSite = require('./models/rwis_sites');
var RwisObs = require('./models/rwis_obs');
var CSV = require('csv-string');
var url_array = [rwis_surface_url, rwis_atmos_url];
var rwisObservations = {};
var atmosObservations = {}; //only 1 atmospheric observation per site
var siteMap = {};
function isSurfaceData(row){
    return row.length == 15 ? true : false;
}

var buildAtmosphericObservation = function(row) {
    var rpuId = row[1];
    var timestamp = row[3];
    var obsKey = JSON.stringify({rpu_id: rpuId, time: timestamp});
    //TODO clean up values, convert to Farenheit, average wind direction min/max
    atmosObservations[obsKey] = {
        air_temp: row[4],
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
        visibility: row[16]
    };    
}

var buildSurfaceObservations = function(row) {
    var rpuId = row[1];
    var sensorId = row[2];
    var timestamp = row[3];
    var obsKey = JSON.stringify({rpu_id: rpuId, sensor_id: sensorId, time: timestamp});
    var surfaceCondition = row[4];
    var surfaceTemp = row[5];
    var freezeTemp = row[6];
    var depth = row[8];
    var icePct = row[9];
    var subTemp = row[10];
    rwisObservations[obsKey] = new RwisObs({
        surface_condition: surfaceCondition,
        surface_temp: surfaceTemp,
        freeze_temp: freezeTemp,
        depth: depth,
        ice_pct: icePct,
        sub_temp: subTemp
    }); 
}


RwisSite.find({}, function(err, rwisSites){
rwisSites.forEach(function(rwisSite){
    var rpuId = rwisSite.rpu_id;
    var sensorId = rwisSite.sensor_id;
    var siteKey = JSON.stringify({rpu_id: rpuId, sensor_id: sensorId});
    siteMap[siteKey] = rwisSite;        
});

var promises = url_array.map(url => fetch(url).then(response => response.text()));
Promise.all(promises).then(results => {
    results.forEach(function(data){
        var rows = CSV.parse(data);
        var firstRow = rows.shift();
        rows.forEach(function(row){
	    if(isSurfaceData(firstRow)){
	        buildSurfaceObservations(row);
            } else {
                buildAtmosphericObservation(row);
            }
        });
    });
        var actions = Object.keys(rwisObservations).map(function(key, index){
            var rwisObservation = rwisObservations[key];
            var keyObj  = JSON.parse(key);
            var rpuId = keyObj.rpu_id;
            var sensorId = keyObj.sensor_id;
            var timestamp = keyObj.time;
            var obsKey = JSON.stringify({rpu_id: rpuId, time: timestamp});
            if(atmosObservations[obsKey]) {
                var atmosphericObservation = atmosObservations[obsKey];
                Object.keys(atmosphericObservation).forEach(function(atmosKey){
                    rwisObservation[atmosKey] = atmosphericObservation[atmosKey];
                });
            }
            var siteKey = JSON.stringify({rpu_id: rpuId, sensor_id: sensorId});
            var rwisSite = siteMap[siteKey];
            rwisObservation.rwis_site = rwisSite;
            var promise = rwisObservation.save();
            return promise;
        
        }); 
        Promise.all(actions).then(function(){
            mongoose.connection.close();
        });
    });
});

