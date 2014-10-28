'use strict';

/*jshint node:true */

var xtend = require('xtend');

function createMessageReporter(options){
  var DEFAULT_EXTRACTORS = {
    path: function (path){
      if (path){
        return path.substr(2).replace(/\//g, '.').replace(/\.\[/g, '[');
      }

      return '';
    },
    message: function(m){ return m; },
    description: function(d){ return d; },
    params: function extractParams(p) {
      if (Array.isArray(p)) {
        return extractParams(p[0]);
      }

      return p;
    }
  };

  var DEFAULT_FORMATS = {
    DEFAULT: '{context} \'{message}\'{^path} on property {path}{^description} ({description}){$description}{$path}.',
    ENUM_MISMATCH: '{context} \'Invalid property "{params}"\'{^path} on property {path}{^description} ({description}){$description}{$path}.'
  };

  function formatMessage(format, error){
    return ['path', 'description', 'message', 'params'].reduce(function(current, part){
      var partPlaceholder = '{' + part + '}';
      var output = error[part] ? extractors[part](error[part]) : '';
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
    }, format).replace('{context}', contextMessage || '').replace(/(\{\$[a-zA-Z]+\})|(\{\^[a-zA-Z]+\})/g, '');
  }

  function extractMessage(report) {
    return report.errors.map(function(error){
      return formatMessage(formats[error.code] || formats.DEFAULT, error);
    }).join(' (also) ');
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