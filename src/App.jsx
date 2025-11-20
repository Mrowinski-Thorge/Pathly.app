import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Auth from './pages/Auth'
import Home from './pages/Home'
import Statistics from './pages/Statistics'
import AIChat from './pages/AIChat'
import Settings from './pages/Settings'
import BottomNav from './components/BottomNav'
import SettingsIcon from './components/SettingsIcon'
import './App.css'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return children
}

function AppLayout({ children }) {
  const location = useLocation()
  const showNavigation = location.pathname !== '/auth' && location.pathname !== '/settings'

  return (
    <>
      {location.pathname !== '/auth' && <SettingsIcon />}
      {children}
      {showNavigation && <BottomNav />}
    </>
  )
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <AppLayout>
      <Routes>
        <Route 
          path="/auth" 
          element={user ? <Navigate to="/" replace /> : <Auth />} 
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistics"
          element={
            <ProtectedRoute>
              <Statistics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-chat"
          element={
            <ProtectedRoute>
              <AIChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/Pathly.app">
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
