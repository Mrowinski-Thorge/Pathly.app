import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../AuthContext'
import { turnstileSiteKey } from '../supabaseClient'
import { useT } from '../useT'
import './Auth.css'

const SCRIPT_ID = 'cf-turnstile-script'

export default function Auth() {
  // view: 'login' | 'register' | 'reset' | 'verify'
  const [view, setView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaReady, setCaptchaReady] = useState(false)
  const [isDark, setIsDark] = useState(() => document.body.classList.contains('dark-mode'))

  const containerRef = useRef(null)
  const widgetRef = useRef(null)
  const { signIn, signUp, resetPasswordForEmail } = useAuth()
  const t = useT()

  // ── Theme toggle (auth page only – user not logged in) ───────────────────
  const toggleTheme = () => {
    const dark = document.body.classList.toggle('dark-mode')
    setIsDark(dark)
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch (_) {}
    // re-render turnstile with correct theme
    if (window.turnstile && widgetRef.current != null) {
      window.turnstile.remove(widgetRef.current)
      widgetRef.current = null
      setCaptchaToken('')
      setCaptchaReady(false)
    }
  }

  // ── Turnstile ─────────────────────────────────────────────────────────────
  const renderTurnstile = useCallback(() => {
    if (!window.turnstile || !containerRef.current) return
    if (widgetRef.current != null) {
      window.turnstile.remove(widgetRef.current)
      widgetRef.current = null
    }
    containerRef.current.innerHTML = ''
    widgetRef.current = window.turnstile.render(containerRef.current, {
      sitekey: turnstileSiteKey,
      theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
      callback: (token) => setCaptchaToken(token),
      'expired-callback': () => setCaptchaToken(''),
      'error-callback': () => {
        setCaptchaToken('')
        setMsg({ type: 'error', text: t('captchaFailed') })
      },
    })
    setCaptchaReady(true)
  }, [isDark]) // eslint-disable-line

  useEffect(() => {
    if (view === 'verify') return
    if (window.turnstile) { renderTurnstile(); return }
    const existing = document.getElementById(SCRIPT_ID)
    if (existing) { existing.addEventListener('load', renderTurnstile); return () => existing.removeEventListener('load', renderTurnstile) }
    const s = document.createElement('script')
    s.id = SCRIPT_ID
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.defer = true
    s.onload = renderTurnstile
    document.head.appendChild(s)
  }, [renderTurnstile, view])

  // reset widget on view change
  useEffect(() => {
    if (view === 'verify') return
    setCaptchaToken('')
    setCaptchaReady(false)
    if (window.turnstile) renderTurnstile()
  }, [view]) // eslint-disable-line

  const resetCaptcha = () => {
    setCaptchaToken('')
    if (window.turnstile && widgetRef.current != null) window.turnstile.reset(widgetRef.current)
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAuth = async (e) => {
    e.preventDefault()
    if (!captchaToken) { setMsg({ type: 'error', text: t('captchaRequired') }); return }
    if (view === 'register' && !acceptedTerms) { setMsg({ type: 'error', text: t('termsRequired') }); return }
    setLoading(true); setMsg({ type: '', text: '' })
    try {
      if (view === 'login') {
        const { error } = await signIn(email, password, captchaToken)
        if (error) throw error
        // AuthContext / App.jsx will redirect automatically
      } else {
        const { error } = await signUp(email, password, captchaToken)
        if (error) throw error
        setView('verify')
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      resetCaptcha()
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!captchaToken) { setMsg({ type: 'error', text: t('captchaRequired') }); return }
    setLoading(true); setMsg({ type: '', text: '' })
    try {
      const { error } = await resetPasswordForEmail(email, captchaToken)
      if (error) throw error
      setMsg({ type: 'success', text: t('resetSuccess') })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      resetCaptcha()
      setLoading(false)
    }
  }

  const goTo = (v) => { setView(v); setMsg({ type: '', text: '' }); setAcceptedTerms(false) }

  // ── Verification screen ───────────────────────────────────────────────────
  if (view === 'verify') {
    return (
      <div className="auth-page">
        <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
        <div className="auth-card card">
          <div className="auth-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <h1>{t('verifyTitle')}</h1>
          <p className="auth-subtitle">{t('verifyText')}</p>
          <p className="auth-hint">{t('verifyHint')}</p>
          <button className="btn btn-primary btn-full" style={{marginTop: 24}} onClick={() => goTo('login')}>
            {t('backToLogin')}
          </button>
        </div>
      </div>
    )
  }

  // ── Password reset screen ─────────────────────────────────────────────────
  if (view === 'reset') {
    return (
      <div className="auth-page">
        <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
        <div className="auth-card card">
          <div className="auth-header">
            <h1>{t('resetTitle')}</h1>
            <p className="auth-subtitle">{t('resetSubtitle')}</p>
          </div>
          {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label className="form-label">{t('email')}</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required placeholder={t('emailPlaceholder')} />
            </div>
            <div className="captcha-wrap">
              <div ref={containerRef} />
              {!captchaReady && <p className="captcha-hint">Captcha wird geladen…</p>}
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? t('sending') : t('sendResetLink')}
            </button>
          </form>
          <div className="auth-footer">
            <button className="link-btn" onClick={() => goTo('login')}>{t('backToLogin')}</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Login / Register ──────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
      <div className="auth-card card">
        <div className="auth-header">
          <h1>{t('appName')}</h1>
          <p className="auth-subtitle">{view === 'login' ? t('welcomeBack') : t('createAccount')}</p>
        </div>

        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label className="form-label">{t('email')}</label>
            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required placeholder={t('emailPlaceholder')} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('password')}</label>
            <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required placeholder={t('passwordPlaceholder')} minLength={6} />
          </div>

          {view === 'login' && (
            <div className="forgot-row">
              <button type="button" className="link-btn-sm" onClick={() => goTo('reset')}>{t('forgotPassword')}</button>
            </div>
          )}

          {view === 'register' && (
            <label className="terms-row">
              <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} />
              <span>{t('acceptTermsPrefix')}{' '}
                <a href="https://mrowinski-thorge.github.io/Pathly.com/nutzungsbedingungen" target="_blank" rel="noopener noreferrer" className="terms-link">
                  {t('termsLink')}
                </a>
              </span>
            </label>
          )}

          <div className="captcha-wrap">
            <div ref={containerRef} />
            {!captchaReady && <p className="captcha-hint">Captcha wird geladen…</p>}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? t('loading') : view === 'login' ? t('loginBtn') : t('registerBtn')}
          </button>
        </form>

        <div className="auth-footer">
          <button className="link-btn" onClick={() => goTo(view === 'login' ? 'register' : 'login')}>
            {view === 'login' ? t('noAccount') : t('hasAccount')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ThemeBtn({ isDark, onToggle }) {
  return (
    <button className="theme-toggle-btn" onClick={onToggle} aria-label="Theme umschalten">
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}
