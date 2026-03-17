import { turnstileSiteKey } from './supabaseClient'

// ── Globaler Turnstile-Singleton ─────────────────────────────────────────────
// Einmal initialisiert, überall verfügbar (Auth + Settings-Passwortprüfung)
let _widgetId     = null
let _rendered     = false
let _pendingToken = null   // gecachter Token bis zur nächsten Nutzung
let _callbacks    = { onToken: null, onExpire: null, onError: null }

export function initTurnstile(container) {
  if (_rendered || !window.turnstile || !container) return
  _rendered = true
  _widgetId = window.turnstile.render(container, {
    sitekey:  turnstileSiteKey,
    size:     'invisible',
    callback: (tok) => {
      _pendingToken = tok
      _callbacks.onToken?.(tok)
    },
    'expired-callback': () => {
      _pendingToken = null
      _callbacks.onExpire?.()
    },
    'error-callback': () => {
      _pendingToken = null
      _callbacks.onError?.()
    },
  })
  // Sofort pre-execute damit Token bei erstem Klick bereits fertig ist
  setTimeout(() => {
    try { window.turnstile.execute(_widgetId) } catch (_) {}
  }, 100)
}

function _reset() {
  _pendingToken = null
  if (!window.turnstile || _widgetId === null) return
  try {
    window.turnstile.reset(_widgetId)
    // Nach reset sofort neuen Token holen
    setTimeout(() => {
      try { window.turnstile.execute(_widgetId) } catch (_) {}
    }, 300)
  } catch (_) {}
}

/** Gibt einen frischen Captcha-Token zurück.
 *  Wenn bereits einer gecacht ist, wird dieser sofort geliefert (fast path). */
export function getCaptchaToken() {
  return new Promise((resolve, reject) => {
    // Fast path: gecachter Token
    if (_pendingToken) {
      const tok = _pendingToken
      _pendingToken = null
      resolve(tok)
      // Nächsten Token vorab holen
      _reset()
      return
    }

    if (!window.turnstile || _widgetId === null) {
      reject(new Error('Turnstile not ready'))
      return
    }

    _callbacks.onToken  = (tok) => { _pendingToken = null; resolve(tok) }
    _callbacks.onError  = ()    => { reject(new Error('captcha_error')) }
    _callbacks.onExpire = ()    => { reject(new Error('captcha_expired')) }

    try { window.turnstile.execute(_widgetId) } catch (_) {}
  })
}
