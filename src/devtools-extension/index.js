var LOAD_INDICATOR = 'https://did-finish-load/';

chrome.devtools.network.onRequestFinished.addListener(function (request) {
  if (request.request.url === LOAD_INDICATOR) {
    chrome.devtools.network.getHAR(function (har) {
      har.entries = har.entries.filter(function (e) {
        return e.request.url !== LOAD_INDICATOR;
      });
      chrome.devtools.inspectedWindow.eval(
        'require("electron").ipcRenderer.send("har-generation-succeeded", ' + JSON.stringify(har) + ');');
    });
  }
});

chrome.devtools.inspectedWindow.eval('require("electron").ipcRenderer.send("devtools-loaded");');
