var mongoose = require('mongoose');


var meetingSchema = mongoose.Schema({
    "meetingID": String
    , "meetingName": String
    , "welcomeMessage": String
    , "scheduledTime": Number
    , "requestedCount": {type: Number, default:50}
    , "joinedCount":Number
    , "internalMeetingID": String
    , "attendeePW": String
    , "moderatorPW": String
    , "createTime": Number
    , "returncode": String
    , "isMeetingStarted": String
    , "duration":{
        type: Number,
        default:60
    }
    , "hasBeenForciblyEnded": String
    , "createrUserID": String
    , "createrName": String
    , "bbbBackedEnd": String
    , "meetingStatus": {
        type: String,
        enum: ['requested', 'created', 'started', 'ended', 'published'],
        default: 'requested'
    }
});


var clusterSchema = mongoose.Schema(
    {
        "bbbAccountDomain": {type: String, required:true}
        , "domainSecret": {type: String, required:true}
        , "currentMeetingCount": {type: Number, default:0}
        , "currentUserCount": {type: Number, default:0}
        , "availability": {
            type: String,
            enum: ['UP', 'DOWN'],
            default: 'UP'
        }
    }
);

const now = new Date()
const secondsSinceEpoch = Math.round(now.getTime() / 1000)

exports.meeting = mongoose.model('bbb_meetings', meetingSchema);
exports.cluster = mongoose.model('bbb_clusters', clusterSchema);