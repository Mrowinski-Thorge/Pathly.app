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
    if (!name.trim()) return
    setLoading(true); setError('')
    const { error: err } = await updateProfile({
      display_name: name.trim(),
      onboarding_done: true,
    })
    if (err) { setError(err.message); setLoading(false) }
    else navigate('/', { replace: true })
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card card">
        <h1>{t.onboardingTitle}</h1>
        <p>{t.onboardingSubtitle}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text" className="form-input onboarding-input"
            placeholder={t.namePlaceholder}
            value={name} onChange={e => setName(e.target.value)}
            maxLength={40} autoFocus
          />
          <button type="submit" className="btn btn-primary btn-full"
            disabled={loading || !name.trim()}>
            {loading ? t.saving : t.letsGo}
          </button>
        </form>
      </div>
    </div>
  )
}
