import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { useT } from '../useT'
import './Settings.css'

// ── Segmented Control ──────────────────────────────────────────────────────
function Seg({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          className={`seg-btn${value === o.value ? ' active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Row components ─────────────────────────────────────────────────────────
function Row({ icon, label, desc, children, danger }) {
  return (
    <div className={`s-row${danger ? ' s-row-danger' : ''}`}>
      <div className={`s-icon${danger ? ' s-icon-danger' : ''}`}>{icon}</div>
      <div className="s-info">
        <span className="s-label">{label}</span>
        {desc && <span className="s-desc">{desc}</span>}
      </div>
      {children && <div className="s-control">{children}</div>}
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────
const IconPerson  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IconGlobe   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
const IconSun     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
const IconMail    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
const IconLock    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
const IconLogout  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
const IconTrash   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
const IconWarn    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>

// ─────────────────────────────────────────────────────────────────────────────
export default function Settings() {
  const { user, profile, signOut, updatePassword, verifyPassword, updateProfile, markForDeletion, cancelDeletion } = useAuth()
  const t = useT()

  const [msg, setMsg] = useState({ type: '', text: '' })

  // Display name editing
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(profile?.display_name || '')
  const [nameSaving, setNameSaving] = useState(false)

  // Password change
  const [editingPw, setEditingPw] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  // Delete flow
  const [deleteStep, setDeleteStep] = useState(0) // 0=hidden, 1=form, 2=status
  const [deletePw, setDeletePw] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [cancellingDeletion, setCancellingDeletion] = useState(false)

  const isDeletionScheduled = !!profile?.deleted_at
  const deletionFormatted = isDeletionScheduled
    ? (() => {
        const d = new Date(profile.deleted_at)
        d.setDate(d.getDate() + 30)
        return d.toLocaleDateString(profile?.language === 'en' ? 'en-GB' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      })()
    : null

  // ── Handlers ────────────────────────────────────────────────────────────
  const saveName = async () => {
    const trimmed = nameVal.trim()
    if (!trimmed) return
    setNameSaving(true)
    const { error } = await updateProfile({ display_name: trimmed })
    setMsg(error ? { type: 'error', text: error.message } : { type: 'success', text: t('nameSaved') })
    setNameSaving(false)
    setEditingName(false)
  }

  const savePw = async (e) => {
    e.preventDefault()
    if (newPw !== confirmPw) { setMsg({ type: 'error', text: t('passwordMismatch') }); return }
    if (newPw.length < 6) { setMsg({ type: 'error', text: t('passwordTooShort') }); return }
    setPwSaving(true)
    const { error } = await updatePassword(newPw)
    if (error) { setMsg({ type: 'error', text: error.message }) }
    else { setMsg({ type: 'success', text: t('passwordChanged') }); setEditingPw(false); setNewPw(''); setConfirmPw('') }
    setPwSaving(false)
  }

  const handleDelete = async (e) => {
    e.preventDefault()
    setDeleting(true)
    const { error: authErr } = await verifyPassword(deletePw)
    if (authErr) { setMsg({ type: 'error', text: t('wrongPassword') }); setDeleting(false); return }
    const { error: delErr } = await markForDeletion()
    if (delErr) { setMsg({ type: 'error', text: delErr.message }); setDeleting(false); return }
    setMsg({ type: 'success', text: t('deletionSuccess') })
    setTimeout(() => signOut(), 2000)
    setDeleting(false)
    setDeleteStep(0)
  }

  const handleCancelDeletion = async () => {
    setCancellingDeletion(true)
    const { error } = await cancelDeletion()
    setMsg(error ? { type: 'error', text: error.message } : { type: 'success', text: t('deletionCancelled') })
    setCancellingDeletion(false)
    setDeleteStep(0)
  }

  // ── Language options ─────────────────────────────────────────────────────
  const langOptions = [
    { value: 'de', label: t('german') },
    { value: 'en', label: t('english') },
  ]
  const themeOptions = [
    { value: 'light', label: t('light') },
    { value: 'dark', label: t('dark') },
    { value: 'system', label: t('system') },
  ]

  return (
    <div className="settings-page scroll-y">
      <div className="settings-inner">
        <h1 className="settings-title">{t('settingsNav')}</h1>

        {msg.text && (
          <div className={`alert alert-${msg.type}`} onClick={() => setMsg({ type: '', text: '' })}>
            {msg.text}
          </div>
        )}

        {/* ── Allgemein ───────────────────────────────────────────────────── */}
        <p className="s-section-title">{t('general')}</p>
        <div className="s-card card">

          {/* Display name */}
          {!editingName ? (
            <Row icon={<IconPerson />} label={t('displayName')} desc={profile?.display_name || '—'}>
              <button className="s-action-btn" onClick={() => { setNameVal(profile?.display_name || ''); setEditingName(true) }}>
                {t('change')}
              </button>
            </Row>
          ) : (
            <div className="s-expanded">
              <p className="s-exp-title">{t('displayName')}</p>
              <input
                className="form-input"
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                placeholder={t('displayNamePlaceholder')}
                maxLength={50}
                autoFocus
              />
              <div className="s-btn-row">
                <button className="btn btn-primary" onClick={saveName} disabled={nameSaving || !nameVal.trim()}>
                  {nameSaving ? t('saving') : t('save')}
                </button>
                <button className="btn btn-secondary" onClick={() => setEditingName(false)} disabled={nameSaving}>
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Language */}
          <Row icon={<IconGlobe />} label={t('language')} desc={profile?.language === 'en' ? t('english') : t('german')}>
            <Seg
              value={profile?.language || 'de'}
              options={langOptions}
              onChange={(v) => updateProfile({ language: v })}
            />
          </Row>

          {/* Appearance */}
          <Row icon={<IconSun />} label={t('appearance')} desc="">
            <Seg
              value={profile?.theme || 'system'}
              options={themeOptions}
              onChange={(v) => updateProfile({ theme: v })}
            />
          </Row>
        </div>

        {/* ── Account ─────────────────────────────────────────────────────── */}
        <p className="s-section-title">{t('account')}</p>
        <div className="s-card card">

          {/* Email (read-only) */}
          <Row icon={<IconMail />} label={t('emailLabel')} desc={user?.email} />

          {/* Password */}
          {!editingPw ? (
            <Row icon={<IconLock />} label={t('changePassword')} desc={t('changePasswordDesc')}>
              <button className="s-action-btn" onClick={() => setEditingPw(true)}>{t('change')}</button>
            </Row>
          ) : (
            <div className="s-expanded">
              <p className="s-exp-title">{t('changePassword')}</p>
              <form onSubmit={savePw}>
                <div className="form-group">
                  <label className="form-label">{t('newPassword')}</label>
                  <input type="password" className="form-input" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={6} placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('confirmPassword')}</label>
                  <input type="password" className="form-input" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required minLength={6} placeholder="••••••••" />
                </div>
                <div className="s-btn-row">
                  <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                    {pwSaving ? t('saving') : t('save')}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setEditingPw(false); setNewPw(''); setConfirmPw('') }} disabled={pwSaving}>
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sign out */}
          <Row icon={<IconLogout />} label={t('signOut')} desc={t('signOutDesc')} danger>
            <button className="s-action-btn danger" onClick={() => signOut()}>{t('signOut')}</button>
          </Row>

          {/* Delete account */}
          {deleteStep === 0 && (
            <Row icon={<IconTrash />} label={t('deleteAccount')} desc={isDeletionScheduled ? `${t('deletionScheduledDesc')} – ${deletionFormatted}` : t('deleteAccountDesc')} danger>
              <button className="s-action-btn danger" onClick={() => setDeleteStep(isDeletionScheduled ? 2 : 1)}>
                {isDeletionScheduled ? t('viewStatus') : t('deleteAccount')}
              </button>
            </Row>
          )}

          {/* Delete: password confirmation form */}
          {deleteStep === 1 && (
            <div className="s-expanded">
              <div className="s-warn-icon"><IconWarn /></div>
              <p className="s-exp-title danger">{t('deleteConfirmTitle')}</p>
              <p className="s-exp-desc">{t('deleteConfirmText')}</p>
              <form onSubmit={handleDelete}>
                <div className="form-group">
                  <label className="form-label">{t('deletePasswordLabel')}</label>
                  <input type="password" className="form-input" value={deletePw} onChange={e => setDeletePw(e.target.value)} required placeholder="••••••••" />
                </div>
                <div className="s-btn-row">
                  <button type="submit" className="btn btn-danger" disabled={deleting || !deletePw}>
                    {deleting ? t('deleting') : t('deleteBtn')}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setDeleteStep(0); setDeletePw('') }} disabled={deleting}>
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Delete: already scheduled – show cancel option */}
          {deleteStep === 2 && (
            <div className="s-expanded">
              <div className="s-warn-icon"><IconWarn /></div>
              <p className="s-exp-title danger">{t('deleteConfirmTitle')}</p>
              <p className="s-exp-desc">{t('restoreText', deletionFormatted)}</p>
              <div className="s-btn-row">
                <button className="btn btn-primary" onClick={handleCancelDeletion} disabled={cancellingDeletion}>
                  {cancellingDeletion ? '…' : t('cancelDeletion')}
                </button>
                <button className="btn btn-secondary" onClick={() => setDeleteStep(0)} disabled={cancellingDeletion}>
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* bottom padding so content clears BottomNav */}
        <div style={{ height: 100 }} />
      </div>
    </div>
  )
}
