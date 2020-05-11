const Logger = require("./logger.js");
const axios = require("axios");
const crypto = require("crypto");

appModels = require('./appModels');
var clusterModel = appModels.cluster;
var meetingModel = appModels.meeting;


exports.callBackhandler = function (req, res) {
    // Logger.info("callBackService --callBackhandler = " + JSON.stringify(req.body));
    let eventData = req.body.event;
    let jsonResponse = JSON.parse(eventData);
    let eventName = jsonResponse.core.header.name;
    let meetingID = jsonResponse.core.body.meetingId;
    if (eventName === 'MeetingDestroyedEvtMsg' || eventName === 'publish_ended') {
        meetingModel.findOne({ internalMeetingID: meetingID }, function (err, meeting) {
            if (err || null === meeting) {
                Logger.info("callBackService --callBackhandler = failed to query  or meeting not found");
                return res.status(200).json({});
            }
            if (eventName === 'MeetingDestroyedEvtMsg') {
                meeting.meetingStatus = 'ended';
            } else {
                meeting.meetingStatus = 'published';
            }
            meeting.save(function (err) {
                if (err)
                    Logger.info("callBackService --callBackhandler = failed to Update " + err.message);
                res.status(200).json({});
            });
        });
    } else {
        res.status(200).json({});
    }


};

exports.registerCallBackHandler = function (req, res) {
    Logger.info("callBackService --registerCallBackHandler");
    clusterModel.find(function (err, cluster) {
        if (err)
           return  res.status(400).json({
                status: "error",
                message: err.message,
            });


        try {
            Logger.info("callBackService --registerCallBackHandler  --cluster = " + JSON.stringify(cluster));
            cluster.forEach(node => {
                let secret = node.domainSecret;
                let bbbUrl = node.bbbAccountDomain;
                Logger.info(JSON.stringify(node));
                let urlQueryString = "callbackURL=" + process.env.CALLBACK_URL + "getRaw=true";
                urlQueryString = encodeURI(urlQueryString);
                let checkSumRAW = "hooks/create" + urlQueryString + secret;
                let checkSUM = crypto.createHash("sha1").update(checkSumRAW, "binary").digest("hex");
                Logger.info("checkSUM = " + checkSUM);
                urlQueryString = urlQueryString + "&checksum=" + checkSUM;
                let createWebHookUrl = bbbUrl + "api/hooks/create?" + urlQueryString;
                Logger.info("bbbUrl = " + createWebHookUrl);
                axios.get(createWebHookUrl).then(resp => {
                    Logger.info(resp.data);
                });
            });

            res.status(200).json({
                status: 'sucess',
                data: "callback  handler  registered  sucessfully  with backend cluster"
            });

        } catch (error) {
            Logger.info(error);
            res.status(400).json({
                status: "error",
                message: error.message
            });
        }
    });
};
