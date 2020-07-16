const config = require("../config.js");

module.exports.camelcased = (str) => {
  let arr = str.split("-");
  let capital = arr.map((item, index) =>
    index ? item.charAt(0).toUpperCase() + item.slice(1).toLowerCase() : item
  );
  return capital.join("");
};

module.exports.capitalize = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

module.exports.log = (...params) => {
  if (config.DEBUG) console.log(params);
};

module.exports.AWS = {
  APIGATEWAY: {
    DOMAIN_NAME: "AWS::ApiGateway::DomainName",
  },
  ROUTE53: {
    RECORD_SET_GROUP: "AWS::Route53::RecordSetGroup",
  },
};
