import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { getT } from './i18n'

const AppContext = createContext({})
export const useApp = () => useContext(AppContext)

/* ── Theme helper ─────────────────────────────────────────── */
function applyTheme(theme) {
  const dark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.body.classList.toggle('dark-mode', dark)
}

/* ── Language helper (persisted in localStorage for guests) ── */
function readLocalLang() {
  try { return localStorage.getItem('lang') || 'de' } catch { return 'de' }
}

export const AppProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Derive language: profile wins, then localStorage
  const lang = profile?.language || readLocalLang()
  const t    = getT(lang)

  /* ── Apply theme immediately (before React) ─────────────── */
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'system'
    applyTheme(saved)
  }, [])

  /* ── Sync theme when profile loads/changes ──────────────── */
  useEffect(() => {
    if (!profile?.theme) return
    applyTheme(profile.theme)
    localStorage.setItem('theme', profile.theme)
  }, [profile?.theme])

  /* ── System dark mode listener ──────────────────────────── */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => {
      const cur = profile?.theme || localStorage.getItem('theme') || 'system'
      if (cur === 'system') applyTheme('system')
    }
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [profile?.theme])

  /* ── Load profile ───────────────────────────────────────── */
  const loadProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      setProfile(data || null)
      // Persist lang locally so guest-mode reads it
      if (data?.language) {
        try { localStorage.setItem('lang', data.language) } catch (_) {}
      }
      return data
    } catch (e) {
      console.error('loadProfile:', e)
      return null
    }
  }, [])

  /* ── Auth init ──────────────────────────────────────────── */
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadProfile(u.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) loadProfile(u.id)
        else   setProfile(null)
      }
    )
    return () => { mounted = false; subscription.unsubscribe() }
  }, [loadProfile])

  /* ── Auth helpers ───────────────────────────────────────── */
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

  /* ── Profile helpers ────────────────────────────────────── */
  const updateProfile = async (updates) => {
    if (!user) return { error: new Error('not authenticated') }
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()
    if (!error && data) {
      setProfile(data)
      if (data.language) {
        try { localStorage.setItem('lang', data.language) } catch (_) {}
      }
    }
    return { data, error }
  }

  /* ── Account deletion ───────────────────────────────────── */
  const markForDeletion = () => supabase.rpc('mark_my_account_for_deletion')
  const cancelDeletion  = () => supabase.rpc('cancel_my_account_deletion')

  /* ── Deletion modal helpers ─────────────────────────────── */
  const restoreAccount = async () => {
    await cancelDeletion()
    await loadProfile(user.id)
  }
  const keepAndSignOut = () => signOut()

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
