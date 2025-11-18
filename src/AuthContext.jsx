import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    console.log('AuthProvider: Initializing...')
    
    // Check active session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('AuthProvider: Session error:', error)
          setError(error.message)
        } else {
          console.log('AuthProvider: Session loaded:', session?.user?.email || 'No user')
          setUser(session?.user ?? null)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('AuthProvider: Failed to get session:', err)
        setError(err.message)
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthProvider: Auth state changed:', _event, session?.user?.email)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  }

  const value = {
    user,
    signUp,
    signIn,
    signOut,
    updatePassword,
    loading,
    error
  }

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', color: 'red' }}>
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <p>Check browser console for details.</p>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
