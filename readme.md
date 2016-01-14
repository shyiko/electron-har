# electron-har

A command-line tool for generating [HTTP Archive (HAR)](http://www.softwareishard.com/blog/har-12-spec/) (based on [Electron](http://electron.atom.io/)).

The data you get is identical to "Chromium -> Developer Tools -> Network pane -> Save All as HAR".

## Installation

Prebuilt binaries can be found on the [release(s)](https://github.com/shyiko/electron-har/releases) page.

You can also use [npm](https://www.npmjs.com/):

```sh
npm install -g electron-har
```

> In order for Electron to work on Debian/Ubuntu (specifically on Debian 8/Ubuntu 12.04)
following packages have to be installed `libgtk2.0-0 libgconf-2-4 libasound2 libxtst6 libxss1 libnss3`.

## Usage

```sh
electron-har http://google.com # writes HAR to stdout

# in a headless environment (CI agent on Linux?) - xvfb-run will do just fine 
DISPLAY=:1 xvfb-run electron-har http://google.com -o google_com.har

# to see a complete list of command line options
electron-har --help
```

... or **pragmatically**

```js
var electronHAR = require('electron-har');

electronHAR('http://enterprise.com/self-destruct', {
  user: {
    name: 'jean_luc_picard',
    password: 'picard_4_7_alpha_tango'
  }
}, function (err, json) {
  if (err) {
    throw err;
  }
  console.log(json.log.entries);
});
```

In a headless environment you might want to use [kesla/headless](https://github.com/kesla/node-headless) (which will start Xvfb for you). 

```js
var headless = require('headless');
var electronHAR = require('electron-har');

(function (cb) {
  if (!process.env.DISPLAY) {
    headless(function (err, proc, display) {
      if (err) {
        return cb(err);
      }
      process.env.DISPLAY = ':' + display;
      cb(null, proc);
    })
  } else {
    process.nextTick(cb);
  }
})(function (err, xvfb) {
  if (err) {
    throw err;
  }
  electronHAR(..., function (err, json) {
    ...
    xvfb && xvfb.kill();
  })
});
```

## License

[MIT License](https://github.com/shyiko/electron-har/blob/master/mit.license)
