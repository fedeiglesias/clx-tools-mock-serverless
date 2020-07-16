const config = require("../config.js");

const API_GATEWAY_LAMBDA_ROLE_LOGICAL_NAME = "clxMockServerlessRole";
const API_GATEWAY_LAMBDA_POLICIES_LOGICAL_NAME = "clxMockServerlesssPolicy";

const getRoles = () => {
  return {
    [API_GATEWAY_LAMBDA_ROLE_LOGICAL_NAME]: {
      Type: "AWS::IAM::Role",
      Properties: {
        RoleName: {
          "Fn::Join": [
            "-",
            [
              { Ref: "AWS::Region" },
              { Ref: "AWS::StackName" },
              "apigateway_lambda_role",
            ],
          ],
        },
        AssumeRolePolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: ["apigateway.amazonaws.com"],
              },
              Action: "sts:AssumeRole",
            },
          ],
        },
        Path: "/",
      },
    },
  };
};

const getPolicies = () => {
  return {
    [API_GATEWAY_LAMBDA_POLICIES_LOGICAL_NAME]: {
      Type: "AWS::IAM::Policy",
      DependsOn: [API_GATEWAY_LAMBDA_ROLE_LOGICAL_NAME],
      Properties: {
        PolicyName: {
          "Fn::Join": [
            "-",
            [
              { Ref: "AWS::Region" },
              { Ref: "AWS::StackName" },
              "apigateway_lambda_policy",
            ],
          ],
        },
        PolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: "lambda:InvokeFunction",
              Resource: "*",
            },
          ],
        },
        Roles: [{ Ref: API_GATEWAY_LAMBDA_ROLE_LOGICAL_NAME }],
      },
    },
  };
};

const getResources = () => {
  let resources = {
    ...getRoles(),
    ...getPolicies(),
  };

  return resources;
};

module.exports = {
  getResources,
  API_GATEWAY_LAMBDA_POLICIES_LOGICAL_NAME,
  API_GATEWAY_LAMBDA_ROLE_LOGICAL_NAME,
};
