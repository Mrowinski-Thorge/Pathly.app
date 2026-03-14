import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../AppContext'
import { supabase, turnstileSiteKey } from '../supabaseClient'
import './Auth.css'

export default function Auth() {
  const { signIn, signUp, t } = useApp()
  const [mode, setMode]           = useState('login') // login | register | reset | verify
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState({ type: '', text: '' })
  const [terms, setTerms]         = useState(false)
  const [captchaToken, setToken]  = useState('')
  const [widgetReady, setReady]   = useState(false)

  const containerRef = useRef(null)
  const widgetIdRef  = useRef(null)

  const isDark = () => document.body.classList.contains('dark-mode')

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current) return
    if (widgetIdRef.current !== null) {
      try { window.turnstile.remove(widgetIdRef.current) } catch (_) {}
      widgetIdRef.current = null
    }
    containerRef.current.innerHTML = ''
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: turnstileSiteKey,
      theme: isDark() ? 'dark' : 'light',
      callback: (tok) => setToken(tok),
      'expired-callback': () => setToken(''),
      'error-callback': () => { setToken(''); setMsg({ type: 'error', text: t.captchaFailed }) },
    })
    setReady(true)
  }, []) // eslint-disable-line

  useEffect(() => {
    if (mode === 'verify') return
    let raf
    const try_ = () => { if (window.turnstile) { renderWidget(); return } raf = requestAnimationFrame(try_) }
    try_()
    return () => cancelAnimationFrame(raf)
  }, [renderWidget, mode])

  useEffect(() => {
    if (mode === 'verify') return
    setToken(''); setReady(false)
    if (window.turnstile) renderWidget()
  }, [mode]) // eslint-disable-line

  const resetCaptcha = () => {
    setToken('')
    if (window.turnstile && widgetIdRef.current !== null) {
      try { window.turnstile.reset(widgetIdRef.current) } catch (_) {}
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    if (!captchaToken) return setMsg({ type: 'error', text: t.captchaRequired })
    if (mode === 'register' && !terms) return setMsg({ type: 'error', text: t.termsRequired })
    setLoading(true); setMsg({ type: '', text: '' })
    const fn = mode === 'login' ? signIn : signUp
    const { error } = await fn(email, password, captchaToken)
    if (error) { setMsg({ type: 'error', text: error.message }); resetCaptcha() }
    else if (mode === 'register') setMode('verify')
    setLoading(false)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!captchaToken) return setMsg({ type: 'error', text: t.captchaRequired })
    setLoading(true); setMsg({ type: '', text: '' })
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/Pathly.app/auth`,
      options: { captchaToken },
    })
    if (error) setMsg({ type: 'error', text: error.message })
    else       setMsg({ type: 'success', text: t.resetSuccess })
    resetCaptcha(); setLoading(false)
  }

  const toggleTheme = () => {
    const dark = document.body.classList.toggle('dark-mode')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    renderWidget()
  }

  const goTo = (m) => { setMode(m); setMsg({ type:'',text:'' }); setTerms(false) }

  // ── Verify ──────────────────────────────────────────────────────
  if (mode === 'verify') return (
    <div className="auth-container">
      <ThemeBtn onToggle={toggleTheme} />
      <div className="auth-card card">
        <div className="verify-icon">✉️</div>
        <h1>{t.verifyTitle}</h1>
        <p className="verify-text">{t.verifyText}</p>
        <p className="verify-hint">{t.verifyHint}</p>
        <button className="btn btn-primary btn-full" style={{marginTop:20}} onClick={() => goTo('login')}>
          {t.backToLogin}
        </button>
      </div>
    </div>
  )

  // ── Reset ───────────────────────────────────────────────────────
  if (mode === 'reset') return (
    <div className="auth-container">
      <ThemeBtn onToggle={toggleTheme} />
      <div className="auth-card card">
        <div className="auth-header">
          <h1>{t.resetTitle}</h1>
          <p>{t.resetSubtitle}</p>
        </div>
        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <form onSubmit={handleReset}>
          <div className="form-group">
            <label className="form-label">{t.emailLabel}</label>
            <input type="email" className="form-input" required value={email}
              onChange={e => setEmail(e.target.value)} placeholder={t.emailPlaceholder} />
          </div>
          <div className="captcha-wrapper">
            <div ref={containerRef} className="turnstile-box" />
            {!widgetReady && <p className="captcha-hint">{t.captchaLoading}</p>}
          </div>
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

  // ── Login / Register ────────────────────────────────────────────
  return (
    <div className="auth-container">
      <ThemeBtn onToggle={toggleTheme} />
      <div className="auth-card card">
        <div className="auth-header">
          <h1>{t.appName}</h1>
          <p>{mode === 'login' ? t.welcomeBack : t.createAccount}</p>
        </div>
        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label className="form-label">{t.emailLabel}</label>
            <input type="email" className="form-input" required value={email}
              onChange={e => setEmail(e.target.value)} placeholder={t.emailPlaceholder} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.passwordLabel}</label>
            <input type="password" className="form-input" required minLength={6} value={password}
              onChange={e => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} />
          </div>
          {mode === 'login' && (
            <div className="forgot-row">
              <button type="button" className="link-btn-small" onClick={() => goTo('reset')}>
                {t.forgotPassword}
              </button>
            </div>
          )}
          {mode === 'register' && (
            <label className="terms-label">
              <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />
              <span>{t.acceptTerms}{' '}
                <a href="https://mrowinski-thorge.github.io/Pathly.com/nutzungsbedingungen"
                  target="_blank" rel="noopener noreferrer" className="terms-link">
                  {t.termsLink}
                </a>
              </span>
            </label>
          )}
          <div className="captcha-wrapper">
            <div ref={containerRef} className="turnstile-box" />
            {!widgetReady && <p className="captcha-hint">{t.captchaLoading}</p>}
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? t.loadingText : mode === 'login' ? t.loginBtn : t.registerBtn}
          </button>
        </form>
        <div className="auth-footer">
          <button className="link-btn" onClick={() => goTo(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? t.noAccount : t.hasAccount}
          </button>
        </div>
      </div>
    </div>
  )
}

function ThemeBtn({ onToggle }) {
  const dark = document.body.classList.contains('dark-mode')
  return (
    <button className="theme-toggle-btn" onClick={onToggle} aria-label="Theme">
      {dark
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      }
    </button>
  )
}
