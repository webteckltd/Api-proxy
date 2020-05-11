const validator = require('./validate');

const validateCreateMeeting = (req, res, next) => {
    const validationRule = {
        "meetingName": "required|string",
        "userID": "required|string",
        "welcomeMsg": "required|string",
        "meetingTime": "required|integer"
    }
    validator(req.body, validationRule, {}, (err, status) => {
        if (!status) {
            res.status(400).json({
                status: "error",
                message: "Bad Request data .. data validation failed "
            });
        } else {
            next();
        }
    });
}


module.exports = { 
    validateCreateMeeting
}