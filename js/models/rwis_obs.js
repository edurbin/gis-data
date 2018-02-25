var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    rwis_site: { type: Schema.Types.ObjectId, ref: 'RwisSite' },
    timestamp: { type: Date },
    air_temp: { type: Number },
    atmospheric_pressure: { type: Number },
    precipitation_intensity: { type: String },
    precipitation_type: { type: String },
    precipitation_rate: { type: Number },
    accumulation: { type: Number },
    surface_temp: { type: Number },
    sub_temp: { type: Number },
    depth: { type: Number },
    ice_pct: { type: Number },
    freeze_temp: { type: Number },
    surface_condition: { type: String },
    dewpoint: { type: Number },
    relative_humidity: { type: Number },
    wind_direction: { type: String },
    wind_speed: { type: Number },
    wind_gust: { type: Number },
    visibility: { type: Number }
});

module.exports = mongoose.model('RwisObs', schema); 
