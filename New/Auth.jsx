import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../AppContext'
import { supabase, turnstileSiteKey } from '../supabaseClient'
import './Auth.css'

// ─── Turnstile: render ONCE, only update theme via update() ──────────────────
function useTurnstile(containerRef, onToken, onExpire, onError) {
  const widgetIdRef = useRef(null)
  const mountedRef  = useRef(false)

  const renderOnce = useCallback(() => {
    if (!window.turnstile || !containerRef.current) return
    if (mountedRef.current) return            // already rendered → never re-render
    mountedRef.current = true
    containerRef.current.innerHTML = ''
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: turnstileSiteKey,
      theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
      callback: onToken,
      'expired-callback': onExpire,
      'error-callback': onError,
    })
  }, [containerRef, onToken, onExpire, onError])

  // Wait for Turnstile script (preloaded in index.html, usually instant)
  useEffect(() => {
    let raf
    const try_ = () => {
      if (window.turnstile) { renderOnce(); return }
      raf = requestAnimationFrame(try_)
    }
    try_()
    return () => cancelAnimationFrame(raf)
  }, [renderOnce])

  // Theme change: use update() if available, otherwise reset (no full re-render)
  const updateTheme = useCallback((dark) => {
    if (!window.turnstile || widgetIdRef.current === null) return
    try {
      // Turnstile v0 supports update()
      window.turnstile.update(widgetIdRef.current, { theme: dark ? 'dark' : 'light' })
    } catch (_) {
      // Fallback: just reset the token so user re-solves, widget stays in DOM
      try { window.turnstile.reset(widgetIdRef.current) } catch (__) {}
    }
  }, [])

  const reset = useCallback(() => {
    if (!window.turnstile || widgetIdRef.current === null) return
    try { window.turnstile.reset(widgetIdRef.current) } catch (_) {}
  }, [])

  return { updateTheme, reset }
}

// ─── Main Auth component ──────────────────────────────────────────────────────
export default function Auth() {
  const { signIn, signUp, t } = useApp()

  // 'login' | 'register' | 'reset' | 'verify'
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState({ type: '', text: '' })
  const [terms, setTerms]       = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [widgetReady, setWidgetReady]   = useState(false)
  const [isDark, setIsDark]     = useState(() => document.body.classList.contains('dark-mode'))

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0)
  const cooldownRef = useRef(null)

  const containerRef = useRef(null)

  const { updateTheme, reset: resetWidget } = useTurnstile(
    containerRef,
    (tok) => { setCaptchaToken(tok); setWidgetReady(true) },
    () => setCaptchaToken(''),
    () => { setCaptchaToken(''); setMsg({ type: 'error', text: t.captchaFailed }) }
  )

  // Show widget as "ready" once container gets content
  useEffect(() => {
    const obs = new MutationObserver(() => {
      if (containerRef.current?.querySelector('iframe')) setWidgetReady(true)
    })
    if (containerRef.current) obs.observe(containerRef.current, { childList: true, subtree: true })
    return () => obs.disconnect()
  }, [])

  // ── Listen for auth state change → auto-redirect after email confirm ────────
  // When user clicks email link, Supabase fires SIGNED_IN in any open tab
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // AppContext will handle profile load → App.jsx redirects to / or /onboarding
        // Nothing needed here; Auth route guards will kick in automatically
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Theme toggle ─────────────────────────────────────────────────────────────
  const toggleTheme = () => {
    const dark = document.body.classList.toggle('dark-mode')
    setIsDark(dark)
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch (_) {}
    updateTheme(dark)   // ← no re-render, just theme update
  }

  // ── Captcha reset after submit ────────────────────────────────────────────────
  const softResetCaptcha = () => {
    setCaptchaToken('')
    resetWidget()
  }

  // ── Mode switch: never destroy Turnstile widget ────────────────────────────
  const goTo = (m) => {
    setMode(m)
    setMsg({ type: '', text: '' })
    setTerms(false)
    // Only reset token so user re-solves — widget stays in DOM
    softResetCaptcha()
  }

  // ── Resend email cooldown ─────────────────────────────────────────────────
  const startCooldown = () => {
    setResendCooldown(60)
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
  }
  useEffect(() => () => clearInterval(cooldownRef.current), [])

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (!error) {
      setMsg({ type: 'success', text: t.resendSuccess })
      startCooldown()
    } else {
      setMsg({ type: 'error', text: error.message })
    }
  }

  // ── Login / Register ──────────────────────────────────────────────────────
  const handleAuth = async (e) => {
    e.preventDefault()
    if (!captchaToken) return setMsg({ type: 'error', text: t.captchaRequired })
    if (mode === 'register' && !terms) return setMsg({ type: 'error', text: t.termsRequired })
    setLoading(true); setMsg({ type: '', text: '' })
    const fn = mode === 'login' ? signIn : signUp
    const { error } = await fn(email, password, captchaToken)
    if (error) {
      setMsg({ type: 'error', text: error.message })
      softResetCaptcha()
    } else if (mode === 'register') {
      goTo('verify')
      startCooldown()
    }
    // Login success → AppContext SIGNED_IN → App.jsx redirects automatically
    setLoading(false)
  }

  // ── Password reset ────────────────────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault()
    if (!captchaToken) return setMsg({ type: 'error', text: t.captchaRequired })
    setLoading(true); setMsg({ type: '', text: '' })
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/Pathly.app/auth`,
      options: { captchaToken },
    })
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: t.resetSuccess })
    softResetCaptcha()
    setLoading(false)
  }

  // ── Shared Turnstile widget element (always present in DOM when not verify) ─
  // We render ONE invisible wrapper that persists across mode changes.
  const captchaEl = mode !== 'verify' && (
    <div className="captcha-wrap">
      <div ref={containerRef} />
      {!widgetReady && <p className="captcha-hint">{t.captchaLoading}</p>}
    </div>
  )

  // ── Verify screen ─────────────────────────────────────────────────────────
  if (mode === 'verify') return (
    <div className="auth-page">
      <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
      {/* Keep Turnstile in DOM (hidden) to avoid re-render if user goes back */}
      <div style={{ display: 'none' }} ref={containerRef} />
      <div className="auth-card card">
        <div className="verify-emoji">✉️</div>
        <h1 className="auth-title">{t.verifyTitle}</h1>
        <p className="auth-body">{t.verifyText}</p>
        {msg.text && <div className={`alert alert-${msg.type}`} style={{marginBottom:12}}>{msg.text}</div>}
        <button
          className="btn btn-secondary btn-full"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          style={{ marginBottom: 10 }}
        >
          {resendCooldown > 0 ? `${t.resendIn} ${resendCooldown}s` : t.resendEmail}
        </button>
        <button className="btn btn-primary btn-full" onClick={() => goTo('login')}>
          {t.backToLogin}
        </button>
      </div>
    </div>
  )

  // ── Reset screen ──────────────────────────────────────────────────────────
  if (mode === 'reset') return (
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
              placeholder={t.emailPlaceholder} />
          </div>
          {captchaEl}
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

  // ── Login / Register ──────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
      <div className="auth-card card">
        <h1 className="auth-title">{t.appName}</h1>
        <p className="auth-sub">{mode === 'login' ? t.welcomeBack : t.createAccount}</p>

        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label className="form-label">{t.emailLabel}</label>
            <input type="email" className="form-input" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder} />
          </div>
          <div className="form-group">
            <label className="form-label">{t.passwordLabel}</label>
            <input type="password" className="form-input" required minLength={6}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder} />
          </div>

          {mode === 'login' && (
            <div className="forgot-row">
              <button type="button" className="link-btn-sm" onClick={() => goTo('reset')}>
                {t.forgotPassword}
              </button>
            </div>
          )}

          {mode === 'register' && (
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

          {captchaEl}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? t.loadingText : mode === 'login' ? t.loginBtn : t.registerBtn}
          </button>
        </form>

        <div className="auth-footer">
          <button className="link-btn"
            onClick={() => goTo(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? t.noAccount : t.hasAccount}
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
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
      }
    </button>
  )
}
