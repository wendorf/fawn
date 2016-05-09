var axios = require('axios');

axios.get('api/v1/checks?checkfile=https://raw.githubusercontent.com/cloudfoundry/capi-checkman/master/pipeline').then(function(response) {
  response.data.forEach(function(check) {
    check.info.forEach(function(i) {
      check[i[0].toLowerCase()] = i[1];
    });
    var checkNode = document.createElement("p");
    checkNode.className = "check " + check.status;
    checkNode.innerHTML = check.job;
    document.getElementById("checks").appendChild(checkNode);
  });
});

