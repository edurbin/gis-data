var Temperature = function () {};
var invalidTemperature = "32767";

Temperature.prototype.rwisTempToFarenheit = function(rawValue) {
    if(rawValue != invalidTemperature) {
        var celcius = new Number(rawValue) / 100;
        return celcius * 1.8 + 32;
    }
    return null;
}

module.exports = new Temperature();
