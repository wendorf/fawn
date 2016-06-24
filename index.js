var express = require('express');
var app = express();
var defaultCheckscript = 'https://raw.githubusercontent.com/cloudfoundry/capi-checkman/master/travis';

function getFile(url) {
  var https = require('https');
  var fs = require('fs');

  var body = "";
  return new Promise(function(resolve, reject) {
    https.get(url, function(res) {
      res.on('data', function(chunk) {
        body = body.concat(chunk);
      });

      res.on('end', function() {
        resolve(body);
      });
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

function getCheckfile(checkscript) {
  var scriptsDir = 'vendor/checkman/scripts';
  var scriptsExecOptions = {env: {'RUBY_ROOT': ''}, maxBuffer: 1024576};
  var execFile = require('child_process').execFile;

  return getFile(checkscript).then(function(content) {
    var checks = content.trim().split('\n').filter(function(check) {
      return !check.startsWith("#") && !check.match(/^\s*$/);
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
        execFile(scriptsDir + "/" + check.script, check.args, scriptsExecOptions, function(error, stdout, stderr) {
          try {
            var data = JSON.parse(stdout);
          } catch(e) {
            resolve({name: check.name, result: false, checkBroken: true});
            return;
          }

          data.info.forEach(function(i) {
            data[i[0].toLowerCase()] = i[1];
          });
          delete data['info'];
          data.name = check.name
          resolve(data);
        });
      });

      addToCache(check, promise);

      return promise;
    });
    return Promise.all(checks);
  });
}

function getCheckfiles(checkfiles) {
  return Promise.all(checkfiles.map(getCheckfile)).then(function(checkfiles) {
    return checkfiles.reduce(function(a, b) {
      return a.concat(b);
    });
  });
}

app.get('/api/v1/checks', function(req, res){
  checkfiles = req.query.checkfile;
  if (!Array.isArray(checkfiles)) {
    checkfiles = [checkfiles];
  }
  getCheckfiles(checkfiles).then(function(content) {
    res.send(content);
  });
});

app.use(express.static('public'));

app.listen(process.env.PORT || 3000, function() {
  console.log('Example app listening on port 3000!');
});
