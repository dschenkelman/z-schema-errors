'use strict';

/*jshint node:true */
/*global describe, it, afterEach, beforeEach*/

require('should');
var zschemaErrors = require('../lib/index.js');

describe('z-schema-errors', function(){
  describe('defaults', function(){
    var reporter = zschemaErrors.init();
    it('should return default message for enum mismatch', function(){
      var error = {
        code: 'ENUM_MISMATCH',
        params: [ 'invalid_value' ],
        path: '#/elements',
        description: 'The elements'
      };

      var message = reporter.extractMessage({ errors: [error] });
      message.should.equal("An error occurred 'Invalid property \"invalid_value\"' on property elements (The elements).");
    });
  });
});