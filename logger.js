const winston = require("winston");

var logger  = winston.createLogger({
  transports: [
    new (winston.transports.Console)({ timestamp: true, colorize: true }),
    new (winston.transports.File)({ filename: "log/application.log", timestamp: true })
  ]
});

module.exports = logger;