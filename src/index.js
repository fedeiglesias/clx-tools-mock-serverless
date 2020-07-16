"use strict";
const config = require("../config.js");
const lib = require("./shared.js");
const fs = require("fs");
const Project = require("./Project.js");
const iam = require("./IAM.js");

module.exports = async (serverless) => {
  const projects = await getProjectList();
  const projectsResources = await getProjectsResources(projects);

  return {
    Resources: {
      ...iam.getResources(),
      ...projectsResources,
    },
  };
};

/**
 * Get Project Resources
 * @param projects Array of Project instances
 */
const getProjectsResources = async (projects) => {
  let resources = {};

  for (let project of projects) {
    const projectResources = await project.getResources();
    resources = { ...resources, ...projectResources };
  }

  return resources;
};

/**
 * Get Project List
 */
const getProjectList = async () => {
  const projectNames = getAllProjectNames();
  let projects = [];

  for (let projectName of projectNames) {
    const project = new Project.create(projectName);
    await project.init();
    projects.push(project);
  }

  lib.log(
    "getProjectList: ",
    ...projects.map((project) => project.nameUppercase)
  );

  return projects;
};

/**
 * Get All Project Names
 */
const getAllProjectNames = () => {
  const projectsPath = "./" + config.PROJECTS_DIR;

  const projects = fs.readdirSync(projectsPath).filter((project) => {
    const projectPath = projectsPath + "/" + project;
    if (!fs.lstatSync(projectPath).isDirectory()) return false;
    const apis = getApisFromProject(project);
    if (!apis) return false;
    return true;
  });

  lib.log("getAllProjectNames: ", ...projects);

  return projects;
};

/**
 * Get valid Apis from Project
 * @param project Project Name
 */
const getApisFromProject = (project) => {
  const basePath = "./" + config.PROJECTS_DIR + "/" + project;
  const apisPath = basePath + "/" + config.APIS_DIR;
  if (!fs.existsSync(apisPath)) return false;

  const apis = fs.readdirSync(apisPath).filter((api) => {
    const apiPath = apisPath + "/" + api;
    const apiSpecFile = apiPath + "/" + config.OPENAPI_SPEC_FILE;
    if (!fs.lstatSync(apiPath).isDirectory()) return false;
    if (!fs.existsSync(apiSpecFile)) return false;
    return true;
  });

  //No valid Apis available
  if (!apis.length) return false;

  return apis;
};
