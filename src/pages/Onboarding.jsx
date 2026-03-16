import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../AppContext'
import './Onboarding.css'

export default function Onboarding() {
  const { t, updateProfile } = useApp()
  const navigate = useNavigate()
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')

    const { data, error: err } = await updateProfile({
      display_name: trimmed,
      onboarding_done: true,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    // Profile updated in context (updateProfile calls setProfile internally)
    // Navigate immediately – don't wait for React re-render cycle
    navigate('/', { replace: true })
  }

  return (
    <div className="ob-page">
      <div className="ob-card card">
        <h1>{t.onboardingTitle}</h1>
        <p>{t.onboardingSubtitle}</p>
        {error && <div className="ob-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="ob-input"
            placeholder={t.namePlaceholder}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            autoFocus
          />
          <button
            type="submit"
            className="ob-btn"
            disabled={loading || !name.trim()}
          >
            {loading ? t.saving : t.letsGo}
          </button>
        </form>
      </div>
    </div>
  )
}
