var yargs = require('yargs')
  .usage('Usage: electron-har [options...] <url>')
  // NOTE: when adding an option - keep it compatible with `curl` (if possible)
  .describe('u', 'User [and password] divided by colon').alias('u', 'user').nargs('u', 1)
  .describe('debug', 'Show GUI (useful for debugging)').boolean('debug')
  .help('h').alias('h', 'help')
  .version(function () { return require('../package').version; })
  .strict();
var argv = yargs.argv;

var url = argv._[0];
if (argv.u) {
  var usplit = argv.u.split(':');
  var username = usplit[0];
  var password = usplit[1] || '';
}
var debug = !!argv.debug;

var argvValidationError;
if (!url) {
  argvValidationError = 'URL must be specified';
} else if (!/^(http|https|file):\/\//.test(url)) {
  argvValidationError = 'URL must contain the protocol prefix, e.g. the http:// or file://.';
}
if (argvValidationError) {
  yargs.showHelp();
  console.error(argvValidationError);
  process.exit(1);
}

var app = require('app');
var BrowserWindow = require('browser-window');
var stringify = require('json-stable-stringify');

app.commandLine.appendSwitch('disable-http-cache');
app.dock.hide();
app.on('window-all-closed', function () {
  app.quit();
});

if (username) {
  app.on('login', function (event, webContents, request, authInfo, callback) {
    event.preventDefault();
    callback(username, password);
  });
}

var ipcMain = require('electron').ipcMain;
ipcMain.on('har-generation-succeeded', function (sender, event) {
  console.log(stringify(event, {space: 2}));
  debug || app.quit();
});
ipcMain.on('har-generation-failed', function (sender, event) {
  console.error(stringify(event, {space: 2}));
  debug || app.exit(1);
});

app.on('ready', function () {

  BrowserWindow.removeDevToolsExtension('devtools-extension');
  BrowserWindow.addDevToolsExtension(__dirname + '/devtools-extension');

  var bw = new BrowserWindow({show: debug});

  bw.webContents.on('devtools-opened', function () {
    function notifyDevToolsExtensionOfLoad() {
      bw.webContents.executeJavaScript('new Image().src = "https://did-finish-load/"');
    }

    // fired regardless of the outcome (success or not)
    bw.webContents.on('did-finish-load', notifyDevToolsExtensionOfLoad);

    bw.webContents.on('did-fail-load', function (e, errorCode, errorDescription, url) {
      if (url !== 'chrome://ensure-electron-resolution/' && url !== 'https://did-finish-load/') {
        bw.webContents.removeListener('did-finish-load', notifyDevToolsExtensionOfLoad);
        var err = new Error(errorDescription);
        err.code = errorCode;
        require('electron').ipcRenderer.send('har-generation-failed', err);
      }
    });
  });

  ipcMain.on('devtools-loaded', function (event) {
    setTimeout(function () { bw.loadURL(url); }, 0);
  });

  bw.openDevTools();

  // any url will do, but make sure to call loadURL before 'devtools-opened'.
  // otherwise require('electron') within child BrowserWindow will (most likely) fail
  bw.loadURL('chrome://ensure-electron-resolution/');

});
