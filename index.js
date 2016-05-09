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
      return new Promise(function(resolve, reject) {
        execFile(scriptsDir + "/" + check.script, check.args, systemRubyEnv, function(error, stdout, stderr) {
          resolve(JSON.parse(stdout));
        });
      });
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

app.listen(3000, function() {
  console.log('Example app listening on port 3000!');
});
