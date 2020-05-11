appModels = require('./appModels');
const { v4: uuidv4 } = require('uuid');
const crypto = require("crypto");
const axios = require("axios");
const convert = require('xml-js');
const Logger = require("./logger.js");
const proxy = require('http-proxy-middleware')

var meetingModel = appModels.meeting;
var clusterModel = appModels.cluster;


exports.listMeeting = function (req, res) {
    Logger.info("Meetingservice --listMeeting " + req.params.meetingID);
    meetingModel.find({ meetingID: req.params.meetingID }, function (err, meeting) {
        if (err)
            return res.status(400).json({
                status: "error",
                message: err,
            });

        res.status(200).json({
            status: 'sucess',
            data: meeting
        });
    });
};

exports.createMeeting = function (req, res) {
    Logger.info("createMeetingservice --createMeeting = " + JSON.stringify(req.body));
    let reqObj = req.body;
    const meetingObj = new meetingModel();
    meetingObj.meetingID = uuidv4();
    meetingObj.moderatorPW = crypto.randomBytes(16).toString("hex").substring(0, 12);
    meetingObj.attendeePW = crypto.randomBytes(16).toString("hex").substring(0, 12);
    meetingObj.meetingName = reqObj.meetingName;
    meetingObj.welcomeMessage = reqObj.welcomeMsg;
    meetingObj.createrUserID = reqObj.userID;
    meetingObj.scheduledTime = reqObj.meetingTime;
    if (typeof reqObj.duration !== 'undefined' || reqObj.duration) {
        meetingObj.duration = reqObj.duration;
    }

    if (typeof reqObj.attendeeCount !== 'undefined' || reqObj.attendeeCount) {
        meetingObj.requestedCount = reqObj.attendeeCount;
    }

    meetingObj.save((saveErr) => {
        if (saveErr) {
            return res.status(400).json({
                status: "error",
                message: saveErr.message,
            });
        }
        return res.status(200).json({
            status: 'sucess',
            data: meetingObj
        });
    });
}

exports.startMeeting = async function (req, res) {
    Logger.info("Meetingservice --startMeeting = " + JSON.stringify(req.params));
    function getBBBNode() {
        return clusterModel
            .findOne({})
            .sort('currentUserCount')
            .exec();
    }
    function getBBBNodewithDomain(domain) {
        return clusterModel
            .findOne({ bbbAccountDomain: domain })
            .exec();
    }

    function getMeeting() {
        return meetingModel.findOne({ meetingID: req.params.meetingID })
            .exec();
    }

    try {
        let meeting = await getMeeting();
        if (null !== meeting && meeting.meetingStatus === 'requested' && meeting.moderatorPW === req.params.accessCode) {
            let node = await getBBBNode();
            let secret = node.domainSecret;
            let bbbUrl = node.bbbAccountDomain;
            let meetingID = meeting.meetingID
            let modCode = meeting.moderatorPW
            let attCode = meeting.attendeePW
            let meetingName = meeting.meetingName
            let welcomeMsg = meeting.welcomeMessage
            let urlQueryString = "name=" + meetingName + "&meetingID=" + meetingID + "&attendeePW=" + attCode + "&moderatorPW=" + modCode + "&welcome=" + welcomeMsg + "&record=true&muteOnStart=true&allowModsToUnmuteUsers=true";

            urlQueryString = encodeURI(urlQueryString);
            let checkSumRAW = "create" + urlQueryString + secret;
            let checkSUM = crypto.createHash("sha1").update(checkSumRAW, "binary").digest("hex");
            
            urlQueryString = urlQueryString + "&checksum=" + checkSUM;
            let createMeetingUrl = bbbUrl + "api/create?" + urlQueryString;
            
            const response = await axios.get(createMeetingUrl);
            let jsonResponse = JSON.parse(convert.xml2json(response.data, { compact: true }));
            

            meeting.internalMeetingID = jsonResponse.response.internalMeetingID._text;
            meeting.createTime = jsonResponse.response.createTime._text;
            meeting.returncode = "success";
            meeting.meetingStatus = 'started';
            meeting.bbbBackedEnd = bbbUrl;
            meeting.save();

            let joinQueryString = "meetingID=" + meetingID + "&password=" + modCode + "&fullName=" + req.params.name + "&userID=" + req.params.userId + "&joinViaHtml5=true";
            joinQueryString = encodeURI(joinQueryString);
            checkSumRAW = "join" + joinQueryString + secret;
            checkSUM = crypto.createHash("sha1").update(checkSumRAW, "binary").digest("hex");
            
            joinQueryString = joinQueryString + "&checksum=" + checkSUM;
            joinUrl = bbbUrl + "api/join?" + joinQueryString;

            res.status(200).json({
                status: 'sucess',
                joinForwordURL: joinUrl,
                data: meeting
            });
        } else if (null !== meeting && meeting.meetingStatus === 'started' && meeting.moderatorPW === req.params.accessCode) {
            let bbbUrl = meeting.bbbBackedEnd;
            let node = await getBBBNodewithDomain(bbbUrl);
            let secret = node.domainSecret;
            let meetingID = meeting.meetingID
            let modCode = meeting.moderatorPW

            let joinQueryString = "meetingID=" + meetingID + "&password=" + modCode + "&fullName=" + req.params.name + "&userID=" + req.params.userId + "&joinViaHtml5=true";
            joinQueryString = encodeURI(joinQueryString);
            let checkSumRAW = "join" + joinQueryString + secret;
            let checkSUM = crypto.createHash("sha1").update(checkSumRAW, "binary").digest("hex");
            
            joinQueryString = joinQueryString + "&checksum=" + checkSUM;
            joinUrl = bbbUrl + "api/join?" + joinQueryString;

            let getMeeting = "meetingID=" + req.params.meetingID;
            checkSumRAW = "getMeetingInfo" + getMeeting + secret;
            checkSUM = crypto.createHash("sha1").update(checkSumRAW, "binary").digest("hex");
            getMeeting = getMeeting + "&checksum=" + checkSUM;
            getMeetingUrl = bbbUrl + "api/getMeetingInfo?" + getMeeting;
            const response = await axios.get(getMeetingUrl);
            
            let respData = " " + response.data;
            if (respData.includes('SUCCESS')) {
                res.status(200).json({
                    status: 'sucess',
                    joinForwordURL: joinUrl,
                    data: meeting
                });
            } else {
                res.status(400).json({
                    status: "error",
                    message: 'Provided Meeting has been Ended '
                });
            }

        } else {
            res.status(400).json({
                status: "error",
                message: 'No Meeting Found for provided meeting ID or Invalid Moderator Acess Code'
            });
        }

    } catch (error) {
        Logger.info(error);
        res.status(400).json({
            status: "error",
            message: error.message
        });
    }

};

exports.joinMeeting = async function (req, res) {
    Logger.info("Meetingservice --joinMeeting = " + JSON.stringify(req.params));
    function getBBBNodewithDomain(domain) {
        return clusterModel
            .findOne({ bbbAccountDomain: domain })
            .exec();
    }

    function getMeeting() {
        return meetingModel.findOne({ meetingID: req.params.meetingID })
            .exec();
    }

    try {
        let meeting = await getMeeting();
        if (null !== meeting && meeting.meetingStatus === 'started' && meeting.attendeePW === req.params.accessCode) {
            let bbbUrl = meeting.bbbBackedEnd;
            let node = await getBBBNodewithDomain(bbbUrl);
            let secret = node.domainSecret;
            let joinQueryString = "meetingID=" + req.params.meetingID + "&password=" + req.params.accessCode + "&fullName=" + req.params.name + "&userID=" + req.params.userId + "&joinViaHtml5=true";
            joinQueryString = encodeURI(joinQueryString);
            let checkSumRAW = "join" + joinQueryString + secret;
            let checkSUM = crypto.createHash("sha1").update(checkSumRAW, "binary").digest("hex");
            joinQueryString = joinQueryString + "&checksum=" + checkSUM;
            joinUrl = bbbUrl + "api/join?" + joinQueryString;


            let getMeeting = "meetingID=" + req.params.meetingID;
            checkSumRAW = "getMeetingInfo" + getMeeting + secret;
            checkSUM = crypto.createHash("sha1").update(checkSumRAW, "binary").digest("hex");
            getMeeting = getMeeting + "&checksum=" + checkSUM;
            getMeetingUrl = bbbUrl + "api/getMeetingInfo?" + getMeeting;
            const response = await axios.get(getMeetingUrl);
            let respData = " " + response.data;
            if (respData.includes('SUCCESS')) {
                res.status(200).json({
                    status: 'sucess',
                    joinForwordURL: joinUrl,
                    data: meeting
                });
            } else {
                res.status(400).json({
                    status: "error",
                    message: 'Provided Meeting has been Ended '
                });
            }

        } else {
            res.status(400).json({
                status: "error",
                message: 'No Meeting Found for provided meeting ID or Invalid Acess Code or Meeting is Not yet Started'
            });
        }

    } catch (error) {
        Logger.info(error);
        res.status(400).json({
            status: "error",
            message: error.message
        });
    }

};