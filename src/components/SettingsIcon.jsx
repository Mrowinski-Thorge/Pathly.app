import { useNavigate } from 'react-router-dom'
import './SettingsIcon.css'

export default function SettingsIcon() {
  const navigate = useNavigate()

  return (
    <button 
      className="floating-settings-button"
      onClick={() => navigate('/settings')}
      aria-label="Einstellungen"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15c.1-.3.1-.6.1-1s0-.7-.1-1l2.1-1.6c.2-.1.2-.4.1-.6l-2-3.5c-.1-.2-.4-.3-.6-.2l-2.5 1c-.5-.4-1.1-.7-1.7-1l-.4-2.6c0-.2-.2-.4-.5-.4h-4c-.3 0-.5.2-.5.4l-.4 2.7c-.6.2-1.1.6-1.7 1l-2.4-1c-.3-.1-.5 0-.7.2l-2 3.5c-.1.2-.1.5.1.6l2.1 1.6c-.1.3-.1.6-.1 1s0 .7.1 1l-2.1 1.6c-.2.1-.2.4-.1.6l2 3.5c.1.2.4.3.6.2l2.5-1c.5.4 1.1.7 1.7 1l.4 2.6c0 .2.2.4.5.4h4c.3 0 .5-.2.5-.4l.4-2.7c.6-.2 1.2-.6 1.7-1l2.4 1c.3.1.5 0 .7-.2l2-3.5c.1-.2.1-.5-.1-.6l-2.1-1.6z"></path>
      </svg>
    </button>
  )
}
