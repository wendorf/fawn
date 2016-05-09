var axios = require('axios');

var update = function() {
  axios.get('api/v1/checks?checkfile=https://raw.githubusercontent.com/cloudfoundry/capi-checkman/master/pipeline').then(function(response) {
    var checks = document.getElementById("checks");
    checks.innerHTML = '';
    response.data.sort(function(a,b) {
      return a.result - b.result;
    }).map(function(check) {
      var checkNode = document.createElement("p");
      checkNode.className = "check " + check.status;
      checkNode.innerHTML = check.job;
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
