/*!
 * Critwire embed loader, contract v1. Docs: docs/embed.md in the Critwire repository.
 *
 * <script src="https://<instance>/embed/v1.js" data-game="<slug>" data-widget="board" data-theme="auto" async></script>
 *
 * Studios paste this URL into their sites and browsers cache it, so it's a
 * contract: v1 may only gain optional attributes and message types.
 * Anything incompatible ships as /embed/v2.js, and v1 keeps working.
 *
 * It frames one widget right after its own script tag, sizes the frame to
 * the widget's content, and passes on the theme mode and the font its own
 * frame inherits from the page. The button widget instead adds a floating
 * "Feedback" button that opens the board in a dialog. It keeps no state in the browser, makes no
 * requests of its own, reads nothing else from the page, and leaves no
 * globals behind. Plain ES2017, with no build step.
 */
;(function () {
  'use strict'

  var TITLES = { board: 'Feedback', updates: 'Updates', button: 'Feedback' }
  var MAX_HEIGHT = 20000
  // The button and its dialog sit on the host page, outside the game's theme, so they're neutral:
  // cw neutral-1/neutral-10 per mode (src/lib/theme/cw.ts). The pill is cw's xl radius, padded by
  // its l space; the grey edge keeps it visible on any host colour.
  var COLOURS = { light: ['#ffffff', '#000000'], dark: ['#000000', '#ffffff'] }
  var PILL =
    'min-height:44px;padding:0 19px;border:1px solid rgba(128,128,128,.4);border-radius:22px;font:inherit;cursor:pointer;'

  var script = document.currentScript
  var data = script ? script.dataset : {}
  var widget = data.widget || 'board'
  // Fail loud in the console, but never break the page.
  if (!data.game) {
    console.error('critwire: the embed script needs a data-game attribute (see docs/embed.md).')
    return
  }
  if (!Object.prototype.hasOwnProperty.call(TITLES, widget)) {
    console.error('critwire: unknown data-widget "' + widget + '"; use board, updates or button.')
    return
  }

  var origin = new URL(script.src).origin
  var theme = data.theme || 'auto'

  // The query holds only the snippet's own values, so one snippet is one
  // cacheable URL. The font goes in the fragment, which never reaches the server.
  var query = new URLSearchParams({ theme: theme })
  if (data.stage) query.set('stage', data.stage)
  if (data.type) query.set('type', data.type)

  var frame = null
  var dialog = null

  // Frames the widget inside `parent`, before `next`, at `height`.
  function addFrame(parent, next, height) {
    frame = document.createElement('iframe')
    frame.title = TITLES[widget]
    frame.loading = 'lazy'
    frame.style.cssText = 'display:block;width:100%;border:0;height:' + height
    parent.insertBefore(frame, next)
    // What `font-family: inherit` gives the frame where it sits.
    var font = getComputedStyle(frame).fontFamily
    frame.src =
      origin +
      '/g/' +
      encodeURIComponent(data.game) +
      '/embed/' +
      (widget === 'updates' ? 'updates' : 'board') +
      '?' +
      query +
      '#font=' +
      encodeURIComponent(font)
  }

  if (widget === 'button') {
    var button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Feedback'
    button.style.cssText =
      PILL + 'position:fixed;right:16px;bottom:16px;z-index:2147483000'
    script.parentNode.insertBefore(button, script.nextSibling)

    // `auto` follows the visitor's setting, as the board does; anything else unknown counts as auto.
    var system = matchMedia('(prefers-color-scheme: dark)')
    var paint = function () {
      var colours = COLOURS[theme === 'dark' || (theme !== 'light' && system.matches) ? 'dark' : 'light']
      ;[button, dialog].forEach(function (element) {
        if (!element) return
        element.style.background = colours[0]
        element.style.color = colours[1]
      })
    }
    system.addEventListener('change', paint)
    paint()

    button.addEventListener('click', function () {
      if (!dialog) {
        dialog = document.createElement('dialog')
        dialog.setAttribute('aria-label', 'Feedback')
        dialog.style.cssText =
          'width:min(720px,calc(100vw - 32px));max-width:none;max-height:none;box-sizing:border-box;padding:19px;border:0;border-radius:7px'
        var close = document.createElement('button')
        close.type = 'button'
        close.textContent = 'Close'
        close.style.cssText = PILL + 'display:block;margin:0 0 9px auto;background:transparent;color:inherit'
        close.addEventListener('click', function () {
          dialog.close()
        })
        dialog.appendChild(close)
        // Focus returns to the button however the dialog closes, in every browser.
        dialog.addEventListener('close', function () {
          button.focus()
        })
        button.parentNode.insertBefore(dialog, button.nextSibling)
        addFrame(dialog, null, 'min(80vh,720px)')
        paint()
      }
      dialog.showModal()
    })
  } else {
    addFrame(script.parentNode, script.nextSibling, '400px')
  }

  // Protocol v1: only messages from this frame, from the instance's origin.
  window.addEventListener('message', function (event) {
    var message = event.data
    if (!frame || event.source !== frame.contentWindow || event.origin !== origin) return
    if (!message || message.critwire !== 1) return
    // The dialog's frame keeps its fixed height and scrolls.
    if (message.type === 'resize' && !dialog && Number.isFinite(message.height)) {
      frame.style.height = Math.min(Math.max(Math.ceil(message.height), 0), MAX_HEIGHT) + 'px'
    }
    if (message.type === 'close' && dialog) dialog.close()
  })
})()
