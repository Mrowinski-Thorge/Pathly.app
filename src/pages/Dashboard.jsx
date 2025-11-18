import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import './Dashboard.css'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

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

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-content">
          <h1 className="navbar-brand">Pathly App</h1>
          <div className="nav-actions">
            <button onClick={toggleTheme} className="theme-toggle" aria-label="Theme umschalten">
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
            <button onClick={() => navigate('/settings')} className="settings-button" aria-label="Einstellungen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m5.2-14l-3 5.2m-3 5.2l-3 5.2M23 12h-6m-6 0H5m14-5.2l-5.2 3m-5.2 3l-5.2 3m16.4 0l-5.2-3m-5.2-3L1.8 6.8"></path>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="coming-soon-section">
            <h2 className="coming-soon-title">Herzlich Willkommen</h2>
            <p className="coming-soon-subtitle">{user?.email}</p>
            <div className="coming-soon-card card">
              <div className="coming-soon-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h3>Unsere App startet bald</h3>
              <p>Wir arbeiten hart daran, dir die beste Erfahrung zu bieten.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
