beforeAll(function () {
  // For some reason, Karma doesn't capture errors thrown by the browser. They
  // show up in the browser, but not in the terminal. This is a workaround.
  window.addEventListener('error', function (event) {
    throw event.error
  })

  window.addEventListener('unhandledrejection', function (event) {
    throw event.reason
  })
})
