const config = require("../config.js");
const iam = require("./IAM.js");
const yaml = require("js-yaml");
const fs = require("fs");
const methods = ["get", "post", "put", "patch", "delete"];

/**
 * Append AWS Lambda Integration
 * @param yamlSpec OpenApi Specification
 */
const appendAWSLambdaHandler = (yamlSpec) => {
  for (let path in yamlSpec.paths) {
    for (let method in yamlSpec.paths[path]) {
      if (methods.includes(method)) {
        yamlSpec.paths[path][method]["x-amazon-apigateway-integration"] = {
          uri: {
            "Fn::Join": [
              "",
              [
                "arn:aws:apigateway:",
                { Ref: "AWS::Region" },
                ":lambda:path/2015-03-31/functions/",
                { "Fn::GetAtt": [config.ENDPOINT_HANDLER_LOGICAL_NAME, "Arn"] },
                "/invocations",
              ],
            ],
          },
          credentials: {
            "Fn::GetAtt": [iam.API_GATEWAY_LAMBDA_ROLE_LOGICAL_NAME, "Arn"],
          },
          httpMethod: "POST",
          type: "aws_proxy",
          responses: {
            default: {
              statusCode: "200",
            },
          },
        };
      }
    }
  }
  return yamlSpec;
};

/**
 * Remove Nulls Values.
 * AWS throw errors with nulls.
 * @param yamlSpec OpenApi Specification
 */
const removeNulls = (yamlSpec) => {
  const isArray = Array.isArray(yamlSpec);
  const newYamlSpec = isArray ? [] : {};

  Object.keys(yamlSpec).forEach((key) => {
    if (yamlSpec[key] && typeof yamlSpec[key] === "object") {
      if (isArray) newYamlSpec.push(removeNulls(yamlSpec[key]));
      else newYamlSpec[key] = removeNulls(yamlSpec[key]);
    } else if (yamlSpec[key] !== null) {
      if (isArray) newYamlSpec.push(yamlSpec[key]);
      else newYamlSpec[key] = yamlSpec[key];
    }
  });

  return newYamlSpec;
};

/**
 * Remove Security schema
 * @param yamlSpec OpenApi Specification
 */
const removeSecuritySchemes = (yamlSpec) => {
  if (yamlSpec.components && yamlSpec.components.securitySchemes)
    delete yamlSpec.components.securitySchemes;

  return yamlSpec;
};

/**
 * Remove Wildcards in responses content type.
 * AWS throw error in wildcard responses.
 * @param yamlSpec OpenApi Specification
 */
const removeResponseContentTypesWildcards = (yamlSpec) => {
  const paths = yamlSpec.paths;
  if (!paths) yamlSpec;

  Object.keys(paths).forEach((path) => {
    Object.keys(paths[path]).forEach((method) => {
      if (methods.includes(method)) {
        const responses = paths[path][method].responses;
        if (responses) {
          Object.keys(responses).forEach((response) => {
            const content = responses[response].content;
            if (content && content["*/*"]) {
              content["application/json"] = content["*/*"];
              delete content["*/*"];
            }
          });
        }
      }
    });
  });

  return yamlSpec;
};

/**
 * Load the give yaml file
 * @param yamlFile File to be loaded
 */
const loadYamlFile = (project, api) => {
  const {
    PROJECTS_DIR,
    APIS_DIR,
    OPENAPI_SPEC_FILE,
    OPENAPI_SPEC_FILE_PARSED,
  } = config;

  const path = PROJECTS_DIR + "/" + project + "/" + APIS_DIR + "/" + api;
  const source = path + "/" + OPENAPI_SPEC_FILE;
  const parsed = path + "/" + OPENAPI_SPEC_FILE_PARSED;

  let yamlSpec = yaml.safeLoad(fs.readFileSync(source, "utf8"));
  yamlSpec = removeResponseContentTypesWildcards(yamlSpec);
  yamlSpec = appendAWSLambdaHandler(yamlSpec);
  yamlSpec = removeSecuritySchemes(yamlSpec);
  yamlSpec = removeNulls(yamlSpec);

  fs.writeFileSync(parsed, JSON.stringify(yamlSpec));
  return yamlSpec;
};

module.exports = { loadYamlFile };
