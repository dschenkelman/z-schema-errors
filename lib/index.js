'use strict';

/*jshint node:true */

var xtend = require('xtend');

// only for array of strings
function distinct(array){
  return Object.keys(array.reduce(function(current, value){
    current[value] = true;
    return current;
  }, {}));
}

function createMessageReporter(options){
  var DEFAULT_EXTRACTORS = {
    path: function (params){
      var path = params.part;
      if (path && typeof path === 'string'){
        return path.substr(2).replace(/\//g, '.').replace(/\.([0-9]+)/g, '[$1]');
      }

      return '';
    },
    message: function(params){ return params.part; },
    description: function(params){ return params.part; },
    params: function extractParams(args) {
      var p = args.part;
      var index = args.index;
      if (Array.isArray(p)) {
        return p[index];
      }

      return p;
    }
  };

  var DEFAULT_FORMATS = {
    DEFAULT: '{context} \'{message}\'{^path} on property {path}{^description} ({description}){$description}{$path}.',
    ENUM_MISMATCH: '{context} \'Invalid property "{params[0]}"\'{^path} on property {path}{^description} ({description}){$description}{$path}.',
    OBJECT_DEPENDENCY_KEY: '{context} \'Property {params[0]} is mandatory if property {params[1]} is included\'.'
  };

  function formatMessage(args){
    var format = args.format;
    var error = args.error;
    var inner = args.inner;
    var context = args.context;

    var params = [];
    params = error.params && Array.isArray(error.params) ? error.params : [error.params];
    var paramsPlaceholders = params.map(function(_, i){
      return 'params[' + i + ']';
    });

    var baseParts = ['path', 'description', 'message', 'inner'];
    var partsToProcess = baseParts.concat(paramsPlaceholders);

    return partsToProcess.reduce(function(current, part){
      var partPlaceholder = '{' + part + '}';
      var isParam = part.indexOf('params') !== -1;
      var index = -1;
      if (isParam){
        var begin = part.indexOf('[') + 1;
        var end = part.indexOf(']');
        index = parseInt(part.substring(begin, end), 10);
        part = 'params';
      }

      var output =
        part === 'inner' ?
          inner :
          error[part] ? extractors[part]({
            part: error[part],
            index:index,
            context: context
          }) : '';
      if (!output || output.length === 0){
        // handle removal
        var indexOfPlaceHolder = current.indexOf(partPlaceholder);

        if (indexOfPlaceHolder === -1){
          return current;
        }

        var endRemove = current.indexOf('{$' + part + '}', indexOfPlaceHolder + partPlaceholder.length);
        var startRemove = current.lastIndexOf('{^' + part + '}', indexOfPlaceHolder);

        if (startRemove !== -1 && endRemove !== -1 && startRemove < endRemove){
          return current.slice(0, startRemove) + current.slice(endRemove);
        }

        return current;
      }

      return current.replace(partPlaceholder, output);
    }, format)
      .replace('{context}', contextMessage || '')
      .replace(/(\{\$[a-zA-Z]+\})|(\{\^[a-zA-Z]+\})/g, '');
  }

  function extractMessage(params) {
    var report = params.report;
    var context = params.context || {};
    return distinct(report.errors.map(function(error){
      // we report the inner most error since users don't care about the outer one
      var inner = '';
      if (error.inner){
        inner = extractMessage({ report: { errors: error.inner }, context: context });
      }
      return formatMessage({
        format: formats[error.code] || formats.DEFAULT,
        error: error,
        inner: inner,
        context: context
      });
    })).join(' (also) ');
  }

  options = options || {};

  var formats = xtend(DEFAULT_FORMATS, options.formats || {});
  var extractors = xtend(DEFAULT_EXTRACTORS, options.extractors || {});
  var contextMessage = options.contextMessage || 'An error occurred';

  return {
    extractMessage: extractMessage
  };
}

module.exports.init = createMessageReporter;