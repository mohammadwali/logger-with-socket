var fs = require("fs");
var moment = require("moment");
var _ = require("underscore");


module.exports = Logger;


function Logger() {
    var self = this;
    self.logStyle = "[ {$date} {$time} ] : {$log}";
    self.dateFormat = "DD/MM/YYYY";
    self.timeFormat = "HH:mm:ss";
    self.logPath = "/logs/";
    self.maxLogSize = 3000; //TODO: in bits

    self.logStringOptions = [{
        match: "date",
        value: function () {
            return moment().format(self.dateFormat);
        }
    }, {
        match: "time",
        value: function () {
            return moment().format(self.timeFormat);
        }
    }];
}

Logger.prototype.doLog = function (message) {
    var self = this;

    console.log("from log", self.parseLogMessage(message));
};


Logger.prototype.connect = function () {
    var self = this;

    return socketMiddleware;

    function socketMiddleware(socket, next) {
        socket.on("log", function (data) {
            self.doLog(data.message);
        });
        next();
    }
};


Logger.prototype.parseLogMessage = function (message) {
    var self = this;
    var parsed = self.logStyle;
    var regex = /{(.*?)}/g;
    var matches;


    while ((matches = regex.exec(self.logStyle)) !== null) {

        var currentMatch = matches[1].replace("$", "");

        // This is necessary to avoid infinite loops with zero-width matches
        if (matches.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        if (currentMatch === "log") {
            parsed = parsed.replace(matches[0], message);
        }

        var option = _.find(self.logStringOptions, {match: currentMatch});

        if (option) {
            if (_.isFunction(option.value)) {
                parsed = parsed.replace(matches[0], option.value());
            } else if (_.isString(option.value) || _.isNumber(option.value)) {
                parsed = parsed.replace(matches[0], option.value);
            }
        }
    }

    return parsed;

};