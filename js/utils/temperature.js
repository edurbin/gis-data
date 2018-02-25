var Temperature = function () {};
var invalidTemperature = "32767";

var celciusToFarenheit = function(rawValue) {
    var celcius = new Number(rawValue) / 100;
    return celcius * 1.8 + 32;
} 

Temperature.prototype.rwisTempToFarenheit = function(rawValue) {
    if(rawValue != invalidTemperature) {
        return celciusToFarenheit(rawValue);
    }
    return null;
}


Temperature.prototype.celciusTempToFarenheit = function(rawValue) {
    return celciusToFarenheit(rawValue);
}
module.exports = new Temperature();
