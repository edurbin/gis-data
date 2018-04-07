var express = require('express');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/wxdata');
var RwisSite = require('../models/rwis_sites');
var RwisObs = require('../models/rwis_obs');
var GeoJSON = require('geojson');
var router = express.Router();

router.get('/observation/:siteId', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    if (req.params.siteId !== undefined) {
        var siteId = req.params.siteId;
        RwisSite.findOne({ rpu_id: siteId }, function (err, rwisSite) {
            if (err) {
                res.send(JSON.stringify({}));
            }
            if (rwisSite != null && rwisSite !== undefined) {
                RwisObs.findOne({ rwis_site: rwisSite }).populate('rwis_site').sort({ 'timestamp': -1 }).exec(function (err, rwisObs) {
                    if (err) {
                        res.send(JSON.stringify({}));
                    }
                    var featureObj = { 'lat': rwisSite.lat, 'lon': rwisSite.lon, 'rwis_observation': rwisObs };
                    res.send(GeoJSON.parse(featureObj, { Point: ['lat', 'lon'] }));
                });
            } else {
                res.send(JSON.stringify({}));
            }
        });
    } else {
        res.send(JSON.stringify({}));
    }
});

module.exports = router;
