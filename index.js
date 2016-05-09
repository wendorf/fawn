var express = require('express');
var app = express();
var defaultCheckscript = 'https://raw.githubusercontent.com/cloudfoundry/capi-checkman/master/travis';

function getFile(url, cb) {
  var https = require('https');
  var fs = require('fs');

  var body = "";
  https.get(url, function(res) {
    res.on('data', function(chunk) {
      body = body.concat(chunk);
    });

    res.on('end', function() {
      cb(body);
    });
  });
}

var checkCache = {};
var checkKey = function(check) {
  return JSON.stringify({
    script: check.script,
    args: check.args
  });
};

var fetchFromCache = function(check) {
  return checkCache[checkKey(check)];
}

var addToCache = function(check, promise) {
  checkCache[checkKey(check)] = {
    time: new Date(),
    promise: promise
  };
}

function getResults(checkscript, cb) {
  var scriptsDir = 'vendor/checkman/scripts';
  var systemRubyEnv = {env: {'RUBY_ROOT': ''}};
  var execFile = require('child_process').execFile;

  getFile(checkscript, function(content) {
    var checks = content.trim().split('\n').filter(function(check) {
      return !check.startsWith("#");
    }).map(function(check) {
      pieces = /^([^:]+):\s*([^\s]+)\s+(.*)$/.exec(check);
      return {
        name: pieces[1],
        script: pieces[2],
        args: pieces[3].split(/\s+/)
      }
    }).map(function(check) {
      var cache = fetchFromCache(check);
      var date = new Date();
      date.setSeconds(date.getSeconds() - 30);
      if (cache && cache.time > date) {
        return cache.promise;
      }

      var promise = new Promise(function(resolve, reject) {
        execFile(scriptsDir + "/" + check.script, check.args, systemRubyEnv, function(error, stdout, stderr) {
          var data = JSON.parse(stdout);
          data.info.forEach(function(i) {
            data[i[0].toLowerCase()] = i[1];
          });
          delete data['info'];
          resolve(data);
        });
      });

      addToCache(check, promise);

      return promise;
    });
    Promise.all(checks).then(function(checks) {
      cb(checks);
    })
  });
}

app.get('/api/v1/checks', function(req, res){
  checkfile = req.query.checkfile;
  getResults(checkfile, function(content) {
    res.send(content);
  });
});

app.use(express.static('public'));

app.listen(process.env.PORT || 3000, function() {
  console.log('Example app listening on port 3000!');
});
