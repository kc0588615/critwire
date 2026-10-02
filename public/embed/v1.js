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
 * frame inherits from the page. It keeps no state in the browser, makes no
 * requests of its own, reads nothing else from the page, and leaves no
 * globals behind. Plain ES2017, with no build step.
 */
;(function () {
  'use strict'

  var TITLES = { board: 'Feedback', updates: 'Updates' }
  var MAX_HEIGHT = 20000

  var script = document.currentScript
  var data = script ? script.dataset : {}
  var widget = data.widget || 'board'
  // Fail loud in the console, but never break the page.
  if (!data.game) {
    console.error('critwire: the embed script needs a data-game attribute (see docs/embed.md).')
    return
  }
  if (!Object.prototype.hasOwnProperty.call(TITLES, widget)) {
    console.error('critwire: unknown data-widget "' + widget + '"; use board or updates.')
    return
  }

  var origin = new URL(script.src).origin

  // The query holds only the snippet's own values, so one snippet is one
  // cacheable URL. The font goes in the fragment, which never reaches the server.
  var query = new URLSearchParams({ theme: data.theme || 'auto' })
  if (data.stage) query.set('stage', data.stage)
  if (data.type) query.set('type', data.type)

  var frame = document.createElement('iframe')
  frame.title = TITLES[widget]
  frame.loading = 'lazy'
  frame.style.cssText = 'display:block;width:100%;height:400px;border:0'
  script.parentNode.insertBefore(frame, script.nextSibling)
  // What `font-family: inherit` gives the frame where it sits.
  var font = getComputedStyle(frame).fontFamily
  frame.src =
    origin +
    '/g/' +
    encodeURIComponent(data.game) +
    '/embed/' +
    widget +
    '?' +
    query +
    '#font=' +
    encodeURIComponent(font)

  // Protocol v1: only messages from this frame, from the instance's origin.
  window.addEventListener('message', function (event) {
    var message = event.data
    if (event.source !== frame.contentWindow || event.origin !== origin) return
    if (!message || message.critwire !== 1) return
    if (message.type === 'resize' && Number.isFinite(message.height)) {
      frame.style.height = Math.min(Math.max(Math.ceil(message.height), 0), MAX_HEIGHT) + 'px'
    }
  })
})()
