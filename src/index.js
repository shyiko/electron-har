var tmp = require('tmp');
var assign = require('object-assign');
var fs = require('fs');
var execFile = require('child_process').execFile;

/**
 * @param {string} url url (e.g. http://google.com)
 * @param {object} o CLI options (NOTE: only properties not present in (or different from) CLI are described below)
 * @param {object|string} o.user either object with 'name' and 'password' properties or a string (e.g. 'username:password')
 * @param {string} o.user.name username
 * @param {string} o.user.password password
 * @param {function(err, json)} cb callback (NOTE: if err != null err.code will be the exit code (e.g. 3 - wrong usage,
 * 4 - timeout, below zero - http://src.chromium.org/svn/trunk/src/net/base/net_error_list.h))
 */
module.exports = function electronHAR(url, o, cb) {
  typeof o === 'function' && (cb = o, o = {});
  // using temporary file to prevent messages like "Xlib:  extension ...", "libGL error ..."
  // from cluttering stdout in a headless env (as in Xvfb).
  tmp.file(function (err, path, fd, cleanup) {
    if (err) {
      return cb(err);
    }
    cb = (function (cb) { return function () {
      process.nextTick(Function.prototype.bind.apply(cb,
        [null].concat(Array.prototype.slice.call(arguments))));
      cleanup();
    }; })(cb);
    var oo = assign({}, o, {
      output: path,
      user: o.user === Object(o.user) ?
        o.user.name + ':' + o.user.password : o.user
    });
    execFile(
      __dirname + '/../bin/electron-har',
      [url].concat(Object.keys(oo).reduce(function (r, k) {
        r.push(k.length === 1 ? '-' + k : '--' + k);
        oo[k] && r.push(oo[k]);
        return r;
      }, [])),
      function (err, stdout, stderr) {
        if (err) {
          if (stderr) {
            err.message = stderr.trim();
          }
          return cb(err);
        }
        fs.readFile(path, 'utf8', function (err, data) {
          if (err) {
            return cb(err);
          }
          try {
            cb(null, JSON.parse(data));
          } catch (e) {
            return cb(e);
          }
        });
      });
  });
};
