const lib = require("./shared.js");
const project = require("./Project.js");
const loadYamlFile = require("./load-yaml.js").loadYamlFile;

module.exports = class Api {
  constructor(apiName, projectName, dependsOn = []) {
    this.name = apiName;
    this.project = projectName;
    this.dependsOn = dependsOn;
    this.stage = "dev";
  }

  get nameUppercased() {
    let name = lib.camelcased(this.name);
    name = lib.capitalize(name);
    return name;
  }

  projectNameUppercased() {
    let name = lib.camelcased(this.project);
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  oApiSpecFilePath() {
    return loadYamlFile(this.project, this.name);
  }

  get apiGatewayRestApiLogName() {
    return (
      this.projectNameUppercased() + this.nameUppercased + "ApiGatewayRestApi"
    );
  }

  apiGatewayDeploymentLogName() {
    return (
      this.projectNameUppercased() +
      this.nameUppercased +
      "ApiGatewayDeployment"
    );
  }

  apiGatewayStageLogName() {
    return (
      this.projectNameUppercased() + this.nameUppercased + "ApiGatewayStage"
    );
  }

  apiGatewayBasePathMappingLogName() {
    return (
      this.projectNameUppercased() +
      this.nameUppercased +
      "apiGatewayBasePathMapping"
    );
  }

  lambdaPermissionToRestApiLogName() {
    return (
      this.projectNameUppercased() +
      this.nameUppercased +
      "LambdaPermissionToRestApi"
    );
  }

  getLambdaPermission(handlerLogName) {
    return {
      [this.lambdaPermissionToRestApiLogName()]: {
        Type: "AWS::Lambda::Permission",
        DependsOn: [handlerLogName, this.apiGatewayRestApiLogName],
        Properties: {
          Action: "lambda:InvokeFunction",
          FunctionName: { "Fn::GetAtt": [handlerLogName, "Arn"] },
          Principal: "apigateway.amazonaws.com",
          SourceAccount: { Ref: "AWS::AccountId" },
          SourceArn: {
            "Fn::Join": [
              "",
              [
                "arn:aws:execute-api:",
                { Ref: "AWS::Region" },
                ":",
                { Ref: "AWS::AccountId" },
                ":",
                { Ref: this.apiGatewayRestApiLogName },
                "/*",
              ],
            ],
          },
        },
      },
    };
  }

  getResources() {
    return {
      [this.apiGatewayRestApiLogName]: {
        Type: "AWS::ApiGateway::RestApi",
        DependsOn: this.dependsOn,
        Properties: {
          Name: this.apiGatewayRestApiLogName,
          Description: `📦 𝗣𝗥𝗢𝗝𝗘𝗖𝗧: ${this.projectNameUppercased()}⠀⠀🧩𝗔𝗣𝗜: ${
            this.nameUppercased
          }`,
          EndpointConfiguration: {
            Types: ["REGIONAL"],
          },
          Body: this.oApiSpecFilePath(),
        },
      },

      [this.apiGatewayDeploymentLogName()]: {
        Type: "AWS::ApiGateway::Deployment",
        DependsOn: this.apiGatewayRestApiLogName,
        Properties: {
          Description: "Lambda API Deployment",
          RestApiId: { Ref: this.apiGatewayRestApiLogName },
        },
      },

      [this.apiGatewayStageLogName()]: {
        Type: "AWS::ApiGateway::Stage",
        DependsOn: this.apiGatewayDeploymentLogName(),
        Properties: {
          DeploymentId: { Ref: this.apiGatewayDeploymentLogName() },
          Description: "Lambda API Stage v0",
          RestApiId: { Ref: this.apiGatewayRestApiLogName },
          StageName: this.stage,
          MethodSettings: [
            {
              DataTraceEnabled: true,
              HttpMethod: "*",
              LoggingLevel: "INFO",
              ResourcePath: "/*",
            },
          ],
        },
      },

      [this.apiGatewayBasePathMappingLogName()]: {
        Type: "AWS::ApiGateway::BasePathMapping",
        DependsOn: [
          this.apiGatewayStageLogName(),
          this.apiGatewayRestApiLogName,
        ],
        Properties: {
          BasePath: this.name,
          DomainName: project.domainName(this.project),
          RestApiId: { Ref: this.apiGatewayRestApiLogName },
          Stage: this.stage,
        },
      },
    };
  }
};
