var monk = monk = require('monk');
var db = monk(process.env.MONGOLAB_URI || 'mongodb://127.0.0.1:27017/automaticator');
var webhook_logs = db.get('automaticator');

exports.getLogs = function(user_id, cb) {
  webhook_logs.find({user: {id: user_id} }, cb);
}

exports.saveLog = function(body) {
  webhook_logs.insert(body);
}