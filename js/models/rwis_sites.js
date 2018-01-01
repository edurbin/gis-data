var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    rpu_id: { type: String, required: true },
    county_name: {type: String},
    mile_post: {type: String},
    route_name: {type: String},
    sensor_id: { type: String },
    sensor_name: {type: String},
    garage: {type: String},
    altitude: {type: String},
    township: {type: String},
    priority: {type: String},
    lat: {type: Number},
    lon: {type: Number}
});

module.exports = mongoose.model('RwisSite', schema); 
