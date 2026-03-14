import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import { turnstileSiteKey } from '../supabaseClient'
import './Auth.css'

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaReady, setCaptchaReady] = useState(false)

  const turnstileContainerRef = useRef(null)
  const turnstileWidgetIdRef = useRef(null)

  const { signIn, signUp } = useAuth()

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = savedTheme || (prefersDark ? 'dark' : 'light')
    
    if (theme === 'dark') {
      document.body.classList.add('dark-mode')
      setIsDarkMode(true)
    } else {
      setIsDarkMode(false)
    }
  }, [])

  const toggleTheme = () => {
    const isDark = document.body.classList.contains('dark-mode')
    if (isDark) {
      document.body.classList.remove('dark-mode')
      localStorage.setItem('theme', 'light')
      setIsDarkMode(false)
    } else {
      document.body.classList.add('dark-mode')
      localStorage.setItem('theme', 'dark')
      setIsDarkMode(true)
    }
  }

  const renderTurnstile = useCallback(() => {
    if (!window.turnstile || !turnstileContainerRef.current) {
      return
    }

    if (turnstileWidgetIdRef.current !== null) {
      window.turnstile.remove(turnstileWidgetIdRef.current)
      turnstileWidgetIdRef.current = null
    }

    turnstileContainerRef.current.innerHTML = ''

    turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: turnstileSiteKey,
      theme: isDarkMode ? 'dark' : 'light',
      callback: (token) => {
        setCaptchaToken(token)
      },
      'expired-callback': () => {
        setCaptchaToken('')
      },
      'error-callback': () => {
        setCaptchaToken('')
        setMessage({ type: 'error', text: 'Captcha fehlgeschlagen. Bitte erneut versuchen.' })
      }
    })

    setCaptchaReady(true)
  }, [isDarkMode])

  useEffect(() => {
    if (window.turnstile) {
      renderTurnstile()
      return
    }

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID)

    if (existingScript) {
      existingScript.addEventListener('load', renderTurnstile)

      return () => {
        existingScript.removeEventListener('load', renderTurnstile)
      }
    }

    const script = document.createElement('script')
    script.id = TURNSTILE_SCRIPT_ID
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = renderTurnstile
    document.head.appendChild(script)

    return () => {
      script.onload = null
    }
  }, [renderTurnstile])

  useEffect(() => {
    setCaptchaToken('')
    setCaptchaReady(false)

    if (window.turnstile) {
      renderTurnstile()
    }
  }, [isLogin, showPasswordReset, isDarkMode, renderTurnstile])

  const resetCaptcha = () => {
    setCaptchaToken('')

    if (window.turnstile && turnstileWidgetIdRef.current !== null) {
      window.turnstile.reset(turnstileWidgetIdRef.current)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()

    if (!captchaToken) {
      setMessage({ type: 'error', text: 'Bitte bestätige zuerst das Captcha' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/Pathly.app/auth`,
        captchaToken
      })
      if (error) throw error
      
      setMessage({ 
        type: 'success', 
        text: 'Passwort-Reset-Link wurde an deine E-Mail gesendet.' 
      })
      setShowPasswordReset(false)
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      resetCaptcha()
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Bei Registrierung müssen Nutzungsbedingungen akzeptiert werden
    if (!isLogin && !acceptedTerms) {
      setMessage({ type: 'error', text: 'Bitte akzeptiere die Nutzungsbedingungen' })
      return
    }

    if (!captchaToken) {
      setMessage({ type: 'error', text: 'Bitte bestätige zuerst das Captcha' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      if (isLogin) {
        const { error: signInError } = await signIn(email, password, captchaToken)
        if (signInError) throw signInError
      } else {
        const { error } = await signUp(email, password, captchaToken)
        if (error) throw error
        setMessage({ 
          type: 'success', 
          text: 'Registrierung erfolgreich! Bitte überprüfe deine E-Mail.' 
        })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      resetCaptcha()
      setLoading(false)
    }
  }

  if (showPasswordReset) {
    return (
      <div className="auth-container">
        <button onClick={toggleTheme} className="theme-toggle-floating" aria-label="Theme umschalten">
          <svg className="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg className="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>

        <div className="auth-card card">
          <div className="auth-header">
            <h1>Passwort zurücksetzen</h1>
            <p>Gib deine E-Mail ein, um einen Reset-Link zu erhalten</p>
          </div>

          {message.text && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="deine@email.de"
              />
            </div>

            <div className="captcha-wrapper">
              <div ref={turnstileContainerRef} className="turnstile-box" />
              {!captchaReady && <p className="captcha-status">Captcha wird geladen...</p>}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Senden...' : 'Reset-Link senden'}
            </button>
          </form>

          <div className="auth-footer">
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setShowPasswordReset(false)
                setMessage({ type: '', text: '' })
                resetCaptcha()
              }}
            >
              Zurück zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <button onClick={toggleTheme} className="theme-toggle-floating" aria-label="Theme umschalten">
        <svg className="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
        <svg className="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      </button>

      <div className="auth-card card">
        <div className="auth-header">
          <h1>Pathly App</h1>
          <p>{isLogin ? 'Willkommen zurück' : 'Erstelle dein Konto'}</p>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="deine@email.de"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {isLogin && (
            <div className="forgot-password-link">
              <button
                type="button"
                className="link-button-small"
                onClick={() => {
                  setShowPasswordReset(true)
                  setMessage({ type: '', text: '' })
                  resetCaptcha()
                }}
              >
                Passwort vergessen?
              </button>
            </div>
          )}

          {!isLogin && (
            <div className="terms-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkbox-text">
                  Ich akzeptiere die{' '}
                  <a 
                    href="https://mrowinski-thorge.github.io/Pathly.com/nutzungsbedingungen" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="terms-link"
                  >
                    Nutzungsbedingungen
                  </a>
                </span>
              </label>
            </div>
          )}

          <div className="captcha-wrapper">
            <div ref={turnstileContainerRef} className="turnstile-box" />
            {!captchaReady && <p className="captcha-status">Captcha wird geladen...</p>}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Laden...' : isLogin ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>

        <div className="auth-footer">
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setIsLogin(!isLogin)
              setMessage({ type: '', text: '' })
              setAcceptedTerms(false)
              resetCaptcha()
            }}
          >
            {isLogin 
              ? 'Noch kein Konto? Jetzt registrieren' 
              : 'Bereits registriert? Anmelden'}
          </button>
        </div>
      </div>
    </div>
  )
}
