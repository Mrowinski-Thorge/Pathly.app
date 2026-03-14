import { useNavigate, useLocation } from 'react-router-dom'
import { useT } from '../useT'
import './BottomNav.css'

const HomeIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const SettingsIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()

  const items = [
    { path: '/',         label: t('home'),        Icon: HomeIcon },
    { path: '/settings', label: t('settingsNav'), Icon: SettingsIcon },
  ]

  return (
    <nav className="bnav">
      <div className="bnav-pill">
        {items.map(({ path, label, Icon }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              className={`bnav-btn${active ? ' active' : ''}`}
              onClick={() => navigate(path)}
              aria-label={label}
            >
              <span className="bnav-icon"><Icon active={active} /></span>
              <span className="bnav-label">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
