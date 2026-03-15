import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import { getT } from './i18n'

const AppContext = createContext({})
export const useApp = () => useContext(AppContext)

function applyTheme(theme) {
  const dark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.body.classList.toggle('dark-mode', dark)
}

function localLang() {
  try { return localStorage.getItem('lang') || 'de' } catch { return 'de' }
}

const CACHE_KEY = 'pathly_profile'
function readCache(userId) {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY))
    return c?.id === userId ? c : null
  } catch { return null }
}
function writeCache(p) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(p)) } catch (_) {}
}
function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY) } catch (_) {}
}

export const AppProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)
  const initDone    = useRef(false)

  const lang = profile?.language || localLang()
  const t    = getT(lang)

  // Apply theme INSTANTLY on mount (no flash)
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'system'
    applyTheme(saved)
  }, [])

  // Sync theme whenever profile.theme changes
  useEffect(() => {
    if (!profile?.theme) return
    applyTheme(profile.theme)
    localStorage.setItem('theme', profile.theme)
  }, [profile?.theme])

  // System dark-mode listener
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => {
      const cur = profile?.theme || localStorage.getItem('theme') || 'system'
      if (cur === 'system') applyTheme('system')
    }
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [profile?.theme])

  // ── Core: load profile from Supabase ──────────────────────────────────────
  // force=true → always bypass cache (used after SIGNED_IN / Google OAuth / etc.)
  const loadProfile = useCallback(async (userId, force = false) => {
    if (!force) {
      const cached = readCache(userId)
      if (cached) { setProfile(cached); return cached }
    }
    // Debounce concurrent calls
    if (fetchingRef.current) {
      await new Promise(r => setTimeout(r, 120))
      if (fetchingRef.current) return null
    }
    fetchingRef.current = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      const p = data || null
      setProfile(p)
      if (p) {
        writeCache(p)
        try { localStorage.setItem('lang', p.language || 'de') } catch (_) {}
      }
      return p
    } catch (e) {
      console.error('loadProfile:', e)
      return null
    } finally {
      fetchingRef.current = false
    }
  }, [])

  // ── Auth init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    // 1) Restore session from storage (fast, no network)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadProfile(u.id).finally(() => { if (mounted) { setLoading(false); initDone.current = true } })
      } else {
        clearCache(); setProfile(null); setLoading(false); initDone.current = true
      }
    }).catch(() => { if (mounted) { setLoading(false); initDone.current = true } })

    // 2) React to auth events (email confirm, Google OAuth redirect, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        const u = session?.user ?? null
        setUser(u)

        if (u) {
          // Force-fresh on all meaningful auth events so profile is current
          const shouldForce = ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)
          const p = await loadProfile(u.id, shouldForce)
          // After email confirmation: if onboarding not done → navigate is handled
          // by App.jsx route guards reacting to the updated profile state
          if (p) setProfile(p)   // ensure state is up-to-date
        } else {
          clearCache(); setProfile(null)
        }

        // Always clear loading after any auth event
        if (mounted) setLoading(false)
      }
    )
    return () => { mounted = false; subscription.unsubscribe() }
  }, [loadProfile])

  // ── Auth helpers ──────────────────────────────────────────────────────────
  const signUp = (email, password, captchaToken) =>
    supabase.auth.signUp({
      email, password,
      options: captchaToken ? { captchaToken } : {}
    })

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = async () => { clearCache(); return supabase.auth.signOut() }

  const updatePassword = (pw) => supabase.auth.updateUser({ password: pw })

  const verifyPassword = async (password) => {
    if (!user?.email) return false
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email, password
    })
    return !error
  }

  // ── Profile helpers ───────────────────────────────────────────────────────
  const updateProfile = async (updates) => {
    if (!user) return { error: new Error('not authenticated') }
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id).select().single()
    if (!error && data) {
      setProfile(data); writeCache(data)
      try { if (data.language) localStorage.setItem('lang', data.language) } catch (_) {}
    }
    return { data, error }
  }

  const markForDeletion = () => supabase.rpc('mark_my_account_for_deletion')
  const cancelDeletion  = () => supabase.rpc('cancel_my_account_deletion')

  const restoreAccount = async () => {
    await cancelDeletion()
    await loadProfile(user.id, true)
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
