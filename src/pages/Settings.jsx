import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../AppContext'
import './Settings.css'

export default function Settings() {
  const { user, profile, t, lang, updateProfile, signOut, updatePassword, verifyPassword, markForDeletion, cancelDeletion, loadProfile } = useApp()
  const navigate = useNavigate()

  const [msg, setMsg]               = useState({ type: '', text: '' })
  const [editName, setEditName]     = useState(false)
  const [nameVal, setNameVal]       = useState(profile?.display_name || '')
  const [editPw, setEditPw]         = useState(false)
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [deletePw, setDeletePw]     = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [loading, setLoading]       = useState(false)

  const isDeletionScheduled = !!profile?.deleted_at

  const notify = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: '', text: '' }), 4000)
  }

  const handleSaveName = async () => {
    if (!nameVal.trim()) return
    setLoading(true)
    const { error } = await updateProfile({ display_name: nameVal.trim() })
    if (error) notify('error', error.message)
    else       notify('success', t.nameSaved)
    setEditName(false); setLoading(false)
  }

  const handleChangePw = async (e) => {
    e.preventDefault()
    if (newPw !== confirmPw) return notify('error', t.passwordMismatch)
    if (newPw.length < 6)   return notify('error', t.passwordTooShort)
    setLoading(true)
    const { error } = await updatePassword(newPw)
    if (error) notify('error', error.message)
    else { notify('success', t.passwordChanged); setEditPw(false); setNewPw(''); setConfirmPw('') }
    setLoading(false)
  }

  const handleDeleteConfirm = async (e) => {
    e.preventDefault()
    if (!deletePw) return
    setLoading(true)
    const ok = await verifyPassword(deletePw)
    if (!ok) { notify('error', t.wrongPassword); setLoading(false); return }
    const { error } = await markForDeletion()
    if (error) { notify('error', error.message); setLoading(false); return }
    notify('success', t.deletionMarkedMsg)
    setTimeout(() => signOut(), 2200)
    setLoading(false)
  }

  const handleCancelDeletion = async () => {
    setLoading(true)
    const { error } = await cancelDeletion()
    if (error) notify('error', error.message)
    else { await loadProfile(user.id); notify('success', t.deletionCancelledMsg); setShowDelete(false) }
    setLoading(false)
  }

  const formattedDeletionDate = profile?.deleted_at
    ? (() => {
        const d = new Date(profile.deleted_at); d.setDate(d.getDate() + 30)
        return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
      })()
    : ''

  const currentTheme = profile?.theme || 'system'
  const currentLang  = profile?.language || 'de'

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          {t.back}
        </button>
        <h1>{t.settingsNav}</h1>
      </div>

      <div className="settings-scroll">
        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        {/* ── Allgemein ─────────────────────────────────── */}
        <p className="section-label">{t.general}</p>
        <div className="settings-section card">

          {/* Anzeigename */}
          <div className="setting-row">
            <div className="setting-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="setting-info">
              <span className="setting-title">{t.displayName}</span>
              <span className="setting-desc">{profile?.display_name || t.displayNameDesc}</span>
            </div>
            {!editName && (
              <button className="row-action-btn"
                onClick={() => { setEditName(true); setNameVal(profile?.display_name || '') }}>
                {t.change}
              </button>
            )}
          </div>
          {editName && (
            <div className="inline-form">
              <input type="text" className="form-input" maxLength={40}
                value={nameVal} onChange={e => setNameVal(e.target.value)}
                placeholder={t.namePlaceholder} autoFocus />
              <div className="inline-actions">
                <button className="btn btn-primary" disabled={loading || !nameVal.trim()} onClick={handleSaveName}>
                  {loading ? t.saving : t.save}
                </button>
                <button className="btn btn-secondary" onClick={() => setEditName(false)}>{t.cancel}</button>
              </div>
            </div>
          )}

          <div className="row-divider"/>

          {/* Sprache */}
          <div className="setting-row">
            <div className="setting-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
              </svg>
            </div>
            <div className="setting-info">
              <span className="setting-title">{t.language}</span>
            </div>
            <div className="segmented">
              <button className={currentLang === 'de' ? 'seg-active' : ''} onClick={() => updateProfile({ language: 'de' })}>DE</button>
              <button className={currentLang === 'en' ? 'seg-active' : ''} onClick={() => updateProfile({ language: 'en' })}>EN</button>
            </div>
          </div>

          <div className="row-divider"/>

          {/* Darstellung */}
          <div className="setting-row">
            <div className="setting-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </div>
            <div className="setting-info">
              <span className="setting-title">{t.appearance}</span>
            </div>
            <div className="segmented">
              <button className={currentTheme === 'light'  ? 'seg-active' : ''} onClick={() => updateProfile({ theme: 'light' })}>{t.light}</button>
              <button className={currentTheme === 'system' ? 'seg-active' : ''} onClick={() => updateProfile({ theme: 'system' })}>{t.system}</button>
              <button className={currentTheme === 'dark'   ? 'seg-active' : ''} onClick={() => updateProfile({ theme: 'dark' })}>{t.dark}</button>
            </div>
          </div>
        </div>

        {/* ── Account ───────────────────────────────────── */}
        <p className="section-label">{t.account}</p>
        <div className="settings-section card">

          {/* E-Mail */}
          <div className="setting-row">
            <div className="setting-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div className="setting-info">
              <span className="setting-title">{t.emailSetting}</span>
              <span className="setting-desc">{user?.email}</span>
            </div>
          </div>

          <div className="row-divider"/>

          {/* Passwort */}
          <div className="setting-row">
            <div className="setting-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div className="setting-info">
              <span className="setting-title">{t.changePassword}</span>
              <span className="setting-desc">{t.changePasswordDesc}</span>
            </div>
            {!editPw && (
              <button className="row-action-btn" onClick={() => setEditPw(true)}>{t.change}</button>
            )}
          </div>
          {editPw && (
            <form className="inline-form" onSubmit={handleChangePw}>
              <input type="password" className="form-input" required minLength={6}
                placeholder={t.newPassword} value={newPw} onChange={e => setNewPw(e.target.value)} />
              <input type="password" className="form-input" required minLength={6} style={{marginTop:8}}
                placeholder={t.confirmPassword} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
              <div className="inline-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? t.saving : t.save}</button>
                <button type="button" className="btn btn-secondary"
                  onClick={() => { setEditPw(false); setNewPw(''); setConfirmPw('') }}>{t.cancel}</button>
              </div>
            </form>
          )}

          <div className="row-divider"/>

          {/* Abmelden */}
          <div className="setting-row">
            <div className="setting-icon setting-icon-danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <div className="setting-info">
              <span className="setting-title">{t.signOut}</span>
              <span className="setting-desc">{t.signOutDesc}</span>
            </div>
            <button className="row-action-btn row-danger-btn" onClick={signOut}>{t.signOut}</button>
          </div>

          <div className="row-divider"/>

          {/* Account löschen */}
          <div className="setting-row">
            <div className="setting-icon setting-icon-danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </div>
            <div className="setting-info">
              <span className="setting-title">{t.deleteAccount}</span>
              <span className="setting-desc">
                {isDeletionScheduled ? t.deletionScheduledDesc(formattedDeletionDate) : t.deleteAccountDesc}
              </span>
            </div>
            <button className="row-action-btn row-danger-btn" onClick={() => setShowDelete(!showDelete)}>
              {isDeletionScheduled ? t.viewStatus : t.deleteAccount}
            </button>
          </div>

          {showDelete && (
            isDeletionScheduled ? (
              <div className="inline-form">
                <p className="delete-info-text">{t.deletionScheduledDesc(formattedDeletionDate)}</p>
                <div className="inline-actions">
                  <button className="btn btn-primary" disabled={loading} onClick={handleCancelDeletion}>
                    {loading ? '…' : t.cancelDeletion}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>{t.cancel}</button>
                </div>
              </div>
            ) : (
              <form className="inline-form" onSubmit={handleDeleteConfirm}>
                <p className="delete-info-text">{t.deleteConfirmText}</p>
                <input type="password" className="form-input" required
                  placeholder={t.currentPassword} value={deletePw} onChange={e => setDeletePw(e.target.value)} />
                <div className="inline-actions">
                  <button type="submit" className="btn btn-danger" disabled={loading || !deletePw}>
                    {loading ? t.deleting : t.confirmDeleteBtn}
                  </button>
                  <button type="button" className="btn btn-secondary"
                    onClick={() => { setShowDelete(false); setDeletePw('') }}>{t.cancel}</button>
                </div>
              </form>
            )
          )}
        </div>

        <div style={{height: 100}}/>
      </div>
    </div>
  )
}
