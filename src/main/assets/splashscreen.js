/* eslint-disable no-undef */

window.electronApi.onInitSplashScreenWindow((info) => {
  document.getElementById('copyright').innerText = info.copyright
  document.getElementById('version').innerText = info.version
})
