const DID_FINISH_LOAD = 'https://did-finish-load/'

chrome.devtools.network.onRequestFinished.addListener((e) => {
  if (e.request.url === DID_FINISH_LOAD) {
    chrome.devtools.network.getHAR((har) => {
      har.entries = har.entries.filter((e) => e.request.url !== DID_FINISH_LOAD)
      const e = JSON.stringify({
        log: har
      })
      chrome.devtools.inspectedWindow.eval(
        `window.electronHAR.emit("har-generation-succeeded", ${e})`
      )
    })
  }
})

chrome.devtools.inspectedWindow.eval(
  'window.electronHAR.emit("devtools-loaded")'
)

console.log('Electron HAR DevTools Extension loaded')
