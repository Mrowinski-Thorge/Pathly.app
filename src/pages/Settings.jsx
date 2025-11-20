import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import './Settings.css'

export default function Settings() {
  const { user, signOut, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = savedTheme || (prefersDark ? 'dark' : 'light')
    
    if (theme === 'dark') {
      document.body.classList.add('dark-mode')
      setIsDarkMode(true)
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

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwörter stimmen nicht überein' })
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Passwort muss mindestens 6 Zeichen lang sein' })
      setLoading(false)
      return
    }

    try {
      const { error } = await updatePassword(newPassword)
      if (error) throw error
      
      setMessage({ type: 'success', text: 'Passwort erfolgreich geändert' })
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordChange(false)
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // Markiere Account als gelöscht (Soft-Delete)
      const { error } = await supabase
        .from('profiles')
        .update({ 
          deleted_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: 'Account wird in 30 Tagen gelöscht. Bei erneutem Login wird die Löschung abgebrochen.' 
      })
      
      setTimeout(async () => {
        await signOut()
      }, 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Fehler beim Löschen: ' + error.message })
      setLoading(false)
    }
  }

  return (
    <div className="settings-container">
      <main className="settings-main">
        <div className="settings-content">
          <div className="settings-header">
            <button onClick={() => navigate('/')} className="back-button-settings" aria-label="Zurück">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span>Zurück</span>
            </button>
            <h1>Einstellungen</h1>
            <p className="subtitle">Verwalte deinen Account</p>
          </div>

          {message.text && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="settings-grid">
            {/* Dark Mode */}
            <div className="card setting-card">
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-icon">
                    <svg className="moon-icon-setting" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                    <svg className="sun-icon-setting" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  </div>
                  <div className="setting-text">
                    <h3>{isDarkMode ? 'Hell Modus' : 'Dark Modus'}</h3>
                    <p>{isDarkMode ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren'}</p>
                  </div>
                </div>
                <button onClick={toggleTheme} className="theme-icon-button" aria-label="Dark Mode umschalten">
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
              </div>
            </div>

            {/* Email */}
            <div className="card setting-card">
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <div className="setting-text">
                    <h3>E-Mail</h3>
                    <p>{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="card setting-card">
              {!showPasswordChange ? (
                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </div>
                    <div className="setting-text">
                      <h3>Passwort</h3>
                      <p>Passwort ändern</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPasswordChange(true)}
                    className="btn btn-secondary"
                  >
                    Ändern
                  </button>
                </div>
              ) : (
                <div className="password-change-form">
                  <h3>Passwort ändern</h3>
                  <form onSubmit={handlePasswordChange}>
                    <div className="form-group">
                      <label htmlFor="newPassword" className="form-label">
                        Neues Passwort
                      </label>
                      <input
                        id="newPassword"
                        type="password"
                        className="form-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirmPassword" className="form-label">
                        Passwort bestätigen
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        className="form-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="button-group">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? 'Speichern...' : 'Speichern'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowPasswordChange(false)
                          setNewPassword('')
                          setConfirmPassword('')
                          setMessage({ type: '', text: '' })
                        }}
                        disabled={loading}
                      >
                        Abbrechen
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Sign Out */}
            <div className="card setting-card danger-card">
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-icon danger-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                  </div>
                  <div className="setting-text">
                    <h3>Abmelden</h3>
                    <p>Von deinem Konto abmelden</p>
                  </div>
                </div>
                <button onClick={handleSignOut} className="btn btn-danger">
                  Abmelden
                </button>
              </div>
            </div>

            {/* Delete Account */}
            <div className="card setting-card danger-card">
              {!showDeleteConfirm ? (
                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-icon danger-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </div>
                    <div className="setting-text">
                      <h3>Account löschen</h3>
                      <p>Alle deine Daten werden unwiderruflich gelöscht</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)} 
                    className="btn btn-danger"
                  >
                    Löschen
                  </button>
                </div>
              ) : (
                <div className="delete-confirm">
                  <div className="warning-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <h3>Account wirklich löschen?</h3>
                  <p>Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Habits und Statistiken werden permanent gelöscht.</p>
                  <div className="button-group">
                    <button
                      onClick={handleDeleteAccount}
                      className="btn btn-danger"
                      disabled={loading}
                    >
                      {loading ? 'Wird gelöscht...' : 'Ja, Account löschen'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn btn-secondary"
                      disabled={loading}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
