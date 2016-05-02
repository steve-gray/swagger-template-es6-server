# swagger-template-es6-server
[![Prod Dependencies](https://david-dm.org/steve-gray/gulp-swagger-codegen/status.svg)](https://david-dm.org/steve-gray/swagger-template-es6-server)
[![Dev Dependencies](https://david-dm.org/steve-gray/gulp-swagger-codegen/dev-status.svg)](https://david-dm.org/steve-gray/swagger-template-es6-server#info=devDependencies)
[![npm version](https://badge.fury.io/js/swagger-template-es6-server.svg)](https://badge.fury.io/js/swagger-template-es6-server)

Templates for use with swagger-codegen/gulp-swagger-codegen. Generates ES6 
server-side definitions and controller-stubs intended for use with swagger-tools
or similar packages.

## Installation & Usage
To use with gulp-swagger-codegen, install with:

    npm install swagger-template-es6-server --save-dev
    npm install gulp-swagger-codegen --save-dev

Now create your gulp task:

    const gulp = require('gulp');
    const templateSet = require('../../swagger-template-es6-server');
    const codegen = require('../task');

    gulp.task('default', () =>
      gulp.src(['./examples/waffle-maker/service-contract.yaml'])
        .pipe(codegen(templateSet({
          implementationPath: '../implementation',
        })))
        .pipe(gulp.dest('./examples/waffle-maker')));

__NOTE__: implementationPath defines the path relative to your gulp.dest
where the implemented operation handlers for your template reside. It is
the only mandatory option for this template-set.

## Configurable Options
When invoking the template() module-function, you can pass in alternatives
for the following options. Values shown below are the _defaults_ that will be
assumed in lieu of configuration to the contrary:

    {
      // Path to your real controllers that the stubs are
      // wired up to.
      implementationPath: '../../controllers',
      
      // HTTP verbs to generate actions for.
      operations: ['get', 'put', 'post', 'delete'],

      // When dividing up the operations/paths, this custom attribute
      // is used to determine the set of 'controllers' we generate.
      controllerSplitBy: 'x-swagger-router-controller',

      // Paths relative to gulp.dest where files are written. Note
      // that you can probably leave these alone unless you need
      // a specific structure.
      definitions: './definitions',
      controllers: './controllers',
      // Relative definition path for a require() from a controller
      defsRelativeToController: '../definitions',
    }

## Code Generation Overview
This template set generates code that is intended to be used with `swagger-tools`
as a baseline server. The code uses the following attributes on paths in the swagger-file:

  - x-swagger-router-controller
    - Defines the name of the controller to assign this operation to. Can be specified at path
      or HTTP verb level.
  - operationId
    - Specified per operation, defines the name of the method that will be generated.
  - x-gulp-swagger-codegen-outcome
    - The alias for a 'response' that allows for automatic setting of the HTTP header and
      validation of the response body structure.

For example, given:

    paths:
      /waffles:
        x-swagger-router-controller: waffles
        get:
          operationId: getWaffleList
          tags:
            - Waffle Operations
          summary: List the types of Waffles known to the waffle making machine.
          consumes:
            - application/json
          produces:
            - application/json
          responses:
            "200":
              x-gulp-swagger-codegen-outcome: success
              description: List of waffle types
              schema:
                type: array
                items:
                  $ref: "#/definitions/Waffle"

You will get:

  - A controller stub called ./controllers/waffles.js
  - It will contain a method called getWaffleList
  - When you call getWaffleList, your real implementation will be invoked with a 'responder'
    object which provides easy-access to response handling.

Here's the generated code for the getWaffleList operation:

    function getWaffleList(req, res) {
      validateSwaggerRequest(req, res);
      const responder = {
        res,
        // Handle status 200 [success]
        success: function endSuccess(result) {
          // Result is an array
          const typedResult = [];
          for (const resultItem of result) {
            // Parse the Waffle instance.
            const Waffle = require('../definitions/waffle');
            const parsedItem = new Waffle(resultItem);
            typedResult.push(parsedItem);
          }
          res.json(typedResult, 200);
        },
      };

      const impl = resolveImplementation(wafflesImplementation, req);
      if (!impl) {
        throw new Error('Cannot resolve implementation of waffles');
      } else if (!impl.getWaffleList) {
        throw new Error('Implementation is missing operation getWaffleList for waffles');
      } else if (!(typeof impl.getWaffleList === 'function')) {
        throw new Error('Implementation is not a function: getWaffleList for waffles');
      }

      return impl.getWaffleList(
        // if you had other parameters, they'd precede responder.
        responder
      );
    }

This code has a few phases:

  1. Validate the request and parameters, if any
  2. Build a responder that can be used by the 'implementation' type.
  3. Create an instance of your implementation type.
  4. Call the same method on your implementation type, passing parameters
     in sequence. The final parameter will be the responder.

This means your code can be as simple as:

    class WaffleControllerImpl {
      /**
      * Get the list of known waffle types
      * @param {object} responder      - Automatically generated responder object
      */
      getWaffleList(responder) {
        responder.success(this._waffleTypes);
      }
    }

## Valid Controller Implementations
The controller implementation can be any of:

  - An ES6 class that can be constructed with no parameters. A method
    for each operationId must be present.
  - An ES6 function with no parameters, which returns a method-map
    for your operations.
  - A simple object with a method-map.

## IoC Support
The controller-stub template checks for a function on (req) called `resolver`.
If `resolver(impl)` is present, the workflow that runs is:

    1. Load the implementation module via require();
    2. x = req.resolve(impl)
    3. Call x.operationId(args.., responder)

This allows for IoC style buildup of classes or functions that require
constructor input.