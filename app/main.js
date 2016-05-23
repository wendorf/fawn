var axios = require('axios');
var url = require('url');

var checkRequestParam = function(checks) {
  return checks.map(function(check) {
    return 'checkfile[]=' + check;
  }).join('&');
}
var update = function() {
  var defaultChecks = [
    'https://raw.githubusercontent.com/cloudfoundry/capi-checkman/master/pipeline',
    'https://raw.githubusercontent.com/cloudfoundry/capi-checkman/master/travis'
  ]
  var checks = url.parse(window.location.href, true).query['checks[]'] || defaultChecks;
  if (!(checks instanceof Array)) {
    checks = [checks];
  }
  axios.get('api/v1/checks?' + checkRequestParam(checks)).then(function(response) {
    var checks = document.getElementById("checks");
    checks.innerHTML = '';
    response.data.sort(function(a,b) {
      return a.result - b.result;
    }).map(function(check) {
      var checkNode = document.createElement("p");
      checkNode.className = "check " + (check.checkBroken ? 'broken' : check.result ? 'succeeded' : 'failed');
      checkNode.innerHTML = check.name;
      return checkNode;
    }).forEach(function(checkNode) {
      checks.appendChild(checkNode);
    });
  }).catch(function(e) {
    console.log('error refreshing status', e);
  }).then(function() {
    setTimeout(update, 30000);
  });
};

update();
