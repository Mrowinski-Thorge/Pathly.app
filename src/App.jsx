import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './AppContext'
import { initTurnstile } from './turnstile'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Settings from './pages/Settings'
import BottomNav from './components/BottomNav'
import './App.css'

/* ── Globaler Turnstile-Container ────────────────────────────── */
// Einmal global rendern, damit getCaptchaToken() überall funktioniert
// (auch in Settings für Passwort-Verifikation)
function GlobalTurnstile() {
  const containerRef = useRef(null)
  useEffect(() => {
    const tryInit = () => {
      if (window.turnstile && containerRef.current) {
        initTurnstile(containerRef.current)
        return true
      }
      return false
    }
    if (!tryInit()) {
      const id = setInterval(() => { if (tryInit()) clearInterval(id) }, 50)
      return () => clearInterval(id)
    }
  }, [])
  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', bottom: 0, right: 0, zIndex: -1, opacity: 0, pointerEvents: 'none' }}
    />
  )
}

/* ── Deletion Modal ──────────────────────────────────────────── */
function DeletionModal() {
  const { profile, t, lang, restoreAccount, keepAndSignOut } = useApp()
  if (!profile?.deleted_at) return null

  const d = new Date(profile.deleted_at)
  d.setDate(d.getDate() + 30)
  const formatted = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  return (
    <div className="modal-backdrop">
      <div className="modal-card card">
        <div className="modal-warning-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h2>{t.restorationTitle}</h2>
        <p>{t.restorationText(formatted)}</p>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={restoreAccount}>{t.restore}</button>
          <button className="btn btn-secondary" onClick={keepAndSignOut}>{t.keepDeleting}</button>
        </div>
      </div>
    </div>
  )
}

/* ── Route guard ─────────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { user, profile, loading, profileLoaded } = useApp()

  // Initiales Laden: Spinner zeigen
  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  // Nicht eingeloggt
  if (!user) return <Navigate to="/auth" replace />

  // Profil noch nicht geladen (verhindert Flash zu /onboarding)
  if (!profileLoaded) return <div className="loading-container"><div className="spinner" /></div>

  // Onboarding nicht abgeschlossen
  if (!profile?.onboarding_done) return <Navigate to="/onboarding" replace />

  return children
}

/* ── Layout ──────────────────────────────────────────────────── */
function AppLayout({ children }) {
  const location = useLocation()
  const { user, profile } = useApp()
  const showNav = !!user
    && !!profile?.onboarding_done
    && !profile?.deleted_at
    && location.pathname !== '/auth'
    && location.pathname !== '/onboarding'

  return (
    <>
      <DeletionModal />
      {children}
      {showNav && <BottomNav />}
    </>
  )
}

/* ── Routes ──────────────────────────────────────────────────── */
function AppRoutes() {
  const { user, profile, loading, profileLoaded } = useApp()

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  // Wohin soll ein eingeloggter User geleitet werden?
  const loggedInTarget = () => {
    if (!user) return null
    if (profile?.deleted_at) return null       // DeletionModal zeigen
    if (!profileLoaded) return null            // noch laden
    if (!profile?.onboarding_done) return '/onboarding'
    return '/'
  }
  const target = loggedInTarget()

  return (
    <AppLayout>
      <Routes>
        {/* Auth-Seite */}
        <Route
          path="/auth"
          element={target ? <Navigate to={target} replace /> : <Auth />}
        />

        {/* Onboarding – nur wenn eingeloggt und noch nicht abgeschlossen */}
        <Route
          path="/onboarding"
          element={
            !user
              ? <Navigate to="/auth" replace />
              : (profile?.onboarding_done
                  ? <Navigate to="/" replace />
                  : <Onboarding />)
          }
        />

        {/* Geschützte Routen */}
        <Route path="/"        element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <AppProvider>
      <GlobalTurnstile />
      <BrowserRouter basename="/Pathly.app">
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}
