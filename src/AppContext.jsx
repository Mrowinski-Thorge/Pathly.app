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
  const fetchingRef  = useRef(false)
  const suppressRef  = useRef(false)
  // Track initial load to avoid double-fetch
  const initializedRef = useRef(false)

  const lang = profile?.language || localLang()
  const t    = getT(lang)

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'system'
    applyTheme(saved)
  }, [])

  useEffect(() => {
    if (!profile?.theme) return
    applyTheme(profile.theme)
    localStorage.setItem('theme', profile.theme)
  }, [profile?.theme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => {
      const cur = profile?.theme || localStorage.getItem('theme') || 'system'
      if (cur === 'system') applyTheme('system')
    }
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [profile?.theme])

  const loadProfile = useCallback(async (userId, force = false) => {
    if (!force) {
      const cached = readCache(userId)
      if (cached) { setProfile(cached); return cached }
    }
    if (fetchingRef.current) {
      // Wait briefly and return cached if available
      const cached = readCache(userId)
      if (cached) return cached
      await new Promise(r => setTimeout(r, 100))
      if (fetchingRef.current) return null
    }
    fetchingRef.current = true
    try {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', userId).maybeSingle()
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

  useEffect(() => {
    let mounted = true

    // Fast path: check session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      initializedRef.current = true
      if (u) {
        loadProfile(u.id).finally(() => { if (mounted) setLoading(false) })
      } else {
        clearCache(); setProfile(null); setLoading(false)
      }
    }).catch(() => { if (mounted) setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        // Skip SIGNED_IN during password verification
        if (suppressRef.current && event === 'SIGNED_IN') return

        const u = session?.user ?? null

        // On initial SIGNED_IN right after getSession, skip if already initialized
        // to avoid double profile fetch
        if (event === 'SIGNED_IN' && initializedRef.current && u?.id === user?.id) {
          // Still update if email was just confirmed
          if (u?.email_confirmed_at && !session?.user?.email_confirmed_at) {
            setUser(u)
            if (u) await loadProfile(u.id, true)
          }
          if (mounted) setLoading(false)
          return
        }

        setUser(u)

        if (u) {
          const shouldForce = ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)
          await loadProfile(u.id, shouldForce)
        } else {
          clearCache(); setProfile(null)
        }
        if (mounted) setLoading(false)
      }
    )
    return () => { mounted = false; subscription.unsubscribe() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadProfile])

  const signUp = (email, password, captchaToken) =>
    supabase.auth.signUp({ email, password, options: captchaToken ? { captchaToken } : {} })

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = async () => { clearCache(); return supabase.auth.signOut() }

  const updatePassword = (pw) => supabase.auth.updateUser({ password: pw })

  const verifyPassword = async (password) => {
    if (!user?.email) return false
    suppressRef.current = true
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email, password,
    })
    setTimeout(() => { suppressRef.current = false }, 500)
    return !error
  }

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
