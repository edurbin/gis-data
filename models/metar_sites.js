var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    state: { type: String },
    sensor_name: { type: String },
    sensor_id: { type: String },
    faa_id: { type: String },
    synoptic_num: { type: String },
    lat: { type: String },
    lon: { type: String },
    elevation: { type: String }
});

module.exports = mongoose.model('MetarSite', schema); 
