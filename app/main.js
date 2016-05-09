var axios = require('axios');

axios.get('api/v1/checks?checkfile=https://raw.githubusercontent.com/cloudfoundry/capi-checkman/master/pipeline').then(function(response) {
  response.data.sort(function(a,b) {
    return a.result - b.result;
  }).forEach(function(check) {
    var checkNode = document.createElement("p");
    checkNode.className = "check " + check.status;
    checkNode.innerHTML = check.job;
    document.getElementById("checks").appendChild(checkNode);
  });
});

