var fs = require("fs");
var moment = require("moment");
var _ = require("underscore");
var path = require("path");
var glob = require("glob");
var naturalSort = require("node-natural-sort");


module.exports = Logger;


function Logger() {
    var self = this;
    self.logStyle = "[ {$date} {$time} ] : {$log}";
    self.dateFormat = "DD/MM/YYYY";
    self.timeFormat = "HH:mm:ss";
    self.logPath = "./logs/";
    self.maxLogSize = 512000; // max 500 kb for each log file

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


Logger.prototype.connect = function () {
    var self = this;

    return socketMiddleware;

    function socketMiddleware(socket, next) {
        socket.on("log", function (data) {
            self.doLog(data.message);
        });

        socket.on("getTodayLog", function () {
            socket.emit("todayLog", {
                log: self.getTodaysLog()
            });
        });

        next();
    }
};

Logger.prototype.doLog = function (message) {
    var self = this;
    var logMessage = self.parseLogMessage(message).concat("\r\n");
    var today = moment().format("DD_MM_YYYY");
    var todayFiles;
    var newFileName;
    var newContent;

    if (!fs.existsSync(self.logPath)) {
        fs.mkdirSync(self.logPath);
    }

    todayFiles = glob.sync(path.join(self.logPath, today + "*")).sort(naturalSort());

    if (todayFiles.length) {
        var todayFile = (todayFiles.length > 1) ? todayFiles[todayFiles.length - 2] : todayFiles[0];
        var fileContent = fs.readFileSync(todayFile);
        var fileSizeAfter = Buffer.byteLength((fileContent + logMessage));

        if (fileSizeAfter > self.maxLogSize) {
            newFileName = path.join(self.logPath, (today + "-" + todayFiles.length + ".log"));
            newContent = logMessage;

        } else {
            newFileName = todayFile;
            newContent = (fileContent + logMessage);
        }

    } else {
        newFileName = path.join(self.logPath, today + ".log");
        newContent = logMessage;
    }

    fs.writeFileSync(newFileName, newContent);
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


Logger.prototype.getTodaysLog = function () {
    var self = this;
    var today = moment().format("DD_MM_YYYY");
    var todayFiles;


    if (!fs.existsSync(self.logPath)) {
        return;
    }

    todayFiles = glob.sync(path.join(self.logPath, today + "*")).sort(naturalSort());

    var filesContent = [];


    if (todayFiles.length) {

        //moving last file to first as it is the first actually
        var lastFile = todayFiles.pop();
        todayFiles.unshift(lastFile);


        todayFiles.forEach(function (file) {
            filesContent.push(fs.readFileSync(file, "utf-8"));
        });

    }

    return filesContent;
};