const Logger = require("./logger.js");
const axios = require("axios");
const crypto = require("crypto");
const convert = require('xml-js');

appModels = require('./appModels');
var clusterModel = appModels.cluster;

async function fetchNparseMeetings(bbbUrl, clusterNode) {
    let response = await axios.get(bbbUrl);
    let respData = " " + response.data;
   // Logger.info("meetingScrapper --fetchNparseMeetings -- respData = " + respData);
    if (respData.includes('SUCCESS')) {
        let jsonResponse = JSON.parse(convert.xml2json(response.data, { compact: true }));
       // Logger.info("meetingScrapper --fetchNparseMeetings = " + JSON.stringify(jsonResponse));
        let meetingsArray = jsonResponse.response.meetings.meeting;
        let participantCount = 0;
        let count = 0;
        if (null !== meetingsArray && typeof meetingsArray !== 'undefined' && meetingsArray.length > 0) {
            count = meetingsArray.length;
            meetingsArray.forEach(meeting => {
                let partCoubnt = meeting.participantCount._text;
                participantCount = participantCount + parseInt(partCoubnt);
            });
            clusterNode.currentMeetingCount = count;
            clusterNode.currentUserCount = participantCount;
            clusterNode.save(function (err) {
                if (err)
                    Logger.info("meetingScrapper --fetchNparseMeetings = failed to Update " + err.message);
            });

        }else{
            clusterNode.currentMeetingCount = 0;
            clusterNode.currentUserCount = 0;
            clusterNode.save(function (err) {
                if (err)
                    Logger.info("meetingScrapper --fetchNparseMeetings = failed to Update " + err.message);
            });

        }

    }
}


exports.scrapper = function () {
   // Logger.info("meetingScrapper --started ");
    clusterModel.find(function (err, cluster) {
        if (err) {
            Logger.info("meetingScrapper - error while loading BBB cluster ");
            return;
        }
        try {
            cluster.forEach(node => {
                let secret = node.domainSecret;
                let bbbUrl = node.bbbAccountDomain;

                let checkSumRAW = "getMeetings" + secret;
                let checkSUM = crypto.createHash("sha1").update(checkSumRAW, "binary").digest("hex");
                let urlQueryString = "checksum=" + checkSUM;
                let createWebHookUrl = bbbUrl + "api/getMeetings?" + urlQueryString;
               // Logger.info("bbbUrl = " + createWebHookUrl);
                fetchNparseMeetings(createWebHookUrl, node);
            });
        } catch (error) {
            Logger.info(error);
        }
    });

}