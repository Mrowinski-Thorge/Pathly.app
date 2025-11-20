import './AIChat.css'

export default function AIChat() {
  return (
    <div className="ai-chat-container">
      <div className="ai-chat-content">
        <div className="ai-chat-header">
          <h1>AI-Chat</h1>
          <p className="subtitle">Dein persönlicher Habit-Coach</p>
        </div>

        <div className="coming-soon-section">
          <div className="coming-soon-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <path d="M8 10h.01M12 10h.01M16 10h.01"></path>
            </svg>
          </div>
          <h2>Kommt bald</h2>
          <p>Wir arbeiten an einer intelligenten Chat-Funktion, die dir hilft, deine Habits zu optimieren und motiviert zu bleiben.</p>
          
          <div className="feature-preview">
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              <span>Persönliche Tipps & Motivation</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Habit-Empfehlungen</span>
            </div>
            <div className="feature-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span>Fortschritts-Analyse</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
