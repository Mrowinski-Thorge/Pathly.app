import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { useT } from '../useT'
import './Onboarding.css'

export default function Onboarding() {
  const { updateProfile } = useAuth()
  const t = useT()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError(t('nameRequired')); return }
    setLoading(true)
    setError('')
    const { error: err } = await updateProfile({ display_name: trimmed, onboarding_done: true })
    if (err) { setError(err.message); setLoading(false) }
    // On success, profile.onboarding_done becomes true → App.jsx redirects to /
  }

  return (
    <div className="ob-page">
      <div className="ob-card">
        <h1>{t('onboardingTitle')}</h1>
        <p>{t('onboardingSubtitle')}</p>
        {error && <p className="ob-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            className="ob-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('onboardingPlaceholder')}
            maxLength={50}
            autoFocus
          />
          <button className="ob-btn" type="submit" disabled={!name.trim() || loading}>
            {loading ? '…' : t('onboardingBtn')}
          </button>
        </form>
      </div>
    </div>
  )
}
