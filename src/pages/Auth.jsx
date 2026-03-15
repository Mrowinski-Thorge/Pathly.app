import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../AppContext'
import { supabase, turnstileSiteKey } from '../supabaseClient'
import './Auth.css'

// ─── Turnstile: ONE widget, ALWAYS mounted, visibility via CSS ───────────────
function useTurnstile(containerRef, onToken, onExpire, onError) {
  const widgetId = useRef(null)
  const rendered = useRef(false)

  const tryRender = useCallback(() => {
    if (rendered.current) return
    if (!window.turnstile) return
    if (!containerRef.current) return
    rendered.current = true
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: turnstileSiteKey,
      theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
      callback:           onToken,
      'expired-callback': onExpire,
      'error-callback':   onError,
    })
  }, [containerRef, onToken, onExpire, onError])

  useEffect(() => {
    let raf
    const poll = () => {
      if (window.turnstile && containerRef.current) { tryRender(); return }
      raf = requestAnimationFrame(poll)
    }
    poll()
    return () => cancelAnimationFrame(raf)
  }, [tryRender, containerRef])

  const updateTheme = useCallback((dark) => {
    if (widgetId.current === null || !window.turnstile) return
    try { window.turnstile.update(widgetId.current, { theme: dark ? 'dark' : 'light' }) }
    catch (_) { try { window.turnstile.reset(widgetId.current) } catch (__) {} }
  }, [])

  const resetWidget = useCallback(() => {
    if (widgetId.current === null || !window.turnstile) return
    try { window.turnstile.reset(widgetId.current) } catch (_) {}
  }, [])

  return { updateTheme, resetWidget }
}

// ─── Main Auth ────────────────────────────────────────────────────────────────
export default function Auth() {
  const { signUp, t } = useApp()

  // step: 'login' | 'login_captcha' | 'register' | 'register_captcha' | 'verify' | 'reset'
  const [step,     setStep]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState({ type: '', text: '' })
  const [terms,    setTerms]    = useState(false)
  const [isDark,   setIsDark]   = useState(() => document.body.classList.contains('dark-mode'))
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef(null)

  const [cooldown, setCooldown] = useState(0)
  const cooldownTimer = useRef(null)
  useEffect(() => () => clearInterval(cooldownTimer.current), [])

  const needsCaptcha = ['login_captcha', 'register_captcha', 'reset'].includes(step)

  const { updateTheme, resetWidget } = useTurnstile(
    captchaRef,
    (tok) => { setCaptchaToken(tok) },
    ()    => { setCaptchaToken('') },
    ()    => { setCaptchaToken(''); setMsg({ type: 'error', text: t.captchaFailed }) }
  )

  const softReset = useCallback(() => { setCaptchaToken(''); resetWidget() }, [resetWidget])

  const goTo = useCallback((s) => {
    setStep(s)
    setMsg({ type: '', text: '' })
    if (!['login_captcha', 'register_captcha', 'reset'].includes(s)) softReset()
  }, [softReset])

  const toggleTheme = () => {
    const dark = document.body.classList.toggle('dark-mode')
    setIsDark(dark)
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch (_) {}
    updateTheme(dark)
  }

  const startCooldown = () => {
    setCooldown(60)
    cooldownTimer.current = setInterval(() => {
      setCooldown(v => { if (v <= 1) { clearInterval(cooldownTimer.current); return 0 } return v - 1 })
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

  // ── Login step 1: email+pw → go captcha ──────────────────────────────────
  const handleLoginStep1 = (e) => { e.preventDefault(); goTo('login_captcha') }

  // ── Login step 2: captcha → sign in ──────────────────────────────────────
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

  // ── Register step 1: email+pw+terms → go captcha ─────────────────────────
  const handleRegisterStep1 = (e) => {
    e.preventDefault()
    if (!terms) return setMsg({ type: 'error', text: t.termsRequired })
    goTo('register_captcha')
  }

  // ── Register step 2: captcha → sign up ───────────────────────────────────
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    if (!captchaToken) return setMsg({ type: 'error', text: t.captchaRequired })
    setLoading(true); setMsg({ type: '', text: '' })
    const { error } = await signUp(email, password, captchaToken)
    if (error) { setMsg({ type: 'error', text: error.message }); softReset() }
    else { goTo('verify'); startCooldown() }
    setLoading(false)
  }

  // ── Password reset ────────────────────────────────────────────────────────
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

  // ── Resend verify ─────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (cooldown > 0 || !email) return
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (!error) { setMsg({ type: 'success', text: t.resendSuccess }); startCooldown() }
    else setMsg({ type: 'error', text: error.message })
  }

  // ── The captcha div is ALWAYS rendered (visibility toggle, never unmount) ─
  // Key insight: we wrap it in a portal-like outer div that stays in the React
  // tree at all times. We use visibility+height to hide it, not display:none,
  // which would collapse the iframe and break it.
  const captchaContainer = (
    <div style={{
      visibility: needsCaptcha ? 'visible' : 'hidden',
      height:     needsCaptcha ? 'auto'    : 0,
      overflow:   'hidden',
      marginBottom: needsCaptcha ? 14 : 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div ref={captchaRef} />
      {needsCaptcha && !captchaToken &&
        <p style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', marginTop: 6 }}>{t.captchaLoading}</p>
      }
    </div>
  )

  // ═══════════════════ VERIFY ══════════════════════════════════════════════
  if (step === 'verify') return (
    <div className="auth-page">
      <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
      {/* Keep captcha in DOM even on verify screen */}
      <div style={{ position: 'absolute', visibility: 'hidden', height: 0, overflow: 'hidden' }}>
        <div ref={captchaRef} />
      </div>
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

  // ═══════════════════ CAPTCHA STEP (login or register) ════════════════════
  if (step === 'login_captcha' || step === 'register_captcha') {
    const isLoginCaptcha = step === 'login_captcha'
    return (
      <div className="auth-page">
        <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
        <div className="auth-card card">
          <h1 className="auth-title">{t.appName}</h1>
          <p className="auth-sub">{t.captchaStepSubtitle}</p>
          {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
          <form onSubmit={isLoginCaptcha ? handleLoginSubmit : handleRegisterSubmit}>
            {captchaContainer}
            <button type="submit" className="btn btn-primary btn-full"
              disabled={loading || !captchaToken}>
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

  // ═══════════════════ RESET ═══════════════════════════════════════════════
  if (step === 'reset') return (
    <div className="auth-page">
      <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
      <div className="auth-card card">
        <h1 className="auth-title">{t.resetTitle}</h1>
        <p className="auth-sub">{t.resetSubtitle}</p>
        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <form onSubmit={handleReset}>
          <div className="form-group">
            <label className="form-label">{t.emailLabel}</label>
            <input type="email" className="form-input" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder} autoComplete="email" />
          </div>
          {captchaContainer}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? t.sending : t.sendReset}
          </button>
        </form>
        <div className="auth-footer">
          <button className="link-btn" onClick={() => goTo('login')}>{t.backToLogin}</button>
        </div>
      </div>
    </div>
  )

  // ═══════════════════ LOGIN / REGISTER ════════════════════════════════════
  // IMPORTANT: captchaContainer must stay in DOM even here (but hidden)
  const isLogin = step === 'login'
  return (
    <div className="auth-page">
      <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
      {/* Hidden captcha container – keeps the widget alive across step changes */}
      {captchaContainer}

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
              <button type="button" className="link-btn-sm" onClick={() => goTo('reset')}>
                {t.forgotPassword}
              </button>
            </div>
          )}

          {!isLogin && (
            <label className="terms-row">
              <input type="checkbox" checked={terms}
                onChange={e => setTerms(e.target.checked)} />
              <span>{t.acceptTerms}{' '}
                <a href="https://mrowinski-thorge.github.io/Pathly.com/nutzungsbedingungen"
                  target="_blank" rel="noopener noreferrer" className="terms-link">
                  {t.termsLink}
                </a>
              </span>
            </label>
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
