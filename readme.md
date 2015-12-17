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

## License

[MIT License](https://github.com/shyiko/electron-har/blob/master/mit.license)
