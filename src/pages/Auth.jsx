import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../AppContext'
import { supabase, turnstileSiteKey } from '../supabaseClient'
import './Auth.css'

// ─── Der Captcha-Container lebt IMMER im DOM (niemals unmounten) ──────────────
// Wir rendern das Widget einmalig beim ersten Mount und nutzen
// visibility/height zum Ein-/Ausblenden. Kein display:none, kein Unmount.
// Theme-Wechsel via turnstile.update() – kein Neu-Rendern.

let globalWidgetId = null        // widget ID (einmalig)
let globalRendered  = false      // wurde schon gerendert?

function renderTurnstile(container, { onToken, onExpire, onError }) {
  if (globalRendered) return
  if (!window.turnstile) return
  if (!container) return
  globalRendered = true
  globalWidgetId = window.turnstile.render(container, {
    sitekey: turnstileSiteKey,
    theme:   document.body.classList.contains('dark-mode') ? 'dark' : 'light',
    callback:           onToken,
    'expired-callback': onExpire,
    'error-callback':   onError,
    size: 'normal',
  })
}

function resetTurnstile() {
  if (!window.turnstile || globalWidgetId === null) return
  try { window.turnstile.reset(globalWidgetId) } catch (_) {}
}

function updateTurnstileTheme(dark) {
  if (!window.turnstile || globalWidgetId === null) return
  try { window.turnstile.update(globalWidgetId, { theme: dark ? 'dark' : 'light' }) }
  catch (_) { resetTurnstile() }
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export default function Auth() {
  const { signUp, t } = useApp()

  // step: 'login' | 'login_captcha' | 'register' | 'register_captcha' | 'verify' | 'reset'
  const [step,         setStep]         = useState('login')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [loading,      setLoading]      = useState(false)
  const [msg,          setMsg]          = useState({ type: '', text: '' })
  const [isDark,       setIsDark]       = useState(() => document.body.classList.contains('dark-mode'))
  const [captchaToken, setCaptchaToken] = useState('')
  const [cooldown,     setCooldown]     = useState(0)

  const captchaRef   = useRef(null)   // DOM-Ref für das Captcha-Element
  const cooldownRef  = useRef(null)

  // Captcha-Callbacks (stabil via useCallback)
  const onToken  = useCallback((tok) => setCaptchaToken(tok), [])
  const onExpire = useCallback(()    => setCaptchaToken(''),  [])
  const onError  = useCallback(()    => {
    setCaptchaToken('')
    setMsg({ type: 'error', text: t.captchaFailed })
  }, [t])

  // ── Einmaliges Captcha-Rendering beim ersten Mount ────────────────────────
  // Wir nutzen einen Interval der alle 100ms prüft ob:
  // a) window.turnstile verfügbar ist
  // b) captchaRef.current im DOM ist
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.turnstile && captchaRef.current) {
        renderTurnstile(captchaRef.current, { onToken, onExpire, onError })
        clearInterval(interval)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [onToken, onExpire, onError])

  useEffect(() => () => clearInterval(cooldownRef.current), [])

  const needsCaptcha = ['login_captcha', 'register_captcha', 'reset'].includes(step)

  const softReset = () => { setCaptchaToken(''); resetTurnstile() }

  const goTo = (s) => {
    setStep(s)
    setMsg({ type: '', text: '' })
    if (!['login_captcha', 'register_captcha', 'reset'].includes(s)) softReset()
  }

  const toggleTheme = () => {
    const dark = document.body.classList.toggle('dark-mode')
    setIsDark(dark)
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch (_) {}
    updateTurnstileTheme(dark)
  }

  const startCooldown = () => {
    setCooldown(60)
    cooldownRef.current = setInterval(() => {
      setCooldown(v => { if (v <= 1) { clearInterval(cooldownRef.current); return 0 } return v - 1 })
    }, 1000)
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

  // ── Login Schritt 1: E-Mail + Passwort prüfen, dann → Captcha ────────────
  const handleLoginStep1 = async (e) => {
    e.preventDefault()
    setLoading(true); setMsg({ type: '', text: '' })
    // Erst prüfen ob die Credentials prinzipiell stimmen (ohne captcha)
    // Supabase erlaubt signInWithPassword ohne captcha wenn kein Protection aktiviert ist
    // Wir wechseln einfach zum Captcha-Step, da Passwort dort mit Token abgesendet wird
    setLoading(false)
    goTo('login_captcha')
  }

  // ── Login Schritt 2: Captcha gelöst → Anmelden ────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    if (!captchaToken) return setMsg({ type: 'error', text: t.captchaRequired })
    setLoading(true); setMsg({ type: '', text: '' })
    const { error } = await supabase.auth.signInWithPassword({
      email, password, options: { captchaToken },
    })
    if (error) { setMsg({ type: 'error', text: error.message }); softReset() }
    setLoading(false)
  }

  // ── Registrierung Schritt 1: E-Mail + Passwort → Captcha ─────────────────
  // Nutzungsbedingungen sind durch Absenden akzeptiert (kein Checkbox)
  const handleRegisterStep1 = (e) => {
    e.preventDefault()
    goTo('register_captcha')
  }

  // ── Registrierung Schritt 2: Captcha → Account erstellen ─────────────────
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    if (!captchaToken) return setMsg({ type: 'error', text: t.captchaRequired })
    setLoading(true); setMsg({ type: '', text: '' })
    const { error } = await signUp(email, password, captchaToken)
    if (error) { setMsg({ type: 'error', text: error.message }); softReset() }
    else { goTo('verify'); startCooldown() }
    setLoading(false)
  }

  // ── Passwort zurücksetzen Schritt 1: E-Mail eingeben ─────────────────────
  const handleResetStep1 = (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    goTo('reset')
  }

  // ── Passwort zurücksetzen Schritt 2: Captcha → Link senden ───────────────
  const handleReset = async (e) => {
    e.preventDefault()
    if (!captchaToken) return setMsg({ type: 'error', text: t.captchaRequired })
    setLoading(true); setMsg({ type: '', text: '' })
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://mrowinski-thorge.github.io/Pathly.app/auth',
      options: { captchaToken },
    })
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: t.resetSuccess })
    softReset(); setLoading(false)
  }

  // ── E-Mail erneut senden ──────────────────────────────────────────────────
  const handleResend = async () => {
    if (cooldown > 0 || !email) return
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (!error) { setMsg({ type: 'success', text: t.resendSuccess }); startCooldown() }
    else setMsg({ type: 'error', text: error.message })
  }

  // ── DAS CAPTCHA-ELEMENT: immer im DOM, nur sichtbar wenn needsCaptcha ─────
  // Trick: wir rendern es als absolut positioniertes Element außerhalb des
  // sichtbaren Bereichs wenn nicht aktiv – damit das iframe niemals destroyt wird
  const captchaEl = (
    <div
      ref={captchaRef}
      style={needsCaptcha ? {
        margin: '0 auto 14px',
        display: 'flex',
        justifyContent: 'center',
      } : {
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        pointerEvents: 'none',
      }}
    />
  )

  // ═══════════════════ VERIFY ══════════════════════════════════════════════
  if (step === 'verify') return (
    <div className="auth-page">
      {captchaEl}
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

  // ═══════════════════ CAPTCHA-SCHRITT (Login oder Registrierung) ═══════════
  if (step === 'login_captcha' || step === 'register_captcha') {
    const isLoginCaptcha = step === 'login_captcha'
    return (
      <div className="auth-page">
        {captchaEl}
        <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
        <div className="auth-card card">
          <h1 className="auth-title">{t.appName}</h1>
          <p className="auth-sub">{t.captchaStepSubtitle}</p>
          {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
          <form onSubmit={isLoginCaptcha ? handleLoginSubmit : handleRegisterSubmit}>
            <button type="submit" className="btn btn-primary btn-full"
              disabled={loading || !captchaToken} style={{ marginTop: 8 }}>
              {loading ? t.loadingText : isLoginCaptcha ? t.loginBtn : t.registerBtn}
            </button>
          </form>
          <div className="auth-footer">
            <button className="link-btn"
              onClick={() => goTo(isLoginCaptcha ? 'login' : 'register')}>
              {t.back}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════ RESET SCHRITT 1: E-Mail eingeben ════════════════════
  if (step === 'reset_email') return (
    <div className="auth-page">
      {captchaEl}
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

  // ═══════════════════ RESET SCHRITT 2: Captcha ════════════════════════════
  if (step === 'reset') return (
    <div className="auth-page">
      {captchaEl}
      <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
      <div className="auth-card card">
        <h1 className="auth-title">{t.resetTitle}</h1>
        <p className="auth-sub">{t.captchaStepSubtitle}</p>
        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <form onSubmit={handleReset}>
          <button type="submit" className="btn btn-primary btn-full"
            disabled={loading || !captchaToken} style={{ marginTop: 8 }}>
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
      {captchaEl}
      <ThemeBtn isDark={isDark} onToggle={toggleTheme} />

      <div className="auth-card card">
        <h1 className="auth-title">{t.appName}</h1>
        <p className="auth-sub">{isLogin ? t.welcomeBack : t.createAccount}</p>
        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        <form onSubmit={isLogin ? handleLoginStep1 : handleRegisterStep1}>
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

          {/* Registrierung: Nutzungsbedingungen als Hinweis-Text, kein Checkbox */}
          {!isLogin && (
            <p className="terms-hint">
              {t.termsHint}{' '}
              <a href="https://mrowinski-thorge.github.io/Pathly.com/nutzungsbedingungen"
                target="_blank" rel="noopener noreferrer" className="terms-link">
                {t.termsLink}
              </a>
              {t.termsHintEnd}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? t.loadingText : t.nextBtn}
          </button>
        </form>

        <div className="auth-divider"><span>{t.orDivider}</span></div>
        <button className="btn btn-google btn-full" onClick={handleGoogle} type="button">
          <GoogleIcon />
          {isLogin ? t.signInWithGoogle : t.signUpWithGoogle}
        </button>

        <div className="auth-footer">
          <button className="link-btn"
            onClick={() => goTo(isLogin ? 'register' : 'login')}>
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
