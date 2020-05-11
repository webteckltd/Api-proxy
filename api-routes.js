let router = require('express').Router();
const Logger = require("./logger.js");

const callBackService = require("./callBackService");
const meetingService = require('./meetingservice');
const validationMiddleware = require('./validationMiddleware');


router.get('/', function (req, res) {
    res.json({
        status: 'API Its Working',
        message: 'Welcome to RESTHub crafted with love!'
    });
});

router.route('/meetings/:meetingID')
    .get(meetingService.listMeeting)

router.route('/createMeeting')
    .post(validationMiddleware.validateCreateMeeting ,meetingService.createMeeting)    

router.route('/startMeeting/:meetingID/:userId/:accessCode/:name')
    .get(meetingService.startMeeting)

router.route('/joinMeeting/:meetingID/:userId/:accessCode/:name')
    .get(meetingService.joinMeeting)

router.route('/proxyCallback')
    .post(callBackService.callBackhandler)  
    
router.route('/registerCallback')
    .get(callBackService.registerCallBackHandler)        

router.use((req, res, next) => {
    res.status(400).json({
        status: "error",
        message: "requested route doesn't exist"
    });
});

router.use((err, req, res, next) => {
    Logger.info("Reached api-routes Generic Error Handler " + err.message);
        return  res.status(500).json({
            status: "error",
            message: err.message
        });
});

module.exports = router;