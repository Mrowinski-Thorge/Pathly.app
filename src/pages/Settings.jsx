import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../AppContext'
import './Settings.css'

export default function Settings() {
  const {
    user, profile, t, lang,
    updateProfile, signOut, updatePassword, verifyPassword,
    markForDeletion, cancelDeletion, loadProfile
  } = useApp()
  const navigate = useNavigate()

  const [msg, setMsg]               = useState({ type: '', text: '' })
  const [editName, setEditName]     = useState(false)
  const [nameVal, setNameVal]       = useState('')
  const [editPw, setEditPw]         = useState(false)
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [deletePw, setDeletePw]     = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [loading, setLoading]       = useState(false)

  const isDel = !!profile?.deleted_at

  const notify = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: '', text: '' }), 4000)
  }

  const saveName = async () => {
    if (!nameVal.trim()) return
    setLoading(true)
    const { error } = await updateProfile({ display_name: nameVal.trim() })
    error ? notify('error', error.message) : notify('success', t.nameSaved)
    setEditName(false); setLoading(false)
  }

  const savePw = async (e) => {
    e.preventDefault()
    if (newPw !== confirmPw) return notify('error', t.passwordMismatch)
    if (newPw.length < 6)   return notify('error', t.passwordTooShort)
    setLoading(true)
    const { error } = await updatePassword(newPw)
    if (error) notify('error', error.message)
    else { notify('success', t.passwordChanged); setEditPw(false); setNewPw(''); setConfirmPw('') }
    setLoading(false)
  }

  const confirmDelete = async (e) => {
    e.preventDefault()
    if (!deletePw) return
    setLoading(true)

    // Step 1: verify password
    const ok = await verifyPassword(deletePw)
    if (!ok) {
      notify('error', t.wrongPassword)
      setLoading(false)
      return
    }

    // Step 2: mark for deletion via RPC
    const { error: rpcErr } = await markForDeletion()
    if (rpcErr) {
      notify('error', rpcErr.message)
      setLoading(false)
      return
    }

    // Step 3: force-reload profile to confirm deleted_at is set
    const fresh = await loadProfile(user.id, true)
    if (!fresh?.deleted_at) {
      // RPC ran but no row was updated – shouldn't happen after Supabase fix
      notify('error', t.markFailedError)
      setLoading(false)
      return
    }

    notify('success', t.deletionMarkedMsg)
    setLoading(false)
    // Sign out after short delay so user can read the message
    setTimeout(() => signOut(), 2000)
  }

  const cancelDel = async () => {
    setLoading(true)
    const { error } = await cancelDeletion()
    if (error) notify('error', error.message)
    else { await loadProfile(user.id); notify('success', t.deletionCancelledMsg); setShowDelete(false) }
    setLoading(false)
  }

  const delDate = profile?.deleted_at
    ? (() => {
        const d = new Date(profile.deleted_at)
        d.setDate(d.getDate() + 30)
        return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE',
          { day:'2-digit', month:'2-digit', year:'numeric' })
      })()
    : ''

  const theme = profile?.theme || 'system'
  const lng   = profile?.language || 'de'

  return (
    <div className="sett-page">
      {/* Header */}
      <div className="sett-header">
        <button className="sett-back" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          {t.back}
        </button>
        <h1>{t.settingsNav}</h1>
        <div style={{width:60}}/>
      </div>

      <div className="sett-scroll">
        {msg.text && (
          <div className={`alert alert-${msg.type}`} style={{margin:'0 0 16px'}}>
            {msg.text}
          </div>
        )}

        {/* ── Allgemein ─────────────────── */}
        <p className="sett-section-lbl">{t.general}</p>
        <div className="sett-card card">

          {/* Name */}
          <div className="sett-row">
            <SIcon><PersonIcon/></SIcon>
            <div className="sett-info">
              <span className="sett-lbl">{t.displayName}</span>
              <span className="sett-desc">{profile?.display_name || '—'}</span>
            </div>
            {!editName && (
              <button className="sett-pill"
                onClick={() => { setNameVal(profile?.display_name || ''); setEditName(true) }}>
                {t.change}
              </button>
            )}
          </div>
          {editName && (
            <div className="sett-expand">
              <input type="text" className="form-input" maxLength={40} autoFocus
                value={nameVal} onChange={e => setNameVal(e.target.value)}
                placeholder={t.namePlaceholder} />
              <div className="sett-row-btns">
                <button className="btn btn-primary"
                  disabled={loading || !nameVal.trim()} onClick={saveName}>
                  {loading ? t.saving : t.save}
                </button>
                <button className="btn btn-secondary" onClick={() => setEditName(false)}>
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          <div className="sett-divider"/>

          {/* Sprache */}
          <div className="sett-row">
            <SIcon><GlobeIcon/></SIcon>
            <div className="sett-info">
              <span className="sett-lbl">{t.language}</span>
            </div>
            <div className="seg">
              <button className={`seg-btn${lng==='de'?' seg-on':''}`}
                onClick={() => updateProfile({ language:'de' })}>DE</button>
              <button className={`seg-btn${lng==='en'?' seg-on':''}`}
                onClick={() => updateProfile({ language:'en' })}>EN</button>
            </div>
          </div>

          <div className="sett-divider"/>

          {/* Darstellung */}
          <div className="sett-row">
            <SIcon><MoonIcon/></SIcon>
            <div className="sett-info">
              <span className="sett-lbl">{t.appearance}</span>
            </div>
            <div className="seg">
              <button className={`seg-btn${theme==='light'?' seg-on':''}`}
                onClick={() => updateProfile({ theme:'light' })}>{t.light}</button>
              <button className={`seg-btn${theme==='system'?' seg-on':''}`}
                onClick={() => updateProfile({ theme:'system' })}>{t.system}</button>
              <button className={`seg-btn${theme==='dark'?' seg-on':''}`}
                onClick={() => updateProfile({ theme:'dark' })}>{t.dark}</button>
            </div>
          </div>
        </div>

        {/* ── Account ───────────────────── */}
        <p className="sett-section-lbl">{t.account}</p>
        <div className="sett-card card">

          {/* E-Mail */}
          <div className="sett-row">
            <SIcon><MailIcon/></SIcon>
            <div className="sett-info">
              <span className="sett-lbl">{t.emailSetting}</span>
              <span className="sett-desc">{user?.email}</span>
            </div>
          </div>

          <div className="sett-divider"/>

          {/* Passwort */}
          <div className="sett-row">
            <SIcon><LockIcon/></SIcon>
            <div className="sett-info">
              <span className="sett-lbl">{t.changePassword}</span>
              <span className="sett-desc">{t.changePasswordDesc}</span>
            </div>
            {!editPw && (
              <button className="sett-pill" onClick={() => setEditPw(true)}>{t.change}</button>
            )}
          </div>
          {editPw && (
            <form className="sett-expand" onSubmit={savePw}>
              <input type="password" className="form-input" required minLength={6}
                placeholder={t.newPassword} value={newPw}
                onChange={e => setNewPw(e.target.value)} />
              <input type="password" className="form-input" required minLength={6}
                placeholder={t.confirmPassword} value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                style={{ marginTop: 8 }} />
              <div className="sett-row-btns">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? t.saving : t.save}
                </button>
                <button type="button" className="btn btn-secondary"
                  onClick={() => { setEditPw(false); setNewPw(''); setConfirmPw('') }}>
                  {t.cancel}
                </button>
              </div>
            </form>
          )}

          <div className="sett-divider"/>

          {/* Abmelden */}
          <div className="sett-row">
            <SIcon danger><LogoutIcon/></SIcon>
            <div className="sett-info">
              <span className="sett-lbl">{t.signOut}</span>
              <span className="sett-desc">{t.signOutDesc}</span>
            </div>
            <button className="sett-pill sett-pill-danger" onClick={signOut}>
              {t.signOut}
            </button>
          </div>

          <div className="sett-divider"/>

          {/* Account löschen */}
          <div className="sett-row">
            <SIcon danger><TrashIcon/></SIcon>
            <div className="sett-info">
              <span className="sett-lbl">{t.deleteAccount}</span>
              <span className="sett-desc">
                {isDel ? t.deletionScheduledDesc(delDate) : t.deleteAccountDesc}
              </span>
            </div>
            <button className="sett-pill sett-pill-danger"
              onClick={() => setShowDelete(!showDelete)}>
              {isDel ? t.viewStatus : t.deleteAccount}
            </button>
          </div>

          {showDelete && (
            isDel ? (
              <div className="sett-expand">
                <div className="sett-warn-icon"><WarnIcon/></div>
                <p className="sett-expand-desc">{t.deletionScheduledDesc(delDate)}</p>
                <div className="sett-row-btns">
                  <button className="btn btn-primary" disabled={loading} onClick={cancelDel}>
                    {loading ? '…' : t.cancelDeletion}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>
                    {t.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <form className="sett-expand" onSubmit={confirmDelete}>
                <div className="sett-warn-icon"><WarnIcon/></div>
                <p className="sett-expand-desc">{t.deleteConfirmText}</p>
                <input type="password" className="form-input" required
                  placeholder={t.currentPassword} value={deletePw}
                  onChange={e => setDeletePw(e.target.value)} />
                <div className="sett-row-btns">
                  <button type="submit" className="btn btn-danger"
                    disabled={loading || !deletePw}>
                    {loading ? t.deleting : t.confirmDeleteBtn}
                  </button>
                  <button type="button" className="btn btn-secondary"
                    onClick={() => { setShowDelete(false); setDeletePw('') }}>
                    {t.cancel}
                  </button>
                </div>
              </form>
            )
          )}
        </div>

        <div style={{ height: 110 }}/>
      </div>
    </div>
  )
}

/* ── Small helpers ──────────────────────────────────────────── */
function SIcon({ children, danger }) {
  return (
    <div className={`sett-icon${danger ? ' sett-icon-danger' : ''}`}>
      {children}
    </div>
  )
}
const PersonIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const GlobeIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
const MoonIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
const MailIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
const LockIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
const LogoutIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
const TrashIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
const WarnIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
