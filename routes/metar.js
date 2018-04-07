var express = require('express');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/wxdata');
var MetarSite = require('../models/metar_sites');
var MetarObs = require('../models/metar_obs');
var GeoJSON = require('geojson');
var router = express.Router();

router.get('/observation/:siteId', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    if (req.params.siteId !== undefined) {
        var siteId = req.params.siteId;
        MetarSite.findOne({ sensor_id: siteId }, function (err, metarSite) {
            if (err) {
                res.send(JSON.stringify({}));
            }
            if (metarSite != null && metarSite !== undefined) {
                MetarObs.findOne({ metar_site: metarSite }).populate('metar_site').sort({ 'timestamp': -1 }).exec(function (err, metarObs) {
                    if (err) {
                        res.send(JSON.stringify({}));
                    }
                    var featureObj = { 'lat': metarSite.lat, 'lon': metarSite.lon, 'metar_observation': metarObs };
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
