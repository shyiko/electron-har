window.electronHAR =
  (({ ipcRenderer }) => ({
    emit (eventName, eventPayload) {
      ipcRenderer.send(eventName, eventPayload)
    }
  }))(require('electron'))
