import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Auth from './pages/Auth'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'
import BottomNav from './components/BottomNav'
import DeletionModal from './components/DeletionModal'
import './App.css'

/** Spinner while session is resolving */
function Spinner() {
  return (
    <div className="loading-container">
      <div className="spinner" />
    </div>
  )
}

/** Guards routes that need a logged-in + onboarded user */
function RequireAuth({ children }) {
  const { user, loading, profile } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/auth" replace />
  if (profile !== null && !profile.onboarding_done) return <Navigate to="/onboarding" replace />
  return children
}

const NAV_PATHS = ['/', '/settings']

function AppRoutes() {
  const { user, loading, profile } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />

  const showNav = !!user && !!profile?.onboarding_done && NAV_PATHS.includes(location.pathname)

  return (
    <>
      {/* Deletion restore modal – shown globally whenever account is marked */}
      {user && profile?.deleted_at && <DeletionModal />}

      <Routes>
        {/* Public */}
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />

        {/* Onboarding – only for logged-in users who haven't completed it */}
        <Route
          path="/onboarding"
          element={
            !user ? (
              <Navigate to="/auth" replace />
            ) : profile?.onboarding_done ? (
              <Navigate to="/" replace />
            ) : (
              <Onboarding />
            )
          }
        />

        {/* Protected */}
        <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showNav && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/Pathly.app">
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
