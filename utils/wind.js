var Wind = function () {};

Wind.prototype.convertKnotsToMiles = function(rawValue) {
    var feet = rawValue * 6076.12;
    var miles = feet / 5280;
    return miles.toFixed(2);
}

module.exports = new Wind();
