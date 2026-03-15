import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import { getT } from './i18n'

const AppContext = createContext({})
export const useApp = () => useContext(AppContext)

/* ── Theme ──────────────────────────────────────────────────── */
function applyTheme(theme) {
  const dark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.body.classList.toggle('dark-mode', dark)
}

/* ── Language fallback (localStorage for guests) ────────────── */
function localLang() {
  try { return localStorage.getItem('lang') || 'de' } catch { return 'de' }
}

/* ── Session-cache helpers (avoid extra Supabase round-trips) ── */
const PROFILE_CACHE_KEY = 'pathly_profile_cache'
function readCache() {
  try { return JSON.parse(sessionStorage.getItem(PROFILE_CACHE_KEY)) } catch { return null }
}
function writeCache(profile) {
  try { sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile)) } catch (_) {}
}
function clearCache() {
  try { sessionStorage.removeItem(PROFILE_CACHE_KEY) } catch (_) {}
}

export const AppProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(() => readCache()) // hydrate from cache instantly
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)  // prevent duplicate fetches

  const lang = profile?.language || localLang()
  const t    = getT(lang)

  /* ── Theme init (sync, no flash) ─────────────────────────── */
  useEffect(() => {
    const saved = profile?.theme || localStorage.getItem('theme') || 'system'
    applyTheme(saved)
  }, []) // eslint-disable-line

  /* ── Theme sync when profile changes ─────────────────────── */
  useEffect(() => {
    if (!profile?.theme) return
    applyTheme(profile.theme)
    localStorage.setItem('theme', profile.theme)
  }, [profile?.theme])

  /* ── System dark mode listener ───────────────────────────── */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => {
      const cur = profile?.theme || localStorage.getItem('theme') || 'system'
      if (cur === 'system') applyTheme('system')
    }
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [profile?.theme])

  /* ── Load profile (with cache) ───────────────────────────── */
  const loadProfile = useCallback(async (userId, force = false) => {
    // Use session cache unless forced refresh
    if (!force) {
      const cached = readCache()
      if (cached && cached.id === userId) {
        setProfile(cached)
        return cached
      }
    }
    if (fetchingRef.current) return null
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

  /* ── Auth init ───────────────────────────────────────────── */
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadProfile(u.id).finally(() => { if (mounted) setLoading(false) })
      } else {
        clearCache()
        setProfile(null)
        setLoading(false)
      }
    }).catch(() => { if (mounted) setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          loadProfile(u.id)
        } else {
          clearCache()
          setProfile(null)
        }
      }
    )
    return () => { mounted = false; subscription.unsubscribe() }
  }, [loadProfile])

  /* ── Auth helpers ─────────────────────────────────────────── */
  const signUp = (email, password, captchaToken) =>
    supabase.auth.signUp({ email, password, options: captchaToken ? { captchaToken } : {} })

  const signIn = (email, password, captchaToken) =>
    supabase.auth.signInWithPassword({ email, password, options: captchaToken ? { captchaToken } : {} })

  const signOut = async () => {
    clearCache()
    return supabase.auth.signOut()
  }

  const updatePassword = (newPassword) =>
    supabase.auth.updateUser({ password: newPassword })

  const verifyPassword = async (password) => {
    if (!user?.email) return false
    // Verify the user's current password by attempting a sign-in with their credentials
    // We temporarily suppress the auth state change by checking error only
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    })
    // signInWithPassword re-fires onAuthStateChange with SIGNED_IN which is fine
    // – AppContext will just re-load the same profile (cached, no extra fetch)
    return !error
  }

  /* ── Profile helpers ─────────────────────────────────────── */
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
      writeCache(data)
      try { if (data.language) localStorage.setItem('lang', data.language) } catch (_) {}
    }
    return { data, error }
  }

  /* ── Account deletion ─────────────────────────────────────── */
  const markForDeletion = () => supabase.rpc('mark_my_account_for_deletion')
  const cancelDeletion  = () => supabase.rpc('cancel_my_account_deletion')

  const restoreAccount = async () => {
    await cancelDeletion()
    await loadProfile(user.id, true)  // force refresh after restore
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
