var express = require('express');
var http = require('http');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var memoryStore = session.MemoryStore;
var store = new memoryStore();
var db = require('./libs/database');
var nconf = require('nconf');

nconf.env().argv();
nconf.file('./config.json');

var routes = require('./routes');
var api = require('./routes/api');
var simulate = require('./routes/simulate');

var app = express();

app.set('store', store);

app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser(nconf.get('SESSION_SECRET')));
app.use(session({
  store: store,
  secret: nconf.get('SESSION_SECRET'),
  saveUninitialized: true,
  resave: true
}));
app.use(express.static(path.join(__dirname, 'public')));


if (app.get('env') !== 'development') {
  app.all('*', routes.force_https);
} else {
  app.all('*', routes.check_dev_token);
}


app.get('/', routes.index);
app.get('/logs/', routes.logs);
app.get('/logs/api/', api.logs);

app.post('/simulate/api/', simulate.simulate);

app.get('/authorize/', routes.authorize);
app.get('/logout/', routes.logout);
app.get('/redirect/', routes.redirect);


app.post('/webhook/', function(req, res) {
  var wss = app.get('wss');
  console.log('>>>>>>> Incoming Webhook: ' + JSON.stringify(req.body));
  if(req.body) {
    wss.sendEvent(req.body);
    db.saveLog(req.body);
    res.json({success: true});
  }
});


function sendEvent(event) {
  var wss = app.get('wss');
  wss.sendEvent(event);
}


// error handlers

// catch 404 errors
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  res.status(404);
  if(req.xhr) {
    res.send({
      message: err.message,
      error: {}
    });
  } else {
    res.render('error', {
      message: err.message,
      description: 'Page not found',
      error: {}
    });
  }
});

// catch 401 Unauthorized errors
app.use(function(err, req, res, next) {
  if(err.status !== 401) return next(err);
  res.status(401);
  if(req.xhr) {
    res.send({
      message: err.message,
      error: err
    });
  } else {
    res.render('error', {
      message: err.message,
      description: 'You need to log in to see this page.',
      error: err
    });
  }
});


// log all other errors
app.use(function(err, req, res, next) {
  console.error(err.stack);
  next(err);
});

// development 500 error handler
// will print stacktrace
if(app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(500);
    if(req.xhr) {
      res.send({
        message: err.message,
        error: err
      });
    } else {
      res.render('error', {
        message: err.message,
        error: err
      });
    }
  });
}


// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(500);
  if(req.xhr) {
    res.send({
      message: err.message,
      error: {}
    });
  } else {
    res.render('error', {
      message: err.message,
      description: 'Server error',
      error: {}
    });
  }
});


module.exports = app;
