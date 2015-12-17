var expect = require('chai').expect;
var http = require('http');
var url = require('url');
var exec = require('child_process').exec;

describe('electron-har', function () {
  this.timeout(10000);

  var baseURL;

  before(function (done) {
    var server = http.createServer(function (req, res) {
      var path = url.parse(req.url).pathname;
      switch (path) {
        case '/':
          res.setHeader('Content-Type', 'text/html');
          res.write(
            '<!DOCTYPE html>' +
            '<script src="index.js"></script>'
          );
          break;
        case '/index.js':
          res.setHeader('Content-Type', 'application/javascript');
          res.write(
            'console.log("I wish I was a pony!")'
          );
          break;
        case '/self-destruct':
          if (req.headers.authorization === 'Basic ' +
            new Buffer('jean_luc_picard:picard_4_7_alpha_tango')
              .toString('base64')) {
            res.setHeader('Content-Type', 'text/plain');
            res.write('BOOM!');
          } else {
            res.setHeader('WWW-Authenticate', 'Basic realm=Hogwarts');
            res.statusCode = 401;
          }
          break;
        default:
          res.statusCode = 404;
      }
      res.end();
    });
    server.on('listening', function () {
      var addr = server.address();
      baseURL = 'http://localhost:' + addr.port;
      done();
    });
    server.listen(0);
  });

  it('should include all resources before onload', function (done) {
    exec(__dirname + '/../bin/electron-har "' + baseURL + '/"',
      function (err, stdout, stderr) {
        if (err) {
          throw err;
        }
        var har = JSON.parse(stdout);
        expect(har.log.entries.length).to.be.equal(2); // html + script
        done();
      });
  });
  it('should generate valid HAR even if url leads to something other than html',
    function (done) {
      exec(__dirname + '/../bin/electron-har "' + baseURL + '/index.js"',
        function (err, stdout, stderr) {
          if (err) {
            throw err;
          }
          var har = JSON.parse(stdout);
          expect(har.log.entries.length).to.be.equal(1);
          done();
        });
    });
  it('should return an error in case of malformed url', function (done) {
    exec(__dirname + '/../bin/electron-har "http://_"',
      function (err, stdout, stderr) {
        expect(err).to.exist;
        expect(stderr).to.contain('attempt to generate HAR resulted in error code -');
        done();
      });
  });
  it('should attempt to authenticate in case url is protected', function (done) {
    exec(__dirname + '/../bin/electron-har -u jean_luc_picard:picard_4_7_alpha_tango "' + baseURL + '/self-destruct"',
      function (err, stdout, stderr) {
        if (err) {
          throw err;
        }
        var har = JSON.parse(stdout);
        expect(har.log.entries.length).to.be.equal(1);
        expect(har.log.entries[0].response.status).to.be.equal(200); // not 401
        done();
      });
  });
});
