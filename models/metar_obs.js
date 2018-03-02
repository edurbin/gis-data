var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema({
    metar_site: { type: Schema.Types.ObjectId, ref: 'MetarSite' },
    timestamp: { type: Date },
    air_temp: { type: Number },
    dewpoint: { type: Number },
    precipitation_intensity: { type: String },
    precipitation_type: { type: String },
    precipitation_type2: { type: String },
    precipitation_intensity2: { type: String },
    relative_humidity: { type: Number },
    surface_condition: [String],
    visibility: { type: Number },
    wind_direction: { type: String },
    wind_speed: { type: Number },
    wind_gust: { type: Number },
});

module.exports = mongoose.model('MetarObs', schema); 
