var tmp = require('tmp');
var assign = require('object-assign');
var fs = require('fs');
var crossExecFile = require('cross-exec-file');

/**
 * @param {string} url url (e.g. http://google.com)
 * @param {object} o CLI options (NOTE: only properties not present in (or different from) CLI are described below)
 * @param {object|string} o.user either object with 'name' and 'password' properties or a string (e.g. 'username:password')
 * @param {string} o.user.name username
 * @param {string} o.user.password password
 * @param {string} o.user-agent user device profile name
 * @param {string} o.limit-rate network throttling profile name
 * @param {string} o.landscape force device profile to be landscape
 * @param {function(err, json)} callback callback (NOTE: if err != null err.code will be the exit code (e.g. 3 - wrong usage,
 * 4 - timeout, below zero - http://src.chromium.org/svn/trunk/src/net/base/net_error_list.h))
 */
module.exports = function electronHAR(url, options, callback) {
  typeof options === 'function' && (callback = options, options = {});

  // using temporary file to prevent messages like "Xlib:  extension ...",
  // "libGL error ..." from cluttering stdout in a headless env (as in Xvfb).
  tmp.file(function (err, path, fd, cleanup) {

    if (err) {
      return callback(err);
    }

    callback = (function (callback) {
      return function () {
        process.nextTick(Function.prototype.bind.apply(callback,
          [null].concat(Array.prototype.slice.call(arguments))
        ));

        cleanup();
      };
    })(callback);

    console.log(options);

    // map options into config object
    var config = assign({}, options, {
      output: path,
      user: options.user === Object(options.user) ?
        options.user.name + ':' + options.user.password :
        options.user,
      'user-agent': options['user-agent'] ? options['user-agent'] : null,
      'limit-rate': options['limit-rate'] ? options['limit-rate'] : null,
      landscape: options['landscape'] ? options['landscape'] : null
    });

    // initialize electron-har process
    crossExecFile(
      __dirname + '/../bin/electron-har',
      [url].concat(
        Object
          .keys(config)
          .reduce(function (n, flag) {
            var argvs = config[flag];
            argvs !== null && argvs.push(flag.length === 1 ? '-' + flag : '--' + flag, argvs);
            return argvs;
          }, [])
      ),
      function (err, stdout, stderr) {
        if (err) {
          if (stderr) {
            err.message = stderr.trim();
          }

          return callback(err);
        }

        fs.readFile(path, 'utf8', function (err, data) {
          if (err) {
            return callback(err);
          }

          try {
            callback(null, JSON.parse(data));

          } catch (e) {
            return callback(e);

          }
        });
      });
  });
};
