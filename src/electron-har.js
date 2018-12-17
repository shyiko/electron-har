const pkg = (() => {
  try {
    return require('./package.json')
  } catch (e) {
    return require('../package.json')
  }
})()

// workaround for https://github.com/electron/electron/issues/12438
const console = process.env.ELECTRON_HAR_AS_NPM_MODULE
  ? new (require('console').Console)(
    process.stdout,
    require('fs').createWriteStream(null, { fd: 3 })
  )
  : global.console

const yargs = require('yargs')
  .usage('Usage: electron-har [options...] <url>')
  // NOTE: when adding an option - keep it compatible with `curl` (if possible)
  .describe('u', 'Username and password (divided by colon)').alias('u', 'user').nargs('u', 1)
  .describe('b', 'Cookie ("cookie_name=value") (multiple entries should be separated with the semicolon)').alias('b', 'cookie').nargs('b', 1)
  .describe('o', 'Write to file instead of stdout').alias('o', 'output').nargs('o', 1)
  .describe('m', 'Maximum time allowed for HAR generation (in seconds)').alias('m', 'max-time').nargs('m', 1)
  .describe('debug').hide('debug').boolean('debug') // deprecated
  .describe('show', 'Show browser window').boolean('show')
  .describe('disable-gpu', 'Disable hardware acceleration').boolean('disable-gpu')
  .help('h').alias('h', 'help')
  .version(pkg.version)
  .strict()
const argv = process.env.ELECTRON_HAR_AS_NPM_MODULE
  ? yargs.argv
  : yargs.parse(process.argv.slice(1))

const url = argv._[0]
const [username, password] = argv.u ? argv.u.split(':').concat('') : [null, null]
const cookie = argv.b
const outputFile = argv.output
const timeout = parseInt(argv.m, 10)
const show = !!argv.show || !!argv.debug
let argvValidationError
if (!url) {
  argvValidationError = 'URL must be specified'
} else if (!/^(http|https):\/\//.test(url)) {
  argvValidationError = 'URL must contain the protocol prefix, e.g. https://'
}
if (argvValidationError) {
  yargs.showHelp()
  console.error(argvValidationError)
  // http://tldp.org/LDP/abs/html/exitcodes.html
  process.exit(3)
}

const electron = require('electron')
const {
  app,
  BrowserWindow,
  session
} = electron
const stringify = require('json-stable-stringify')
const cookieParse = require('cookie').parse
const fs = require('fs')
const path = require('path')

if (timeout > 0) {
  setTimeout(() => {
    console.error('Timed out waiting for page to load')
    show || app.exit(4)
  }, timeout * 1000)
}

if (argv['disable-gpu']) {
  app.disableHardwareAcceleration()
}
// https://github.com/electron/electron/blob/master/docs/api/chrome-command-line-switches.md
app.commandLine.appendSwitch('disable-http-cache')
app.dock && app.dock.hide()
app.on('window-all-closed', () => {
  app.quit()
})

electron.ipcMain
  .on('har-generation-succeeded', (sender, event) => {
    const har = stringify(event, {
      space: 2
    })
    if (outputFile) {
      fs.writeFile(outputFile, har, (err) => {
        if (err) {
          console.error(err.message)
          show || app.exit(5)
          return
        }
        show || app.quit()
      })
    } else {
      console.log(har)
      show || app.quit()
    }
  })
  .on('har-generation-failed', (sender, event) => {
    console.error('HAR generation failed: ' + event.errorCode +
      (event.errorDescription ? ' (' + event.errorDescription + ')' : '') +
      '\n(error codes defined in http://src.chromium.org/svn/trunk/src/net/base/net_error_list.h)')
    show || app.exit(event.errorCode)
  })

app.on('ready', () => {
  BrowserWindow.removeDevToolsExtension('devtools-extension')
  BrowserWindow.addDevToolsExtension(path.join(__dirname, 'devtools-extension'))

  const bw = new BrowserWindow({
    show: show,
    webPreferences: {
      // https://electronjs.org/docs/tutorial/security#2-disable-nodejs-integration-for-remote-content
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // https://electronjs.org/docs/tutorial/security#4-handle-session-permission-requests-from-remote-content
  session.defaultSession
    .setPermissionRequestHandler((webContents, permission, cb) => {
      cb(false) // eslint-disable-line standard/no-callback-literal
    })

  if (username) {
    bw.webContents.on('login', (event, request, authInfo, cb) => {
      event.preventDefault() // default behavior is to cancel auth
      cb(username, password)
    })
  }

  const cookies = cookie
    ? cookieParse(cookie)
    : {}

  const keys = Object.keys(cookies)
  if (keys.length) {
    let count = 0;
    keys.forEach((name) => {
      const cookieObj = {
        url: url,
        name: name,
        value: cookies[name]
      }
      bw.webContents.session.cookies.set(cookieObj, (err) => {
        if (err) {
          console.error(`Failed to set cookie ${JSON.stringify(cookieObj)} (${err.message})`)
          show || app.exit()
        }
        count++
        if (count === keys.length) {
          loadDevToolsAndUrl()
        }
      })
    })
  } else {
    loadDevToolsAndUrl()
  }

  function loadDevToolsAndUrl () {
    function notifyDevToolsExtensionOfLoad (e) {
      if (e.sender.getURL() !== 'https://ensure-electron-resolution/') {
        bw.webContents.executeJavaScript('new Image().src = "https://did-finish-load/"')
      }
    }

    // `204 page "pending"` workaround
    let hitContent = false
    // https://electronjs.org/docs/api/web-request#webrequestonheadersreceivedfilter-listener
    bw.webContents.session.webRequest.onHeadersReceived((req, cb) => {
      cb({ // eslint-disable-line standard/no-callback-literal
        cancel: false
      })
      if (hitContent) {
        return
      }
      hitContent = Math.trunc(req.statusCode / 100) !== 3 && req.statusCode !== 204
      if (req.statusCode === 204) {
        setTimeout(() => {
          bw.webContents.executeJavaScript('new Image().src = "https://did-finish-load/"')
        })
      }
    })

    // fired regardless of the outcome (success or not)
    bw.webContents.on('did-finish-load', notifyDevToolsExtensionOfLoad)

    bw.webContents.on('did-fail-load', (e, errorCode, errorDescription, url) => {
      if (url !== 'https://ensure-electron-resolution/' && url !== 'https://did-finish-load/') {
        bw.webContents.removeListener('did-finish-load', notifyDevToolsExtensionOfLoad)
        const e = JSON.stringify({ errorCode: errorCode, errorDescription: errorDescription })
        bw.webContents.executeJavaScript(`window.electronHAR.emit("har-generation-failed", ${e})`)
      }
    })

    electron.ipcMain.on('devtools-loaded', (event) => {
      setTimeout(() => {
        // bw.loadURL proved to be unreliable on Debian 8 (half of the time it has no effect)
        bw.webContents.executeJavaScript('location = ' + JSON.stringify(url))
      })
    })

    bw.openDevTools()

    // any url will do, but make sure to call loadURL before 'devtools-opened'.
    // otherwise require('electron') within child BrowserWindow will (most likely) fail
    bw.loadURL('https://ensure-electron-resolution/')
  }
})
