let express = require('express');
let app = express();
let apiRoutes = require("./api-routes");
let bodyParser = require('body-parser');
let mongoose = require('mongoose');
const Logger = require("./logger.js");
let scrapper = require("./meetingScrapper.js");
const cron = require("node-cron");

require('dotenv').config();

var port = process.env.APP_PORT || 8080;

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });

var db = mongoose.connection;
if (!db) {
     Logger.info("Error connecting db");
     process.exit();
}
else
     Logger.info("Db connected successfully")

app.use('/api', apiRoutes);

cron.schedule("* * * * *", function() {
    console.log("running a task every minute");
    scrapper.scrapper();
  });

app.use((req, res, next) => {
     res.status(400).json({
         status: "error",
         message: "requested route doesn't exist"
     });
 });
 
 app.use((err, req, res, next) => {
     Logger.info("Reached API Proxy Generic Error Handler ");
         return  res.status(500).json({
             status: "error",
             message: err
         });
 });

 process.on('uncaughtException', err => {
     console.error('There was an uncaught error', err)
     process.exit(1) 
})

app.listen(port, function () {
     Logger.info("Running API Proxy on port " + port);
});