import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import './Auth.css'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState(false)

  const { signIn, signUp } = useAuth()

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = savedTheme || (prefersDark ? 'dark' : 'light')
    
    if (theme === 'dark') {
      document.body.classList.add('dark-mode')
    }
  }, [])

  const toggleTheme = () => {
    const isDark = document.body.classList.contains('dark-mode')
    if (isDark) {
      document.body.classList.remove('dark-mode')
      localStorage.setItem('theme', 'light')
    } else {
      document.body.classList.add('dark-mode')
      localStorage.setItem('theme', 'dark')
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/pathly.app/auth`
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

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      if (isLogin) {
        const { data: authData, error: signInError } = await signIn(email, password)
        if (signInError) throw signInError

        // Prüfe ob Account zum Löschen markiert ist
        if (authData?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('deleted_at')
            .eq('id', authData.user.id)
            .single()

          // Wenn deleted_at gesetzt ist, entferne es (Löschung abbrechen)
          if (profile?.deleted_at) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ deleted_at: null })
              .eq('id', authData.user.id)

            if (!updateError) {
              setMessage({ 
                type: 'success', 
                text: '✅ Willkommen zurück! Die Löschung deines Accounts wurde abgebrochen.' 
              })
            }
          }
        }
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setMessage({ 
          type: 'success', 
          text: 'Registrierung erfolgreich! Bitte überprüfe deine E-Mail.' 
        })
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
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
                onClick={() => setShowPasswordReset(true)}
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
                    href="https://mrowinski-thorge.github.io/pathly.com/nutzungsbedingungen" 
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
