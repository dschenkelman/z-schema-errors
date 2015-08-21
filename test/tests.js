'use strict';

/*jshint node:true */
/*global describe, it, afterEach, beforeEach*/

require('should');
var zschemaErrors = require('../lib/index.js');

describe('z-schema-errors', function(){
  describe('defaults', function(){
    var reporter = zschemaErrors.init();
    it('should return default message for ENUM_MISMATCH code', function(){
      var error = {
        code: 'ENUM_MISMATCH',
        params: [ 'invalid_value' ],
        path: '#/elements',
        description: 'The elements'
      };

      var message = reporter.extractMessage({ report: { errors: [error] } });
      message.should.equal("An error occurred 'Invalid property \"invalid_value\"' on property elements (The elements).");
    });

    it('should return default message for any other code', function(){
      var error = {
        code: 'INVALID_FORMAT',
        path: '#/letterA',
        description: 'The letter A',
        message: 'Object didn\'t pass validation for format ^a$: b'
      };

      var message = reporter.extractMessage({ report: { errors: [error] } });
      message.should.equal("An error occurred 'Object didn\'t pass validation for format ^a$: b' on property letterA (The letter A).");
    });

    it('should correctly report nested objects', function(){
      var error = {
        code: 'INVALID_FORMAT',
        path: '#/parent/child/letterA',
        description: 'The letter A',
        message: 'Object didn\'t pass validation for format ^a$: b'
      };

      var message = reporter.extractMessage({ report: { errors: [error] } });
      message.should.equal("An error occurred 'Object didn\'t pass validation for format ^a$: b' on property parent.child.letterA (The letter A).");
    });

    it('should correctly report array elements', function(){
      var error = {
        code: 'INVALID_TYPE',
        path: '#/items/0',
        description: 'The item',
        message: 'Expected type number but found type string'
      };

      var message = reporter.extractMessage({ report: { errors: [error] } });
      message.should.equal("An error occurred 'Expected type number but found type string' on property items[0] (The item).");
    });

    it('should remove string between {^path} and {$path} if path is missing', function(){
      var error = {
        code: 'INVALID_TYPE',
        description: 'The item',
        message: 'Expected type number but found type string',
      };

      var message = reporter.extractMessage({ report: { errors: [error] } });
      message.should.equal("An error occurred 'Expected type number but found type string'.");
    });

    it('should remove string between {^description} and {$description} if description is missing', function(){
      var error = {
        code: 'INVALID_TYPE',
        path: '#/items/0',
        message: 'Expected type number but found type string'
      };

      var message = reporter.extractMessage({ report: { errors: [error] } });
      message.should.equal("An error occurred 'Expected type number but found type string' on property items[0].");
    });

    it('should allow multiple params with indexes', function(){
      var error = {
        code: 'OBJECT_DEPENDENCY_KEY',
        message: 'Dependency failed - key must exist: email (due to key: verify_email)',
        params: [ 'email', 'verify_email' ]
      };

      var message = reporter.extractMessage({ report: { errors: [error] } });
      message.should.equal("An error occurred 'Property email is mandatory if property verify_email is included'.");
    });

    it('should not throw if path is not string', function(){
      // test for https://github.com/dschenkelman/z-schema-errors/issues/2
      var error ={
        code: 'KEYWORD_UNDEFINED_STRICT',
        params: [ 'type' ],
        message: 'Keyword \'type\' must be defined in strict mode',
        path: []
      };

      var message = reporter.extractMessage({ report: { errors: [error] } });
      message.should.equal("An error occurred 'Keyword 'type' must be defined in strict mode'.");
    });
  });

  describe('customize extractors', function(){
    var reporter = zschemaErrors.init({
      extractors: {
        description: function(args){ return 'Description: ' + args.part; }
      }
    });

    it('should report description from custom extractor', function(){
      var error = {
        code: 'INVALID_TYPE',
        path: '#/items/0',
        description: 'The item',
        message: 'Expected type number but found type string'
      };

      var message = reporter.extractMessage({ report: { errors: [error] } });
      message.should.equal("An error occurred 'Expected type number but found type string' on property items[0] (Description: The item).");
    });
  });

  describe('customize formats', function(){
    var reporter = zschemaErrors.init({
      formats: {
        'INVALID_TYPE': '{path} has an invalid type. Error: {message}'
      }
    });

    it('should report using custom format', function(){
      var error = {
        code: 'INVALID_TYPE',
        path: '#/items/0',
        description: 'The item',
        message: 'Expected type number but found type string'
      };

      var message = reporter.extractMessage({ report: { errors: [error] } });
      message.should.equal("items[0] has an invalid type. Error: Expected type number but found type string");
    });
  });

  describe('customize formats and extractors', function(){
    var reporter = zschemaErrors.init({
      formats: {
        'INVALID_TYPE': '{description} @ {path} has an invalid type. Error: {message}'
      },
      extractors: {
        description: function(args){ return args.part; }
      }
    });

    it('should report using custom format and extractor', function(){
      var error = {
        code: 'INVALID_TYPE',
        path: '#/items/0',
        description: 'The item',
        message: 'Expected type number but found type string'
      };

      var message = reporter.extractMessage({ report: { errors: [error] } });
      message.should.equal("The item @ items[0] has an invalid type. Error: Expected type number but found type string");
    });
  });

  describe('provide context to extractors', function(){
    var reporter = zschemaErrors.init({
      formats: {
        'INVALID_TYPE': '{description} @ {path} has an invalid type. Error: {message}'
      },
      extractors: {
        description: function(args){ return args.context.value; }
      }
    });

    it('should be able to use context in extractors', function(){
      var error = {
        code: 'INVALID_TYPE',
        path: '#/items/0',
        description: 'The item',
        message: 'Expected type number but found type string'
      };

      var ctx = { value: 'The element' };

      var message = reporter.extractMessage({ report: { errors: [error] }, context: ctx });
      // note that it starts 'The element'
      message.should.equal("The element @ items[0] has an invalid type. Error: Expected type number but found type string");
    });
  });

  describe('customize context message', function(){
    var reporter = zschemaErrors.init({
      contextMessage: 'Error!!!'
    });

    it('should report using custom format and extractor', function(){
      var error = {
        code: 'INVALID_TYPE',
        path: '#/items/0',
        description: 'The item',
        message: 'Expected type number but found type string'
      };

      var message = reporter.extractMessage({ report: { errors: [error] } });
      message.should.equal("Error!!! 'Expected type number but found type string' on property items[0] (The item).");
    });
  });

  describe('multiple errors', function(){
    var reporter = zschemaErrors.init();

    it('should report errors separated by (also)', function(){
      var error1 = {
        code: 'INVALID_TYPE',
        path: '#/items/0',
        description: 'The item',
        message: 'Expected type number but found type string'
      };

      var error2 = {
        code: 'INVALID_FORMAT',
        path: '#/letterA',
        description: 'The letter A',
        message: 'Object didn\'t pass validation for format ^a$: b'
      };

      var message = reporter.extractMessage({ report: { errors: [error1, error2] } });
      message.should.equal("An error occurred 'Expected type number but found type string' on property items[0] (The item). (also) An error occurred 'Object didn't pass validation for format ^a$: b' on property letterA (The letter A).");
    });
  });

  describe('inner error', function(){
    it('should handle inner errors', function(){
      var reporter = zschemaErrors.init({
        formats: {
          'ANY_OF_MISSING': '{context} \'None of the valid schemas were met\'{^path} on property {path} ({description}){$path}.{^inner} Inner errors: [ {inner} ].{$inner}'
        }
      });

      var report = {
        errors: [
        {
          code: 'ANY_OF_MISSING',
          params: [],
          message: 'Data does not match any schemas from \'anyOf\'',
          path: '#/',
          inner: [
            {
              code: 'INVALID_TYPE',
              params: [ 'string', 'boolean' ],
              message: 'Expected type string but found type boolean',
              path: '#/given_name',
              description: 'The user\'s user given name(s)'
            },
            {
              code: 'INVALID_TYPE',
              params: [ 'string', 'boolean' ],
              message: 'Expected type string but found type boolean',
              path: '#/given_name',
              description: 'The user\'s user given name(s)'
            }
          ]
        }]
      };

      var message = reporter.extractMessage({ report:  report });
      message.should.equal("An error occurred 'None of the valid schemas were met'. Inner errors: [ An error occurred 'Expected type string but found type boolean' on property given_name (The user's user given name(s)). ].");
    });

    it('should have context in inner errors', function(){
      var reporter = zschemaErrors.init({
        formats: {
          'ANY_OF_MISSING': '{context} \'None of the valid schemas were met\'{^path} on property {path} ({description}){$path}.{^inner} Inner errors: [ {inner} ].{$inner}'
        },
        extractors: {
          description: function(args) { return args.context && args.context.has_description ? args.part : 'no description'; }
        }
      });

      var report = {
        errors: [
        {
          code: 'ANY_OF_MISSING',
          params: [],
          message: 'Data does not match any schemas from \'anyOf\'',
          path: '#/',
          inner: [
            {
              code: 'INVALID_TYPE',
              params: [ 'string', 'boolean' ],
              message: 'Expected type string but found type boolean',
              path: '#/given_name',
              description: 'The user\'s user given name(s)'
            },
            {
              code: 'INVALID_TYPE',
              params: [ 'string', 'boolean' ],
              message: 'Expected type string but found type boolean',
              path: '#/given_name',
              description: 'The user\'s user given name(s)'
            }
          ]
        }]
      };

      var message = reporter.extractMessage({ report:  report, context: { has_description: true } });
      message.should.equal("An error occurred 'None of the valid schemas were met'. Inner errors: [ An error occurred 'Expected type string but found type boolean' on property given_name (The user's user given name(s)). ].");
    });
  });
});