import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../AppContext'
import { supabase, turnstileSiteKey } from '../supabaseClient'
import './Auth.css'

// ─── Invisible Turnstile ──────────────────────────────────────────────────────
// Widget wird einmalig beim Laden gerendert (unsichtbar, kein Klick nötig).
// Token wird automatisch nach wenigen Sekunden geliefert.
// Nach jeder Nutzung via reset() neues Token holen.

let _widgetId  = null
let _rendered  = false
let _callbacks = { onToken: null, onExpire: null, onError: null }

function initTurnstile(container) {
  if (_rendered || !window.turnstile || !container) return
  _rendered = true
  _widgetId = window.turnstile.render(container, {
    sitekey:  turnstileSiteKey,
    size:     'invisible',            // ← unsichtbar
    callback:           (tok) => _callbacks.onToken?.(tok),
    'expired-callback': ()    => _callbacks.onExpire?.(),
    'error-callback':   ()    => _callbacks.onError?.(),
  })
}

function resetTurnstile() {
  if (!window.turnstile || _widgetId === null) return
  try { window.turnstile.reset(_widgetId) } catch (_) {}
}

// ─── Hook: liefert Token-Promise ─────────────────────────────────────────────
function useCaptchaToken() {
  const getToken = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!window.turnstile) { reject(new Error('Turnstile not loaded')); return }
      _callbacks.onToken  = (tok) => { resolve(tok) }
      _callbacks.onError  = ()    => { reject(new Error('captcha_error')) }
      _callbacks.onExpire = ()    => { reject(new Error('captcha_expired')) }
      resetTurnstile()
      // execute() triggert den invisible widget sofort
      try { window.turnstile.execute(_widgetId) } catch (e) {
        // Falls execute nicht nötig ist (auto-execute), Token kommt trotzdem
      }
    })
  }, [])
  return getToken
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function Auth() {
  const { signUp, t } = useApp()

  // step: 'login' | 'register' | 'verify' | 'reset_email'
  const [step,     setStep]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState({ type: '', text: '' })
  const [isDark,   setIsDark]   = useState(() => document.body.classList.contains('dark-mode'))
  const [cooldown, setCooldown] = useState(0)

  const containerRef = useRef(null)
  const cooldownRef  = useRef(null)
  const getCaptchaToken = useCaptchaToken()

  // Turnstile beim ersten Render initialisieren
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.turnstile && containerRef.current) {
        initTurnstile(containerRef.current)
        clearInterval(interval)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => () => clearInterval(cooldownRef.current), [])

  const goTo = (s) => { setStep(s); setMsg({ type: '', text: '' }) }

  const toggleTheme = () => {
    const dark = document.body.classList.toggle('dark-mode')
    setIsDark(dark)
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch (_) {}
    // Theme-Update beim invisible widget nicht nötig
  }

  const startCooldown = () => {
    setCooldown(60)
    cooldownRef.current = setInterval(() => {
      setCooldown(v => { if (v <= 1) { clearInterval(cooldownRef.current); return 0 } return v - 1 })
    }, 1000)
  }

  // ── Captcha holen (mit Fehlerbehandlung) ──────────────────────────────────
  const withCaptcha = async (fn) => {
    setLoading(true); setMsg({ type: '', text: '' })
    let token
    try {
      token = await getCaptchaToken()
    } catch (e) {
      setMsg({ type: 'error', text: t.captchaFailed })
      setLoading(false)
      return
    }
    await fn(token)
    setLoading(false)
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setMsg({ type: '', text: '' })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://mrowinski-thorge.github.io/Pathly.app/',
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) setMsg({ type: 'error', text: error.message })
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = (e) => {
    e.preventDefault()
    withCaptcha(async (token) => {
      const { error } = await supabase.auth.signInWithPassword({
        email, password, options: { captchaToken: token },
      })
      if (error) setMsg({ type: 'error', text: error.message })
      // Erfolg → AppContext SIGNED_IN → App.jsx redirect
    })
  }

  // ── Registrierung ─────────────────────────────────────────────────────────
  const handleRegister = (e) => {
    e.preventDefault()
    withCaptcha(async (token) => {
      const { error } = await signUp(email, password, token)
      if (error) setMsg({ type: 'error', text: error.message })
      else { goTo('verify'); startCooldown() }
    })
  }

  // ── Passwort zurücksetzen ─────────────────────────────────────────────────
  const handleResetStep1 = (e) => { e.preventDefault(); goTo('reset_captcha') }

  const handleReset = (e) => {
    e.preventDefault()
    withCaptcha(async (token) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://mrowinski-thorge.github.io/Pathly.app/auth',
        options: { captchaToken: token },
      })
      if (error) setMsg({ type: 'error', text: error.message })
      else setMsg({ type: 'success', text: t.resetSuccess })
    })
  }

  // ── E-Mail erneut senden ──────────────────────────────────────────────────
  const handleResend = async () => {
    if (cooldown > 0 || !email) return
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (!error) { setMsg({ type: 'success', text: t.resendSuccess }); startCooldown() }
    else setMsg({ type: 'error', text: error.message })
  }

  // ── Invisible Turnstile Container (immer im DOM) ──────────────────────────
  const turnstileEl = (
    <div
      ref={containerRef}
      style={{ position: 'fixed', bottom: 0, right: 0, zIndex: -1, opacity: 0, pointerEvents: 'none' }}
    />
  )

  // ═══════════════════ VERIFY ══════════════════════════════════════════════
  if (step === 'verify') return (
    <div className="auth-page">
      {turnstileEl}
      <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
      <div className="auth-card card">
        <div className="verify-emoji">✉️</div>
        <h1 className="auth-title">{t.verifyTitle}</h1>
        <p className="auth-body">{t.verifyText}</p>
        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <button className="btn btn-outline btn-full"
          onClick={handleResend} disabled={cooldown > 0} style={{ marginBottom: 10 }}>
          {cooldown > 0 ? `${t.resendIn} ${cooldown}s` : t.resendEmail}
        </button>
        <button className="btn btn-primary btn-full" onClick={() => goTo('login')}>
          {t.backToLogin}
        </button>
      </div>
    </div>
  )

  // ═══════════════════ RESET SCHRITT 1: E-Mail ═════════════════════════════
  if (step === 'reset_email') return (
    <div className="auth-page">
      {turnstileEl}
      <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
      <div className="auth-card card">
        <h1 className="auth-title">{t.resetTitle}</h1>
        <p className="auth-sub">{t.resetSubtitle}</p>
        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <form onSubmit={handleResetStep1}>
          <div className="form-group">
            <label className="form-label">{t.emailLabel}</label>
            <input type="email" className="form-input" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder} autoComplete="email" />
          </div>
          <button type="submit" className="btn btn-primary btn-full">
            {t.nextBtn}
          </button>
        </form>
        <div className="auth-footer">
          <button className="link-btn" onClick={() => goTo('login')}>{t.backToLogin}</button>
        </div>
      </div>
    </div>
  )

  // ═══════════════════ RESET SCHRITT 2: Captcha + Senden ═══════════════════
  if (step === 'reset_captcha') return (
    <div className="auth-page">
      {turnstileEl}
      <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
      <div className="auth-card card">
        <h1 className="auth-title">{t.resetTitle}</h1>
        <p className="auth-sub">{t.resetSendingSubtitle}</p>
        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <form onSubmit={handleReset}>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? t.sending : t.sendReset}
          </button>
        </form>
        <div className="auth-footer">
          <button className="link-btn" onClick={() => goTo('reset_email')}>{t.back}</button>
        </div>
      </div>
    </div>
  )

  // ═══════════════════ LOGIN / REGISTRIERUNG ════════════════════════════════
  const isLogin = step === 'login'
  return (
    <div className="auth-page">
      {turnstileEl}
      <ThemeBtn isDark={isDark} onToggle={toggleTheme} />

      <div className="auth-card card">
        <h1 className="auth-title">{t.appName}</h1>
        <p className="auth-sub">{isLogin ? t.welcomeBack : t.createAccount}</p>
        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          <div className="form-group">
            <label className="form-label">{t.emailLabel}</label>
            <input type="email" className="form-input" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder} autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label">{t.passwordLabel}</label>
            <input type="password" className="form-input" required minLength={6}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              autoComplete={isLogin ? 'current-password' : 'new-password'} />
          </div>

          {isLogin && (
            <div className="forgot-row">
              <button type="button" className="link-btn-sm" onClick={() => goTo('reset_email')}>
                {t.forgotPassword}
              </button>
            </div>
          )}

          {!isLogin && (
            <p className="terms-hint">
              {t.termsHint}{' '}
              <a href="https://mrowinski-thorge.github.io/Pathly.com/nutzungsbedingungen"
                target="_blank" rel="noopener noreferrer" className="terms-link">
                {t.termsLink}
              </a>{t.termsHintEnd}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? t.loadingText : isLogin ? t.loginBtn : t.registerBtn}
          </button>
        </form>

        <div className="auth-divider"><span>{t.orDivider}</span></div>
        <button className="btn btn-google btn-full" onClick={handleGoogle} type="button">
          <GoogleIcon />
          {isLogin ? t.signInWithGoogle : t.signUpWithGoogle}
        </button>

        <div className="auth-footer">
          <button className="link-btn" onClick={() => goTo(isLogin ? 'register' : 'login')}>
            {isLogin ? t.noAccount : t.hasAccount}
          </button>
        </div>
      </div>
    </div>
  )
}

function ThemeBtn({ isDark, onToggle }) {
  return (
    <button className="theme-toggle-btn" onClick={onToggle} aria-label="Theme">
      {isDark
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
      }
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
