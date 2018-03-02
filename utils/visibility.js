var Visibility = function () {};

Visibility.prototype.convertStatuteMiles = function(rawValue) {
    var visibility = rawValue.replace("SM", "");    
    visibility = eval(visibility);
    return visibility;
}

module.exports = new Visibility();
