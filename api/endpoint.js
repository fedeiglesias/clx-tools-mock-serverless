"use strict";
const config = require("../config.js");
const refParser = require("@apidevtools/json-schema-ref-parser");
const jsf = require("json-schema-faker");

module.exports.handler = async (event, context, callback) => {
  const srcYMLFilePath = getSrcPath(event);
  const srcYMLFile = require(srcYMLFilePath);
  const OAPISpec = await refParser.dereference(srcYMLFile);

  const resCode = parseInt(getResponseCode(event, OAPISpec));
  const responseSchema = getResponseSchema(event, OAPISpec);
  const mockData = await jsf.resolve(responseSchema);

  return {
    statusCode: resCode,
    body: JSON.stringify(mockData),
  };
};

/**
 * Get Response Code
 * @param evt Lambda Event
 * @param spec OpenAPI Specification
 */
const getResponseCode = (evt, spec) => {
  const getSuccessCode = (codes) => {
    return codes.filter(
      (code) => parseInt(code) >= 200 && parseInt(code) <= 299
    )[0];
  };

  const reqMethod = getHttpMethod(evt);
  const resourceName = getResourceName(evt);
  const responseCodes = Object.keys(
    spec.paths[resourceName][reqMethod].responses
  );

  let responseCode = getSuccessCode(responseCodes);

  if (evt.queryStringParameters && evt.queryStringParameters.mockRespCode) {
    const resCodeParam = evt.queryStringParameters.mockRespCode;
    if (responseCodes.includes(resCodeParam)) responseCode = resCodeParam;
  }

  return responseCode;
};

/**
 * Get Project Name
 * @param evt Lambda Event
 */
const getProjectName = (evt) => {
  let project = "";
  if (evt.requestContext && evt.requestContext.domainPrefix)
    project = evt.requestContext.domainPrefix.replace(
      config.CUSTOM_DOMAIN_PREFIX,
      ""
    );

  return project;
};

/**
 * Get Api Name
 * @param evt Lambda Event
 */
const getApiName = (evt) => {
  let api = "";
  if (evt.requestContext && evt.requestContext.path)
    api = evt.requestContext.path.split("/")[1];

  return api;
};

/**
 * Get Source Specification Path
 * @param evt Lambda Event
 */
const getSrcPath = (evt) => {
  return (
    "../" +
    [
      config.PROJECTS_DIR,
      getProjectName(evt),
      config.APIS_DIR,
      getApiName(evt),
      config.OPENAPI_SPEC_FILE_PARSED,
    ].join("/")
  );
};

/**
 * Get Request HTTP Method
 * @param evt Lambda Event
 */
const getHttpMethod = (evt) => {
  let method = "";
  if (evt.requestContext && evt.requestContext.httpMethod)
    method = evt.requestContext.httpMethod.toLowerCase();

  return method;
};

/**
 * Get Resource Name
 * @param evt Lambda Event
 */
const getResourceName = (evt) => evt.resource;

/**
 * Get Response Schema
 * @param evt Lambda Event
 */
const getResponseSchema = (evt, schema) => {
  const resCode = getResponseCode(evt, schema);
  const reqMethod = getHttpMethod(evt);
  const resourceName = getResourceName(evt);
  const resSchema =
    schema.paths[resourceName][reqMethod].responses[resCode].content;
  const contType = Object.keys(resSchema)[0];
  return resSchema[contType].schema;
};
