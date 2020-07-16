const config = require("../config.js");
const lib = require("./shared.js");
const api = require("./Api.js");
const fs = require("fs");
const { promisify } = require("util");

class Project {
  constructor(name) {
    this.name = name;
    this.dependsOn = [config.ENDPOINT_HANDLER_LOGICAL_NAME];
    this.apis = [];
  }

  async init() {
    this.apis = await this.getApiResources();
  }

  get nameUppercase() {
    return lib.capitalize(this.name);
  }

  logName(type) {
    type = type.replace("AWS::", "");
    type = type.replace("::", "-");
    type = lib.camelcased(type);
    return lib.camelcased(this.nameUppercase) + type;
  }

  getDomainName() {
    return config.CUSTOM_DOMAIN_PREFIX + this.name + "." + config.MAIN_DOMAIN;
  }

  getRestApisLambdaPermissions() {
    let resources = {};
    this.apis.forEach((api) => {
      resources = {
        ...resources,
        ...api.getLambdaPermission(config.ENDPOINT_HANDLER_LOGICAL_NAME),
      };
    });
    return resources;
  }

  apiGatewayDomain() {
    return {
      [this.logName(lib.AWS.APIGATEWAY.DOMAIN_NAME)]: {
        Type: lib.AWS.APIGATEWAY.DOMAIN_NAME,
        DependsOn: this.dependsOn,
        Properties: {
          CertificateArn: config.WILDCARD_CERTIFICATE,
          DomainName: domainName(this.name),
        },
      },
    };
  }

  route53RecordSetGroup() {
    return {
      [this.logName(lib.AWS.ROUTE53.RECORD_SET_GROUP)]: {
        Type: lib.AWS.ROUTE53.RECORD_SET_GROUP,
        DependsOn: [this.logName(lib.AWS.APIGATEWAY.DOMAIN_NAME)],
        Properties: {
          Comment: "Creating recordset for " + this.nameUppercase + " project",
          HostedZoneName: config.MAIN_DOMAIN + ".",
          RecordSets: [
            {
              Name: domainName(this.name),
              Type: "A",
              AliasTarget: {
                DNSName: {
                  "Fn::GetAtt": [
                    this.logName(lib.AWS.APIGATEWAY.DOMAIN_NAME),
                    "DistributionDomainName",
                  ],
                },
                EvaluateTargetHealth: false,
                HostedZoneId: {
                  "Fn::GetAtt": [
                    this.logName(lib.AWS.APIGATEWAY.DOMAIN_NAME),
                    "DistributionHostedZoneId",
                  ],
                },
              },
            },
            {
              Name: domainName(this.name),
              Type: "AAAA",
              AliasTarget: {
                DNSName: {
                  "Fn::GetAtt": [
                    this.logName(lib.AWS.APIGATEWAY.DOMAIN_NAME),
                    "DistributionDomainName",
                  ],
                },
                EvaluateTargetHealth: false,
                HostedZoneId: {
                  "Fn::GetAtt": [
                    this.logName(lib.AWS.APIGATEWAY.DOMAIN_NAME),
                    "DistributionHostedZoneId",
                  ],
                },
              },
            },
          ],
        },
      },
    };
  }

  async getApiResources() {
    const readdir = promisify(require("fs").readdir);
    const projectDir = "./" + config.PROJECTS_DIR + "/" + this.name;
    const apisDir = projectDir + "/" + config.APIS_DIR;
    const files = await readdir(apisDir);

    let apis = [];

    if (!fs.existsSync(projectDir) || !fs.existsSync(apisDir)) {
      return apis;
    }

    files.forEach((file) => {
      const currFile = apisDir + "/" + file;
      const oapiSpecFile = currFile + "/" + config.OPENAPI_SPEC_FILE;
      if (fs.lstatSync(currFile).isDirectory() && fs.existsSync(oapiSpecFile)) {
        apis.push(
          new api(file, this.name, [
            this.logName(lib.AWS.APIGATEWAY.DOMAIN_NAME),
          ])
        );
      }
    });

    return apis;
  }

  getResources() {
    let resources = {
      ...this.apiGatewayDomain(),
      ...this.getRestApisLambdaPermissions(),
      ...this.route53RecordSetGroup(),
    };

    this.apis.forEach((api) => {
      resources = { ...resources, ...api.getResources() };
    });

    return resources;
  }
}

/**
 * Get Domain Name
 * @param projectName Project Name
 */
const domainName = (project) => {
  return config.CUSTOM_DOMAIN_PREFIX + project + "." + config.MAIN_DOMAIN;
};

module.exports.create = Project;
module.exports.domainName = domainName;
