'use strict';

const defaults = require('defaults-deep');
const path = require('path');

module.exports = (templateSetOptions) => {
  const options = defaults(templateSetOptions || {}, {
    definitions: './definitions',
    controllers: './controllers',
    defsRelativeToController: '../definitions',
    operations: ['get', 'patch', 'put', 'post', 'delete'],
    controllerSplitBy: 'x-swagger-router-controller',
    implementationPath: null,
  });

  // Mandatory parameter.
  if (!options.implementationPath) {
    throw new Error('Cannot load template set: you must specify the implementationPath!');
  }
  
  const result = {
    perPath: {},
    perDefinition: {}
  };

  const definitionKey = path.join(__dirname, 'perDefinition', 'es6-definition.js');
  result.perDefinition[definitionKey] = {
    target: options.definitions,
  }

  const pathKey = path.join(__dirname, 'perPath', 'es6-controller-stub.js');
  result.perPath[pathKey] = {
    target: options.controllers,
    operations: options.operations,
    groupBy: options.controllerSplitBy,
    defsRelativeToController: options.defsRelativeToController,
    implementationPath: options.implementationPath,
  };

  return result;
};
