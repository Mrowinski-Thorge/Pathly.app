import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { getT } from './i18n'

const AppContext = createContext({})

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}

function applyTheme(theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.body.classList.toggle('dark-mode', isDark)
}

export const AppProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const lang = profile?.language || 'de'
  const t    = getT(lang)

  /* ── Theme: apply immediately on paint ─────────────────── */
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'system'
    applyTheme(saved)
  }, [])

  /* ── Theme: sync when profile changes ──────────────────── */
  useEffect(() => {
    if (profile?.theme) {
      applyTheme(profile.theme)
      localStorage.setItem('theme', profile.theme)
    }
  }, [profile?.theme])

  /* ── System theme listener ─────────────────────────────── */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => {
      const cur = profile?.theme || localStorage.getItem('theme') || 'system'
      if (cur === 'system') applyTheme('system')
    }
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [profile?.theme])

  /* ── Load profile ──────────────────────────────────────── */
  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      setProfile(data || null)
      return data
    } catch (e) {
      console.error('loadProfile:', e)
      return null
    }
  }, [])

  /* ── Auth init ─────────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) return loadProfile(u.id)
      })
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadProfile(u.id)
      else  { setProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [loadProfile])

  /* ── Auth helpers ──────────────────────────────────────── */
  const signUp = (email, password, captchaToken) =>
    supabase.auth.signUp({
      email, password,
      options: captchaToken ? { captchaToken } : {},
    })

  const signIn = (email, password, captchaToken) =>
    supabase.auth.signInWithPassword({
      email, password,
      options: captchaToken ? { captchaToken } : {},
    })

  const signOut = () => supabase.auth.signOut()

  const updatePassword = (newPassword) =>
    supabase.auth.updateUser({ password: newPassword })

  const verifyPassword = async (password) => {
    if (!user?.email) return false
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email, password,
    })
    return !error
  }

  /* ── Profile helpers ───────────────────────────────────── */
  const updateProfile = async (updates) => {
    if (!user) return { error: new Error('not authenticated') }
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()
    if (!error && data) setProfile(data)
    return { data, error }
  }

  /* ── Account deletion ──────────────────────────────────── */
  const markForDeletion = () => supabase.rpc('mark_my_account_for_deletion')
  const cancelDeletion  = () => supabase.rpc('cancel_my_account_deletion')

  /* ── Restoration modal state ───────────────────────────── */
  // Shown inside App.jsx – we derive it from profile.deleted_at
  const restoreAccount = async () => {
    await cancelDeletion()
    await loadProfile(user.id)
  }

  const keepAndSignOut = async () => {
    await signOut()
  }

  return (
    <AppContext.Provider value={{
      user, profile, loading, t, lang,
      signUp, signIn, signOut, updatePassword, verifyPassword,
      updateProfile, loadProfile,
      markForDeletion, cancelDeletion,
      restoreAccount, keepAndSignOut,
    }}>
      {children}
    </AppContext.Provider>
  )
}
