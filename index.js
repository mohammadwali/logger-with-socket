var express = require("express");
var Logger = require("./lib/Logger");

var app = express();

var http = require("http").Server(app);

var logger = new Logger();

var port = process.env.PORT || 3000;

// Socket.io server listens to our app
var io = require("socket.io").listen(http);


app.get("/", function (req, res) {
    res.sendfile("client-demo/index.html");
});


http.listen(port, function () {
    console.log("listening on *:", port);
});


// Emit welcome message on connection
io.on("connection", function (socket) {
    console.log("Client connected", socket.id);
});

io.use(logger.connect());

