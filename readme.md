# electron-har

A command-line tool for generating [HTTP Archive (HAR)](http://www.softwareishard.com/blog/har-12-spec/) (based on [Electron](http://electron.atom.io/)).

The data you get is identical to "Save All as HAR" from the Network pane of Developer Tools in Chromium.

## Installation

```sh
npm install -g electron-har
```

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
