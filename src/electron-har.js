var yargs = require('yargs')
  .usage('Usage: electron-har [options...] <url>')
  // NOTE: when adding an option - keep it compatible with `curl` (if possible)
  .describe('u', 'Username and password (divided by colon)').alias('u', 'user').nargs('u', 1)
  .describe('b', 'Pass the data to the HTTP server as a cookie. ' +
    'It is supposedly the data previously received from the server in a "Set-Cookie:" line.  ' +
    'The data should be in theformat "NAME1=VALUE1; NAME2=VALUE2"').alias('b', 'cookie').nargs('b', 1)
  .describe('o', 'Write to file instead of stdout').alias('o', 'output').nargs('o', 1)
  .describe('m', 'Maximum time allowed for HAR generation (in seconds)').alias('m', 'max-time').nargs('m', 1)
  .describe('debug', 'Show GUI (useful for debugging)').boolean('debug')
  .help('h').alias('h', 'help')
  .version(function () { return require('../package').version; })
  .strict();
var argv = process.env.ELECTRON_HAR_AS_NPM_MODULE ?
  yargs.argv : yargs.parse(process.argv.slice(1));

var url = argv._[0];
if (argv.u) {
  var usplit = argv.u.split(':');
  var username = usplit[0];
  var password = usplit[1] || '';
}
if (argv.b) {
  var cookie = argv.b;
}
var outputFile = argv.output;
var timeout = parseInt(argv.m, 10);
var debug = !!argv.debug;

var argvValidationError;
if (!url) {
  argvValidationError = 'URL must be specified';
} else if (!/^(http|https):\/\//.test(url)) {
  argvValidationError = 'URL must contain the protocol prefix, e.g. http://';
}
if (argvValidationError) {
  yargs.showHelp();
  console.error(argvValidationError);
  // http://tldp.org/LDP/abs/html/exitcodes.html
  process.exit(3);
}

var electron = require('electron');
var app = require('app');
var BrowserWindow = require('browser-window');
var stringify = require('json-stable-stringify');
var fs = require('fs');
var cookieParse = require('cookie').parse;

if (timeout > 0) {
  setTimeout(function () {
    console.error('Timed out waiting for the HAR');
    debug || app.exit(4);
  }, timeout * 1000);
}

app.commandLine.appendSwitch('disable-http-cache');
app.dock && app.dock.hide();
app.on('window-all-closed', function () { app.quit(); });

electron.ipcMain
  .on('har-generation-succeeded', function (sender, event) {
    var har = stringify(event, {space: 2});
    if (outputFile) {
      fs.writeFile(outputFile, har, function (err) {
        if (err) {
          console.error(err.message);
          debug || app.exit(5);
          return;
        }
        debug || app.quit();
      });
    } else {
      console.log(har);
      debug || app.quit();
    }
  })
  .on('har-generation-failed', function (sender, event) {
    console.error('An attempt to generate HAR resulted in error code ' + event.errorCode +
      (event.errorDescription ? ' (' + event.errorDescription + ')' : '') +
      '. \n(error codes defined in http://src.chromium.org/svn/trunk/src/net/base/net_error_list.h)');
    debug || app.exit(event.errorCode);
  });

app.on('ready', function () {

  BrowserWindow.removeDevToolsExtension('devtools-extension');
  BrowserWindow.addDevToolsExtension(__dirname + '/devtools-extension');

  var bw = new BrowserWindow({show: debug});

  if (username) {
    bw.webContents.on('login', function (event, request, authInfo, cb) {
      event.preventDefault(); // default behavior is to cancel auth
      cb(username, password);
    });
  }

  if (cookie) {
    var cookies = cookieParse(cookie);
    var keys = Object.keys(cookies);
    if (keys.length) {
      var count = 0;
      keys.forEach(function (name) {
        var cookieObj = {
          url: url,
          name: name,
          value: cookies[name]
        };
        bw.webContents.session.cookies.set(cookieObj, function (err) {
          if (err) {
            console.error('An attempt to set cookie ' + JSON.stringify(cookieObj) + ' resulted in error' + err);
            debug || app.exit();
          }
          count++;
          if (count === keys.length) {
            loadDevToolsAndUrl();
          }
        });
      });
    } else {
      loadDevToolsAndUrl();
    }
  } else {
    loadDevToolsAndUrl();
  }

  function loadDevToolsAndUrl() {
    function notifyDevToolsExtensionOfLoad(e) {
      if (e.sender.getURL() != 'chrome://ensure-electron-resolution/') {
        bw.webContents.executeJavaScript('new Image().src = "https://did-finish-load/"');
      }
    }

    // fired regardless of the outcome (success or not)
    bw.webContents.on('did-finish-load', notifyDevToolsExtensionOfLoad);

    bw.webContents.on('did-fail-load', function (e, errorCode, errorDescription, url) {
      if (url !== 'chrome://ensure-electron-resolution/' && url !== 'https://did-finish-load/') {
        bw.webContents.removeListener('did-finish-load', notifyDevToolsExtensionOfLoad);
        bw.webContents.executeJavaScript('require("electron").ipcRenderer.send("har-generation-failed", ' +
          JSON.stringify({errorCode: errorCode, errorDescription: errorDescription}) + ')');
      }
    });

    electron.ipcMain.on('devtools-loaded', function (event) {
      setTimeout(function () {
        // bw.loadURL proved to be unreliable on Debian 8 (half of the time it has no effect)
        bw.webContents.executeJavaScript('location = ' + JSON.stringify(url));
      }, 0);
    });

    bw.openDevTools();

    // any url will do, but make sure to call loadURL before 'devtools-opened'.
    // otherwise require('electron') within child BrowserWindow will (most likely) fail
    bw.loadURL('chrome://ensure-electron-resolution/');
  }
});
