import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import './Statistics.css'

export default function Statistics() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [weeklyData, setWeeklyData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGoals()
    loadWeeklyData()
  }, [user])

  async function loadGoals() {
    try {
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (goalsError) throw goalsError
      setGoals(goalsData || [])
    } catch (error) {
      console.error('Fehler beim Laden der Ziele:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadWeeklyData() {
    try {
      const last7Days = []
      const today = new Date()
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        const dayName = date.toLocaleDateString('de-DE', { weekday: 'short' })
        
        const { data, error } = await supabase
          .from('daily_task_completions')
          .select('id')
          .eq('user_id', user.id)
          .eq('completed_date', dateStr)
        
        if (error) throw error
        
        last7Days.push({
          date: dateStr,
          dayName: dayName,
          completed: data?.length || 0
        })
      }
      
      setWeeklyData(last7Days)
    } catch (error) {
      console.error('Fehler beim Laden der wöchentlichen Daten:', error)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="statistics-container">
      <div className="statistics-content">
        <div className="statistics-header">
          <h1>Statistik</h1>
        </div>

        {goals.length > 0 ? (
          <div className="goals-scroll-container">
            {goals.map(goal => {
              const progress = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
              const targetDate = new Date(goal.target_date)
              const formattedDate = targetDate.toLocaleDateString('de-DE', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
              })
              
              return (
                <div key={goal.id} className="goal-widget frosted-glass">
                  <div className="goal-widget-header">
                    <h3>{goal.title}</h3>
                    <span className="goal-widget-date">bis {formattedDate}</span>
                  </div>
                  
                  <div className="goal-widget-progress">
                    <div className="progress-circle">
                      <svg viewBox="0 0 100 100">
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          fill="none" 
                          stroke="rgba(0,0,0,0.1)" 
                          strokeWidth="8"
                        />
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          fill="none" 
                          stroke="#000" 
                          strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                          transform="rotate(-90 50 50)"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="progress-text">{progress}%</div>
                    </div>
                  </div>

                  <div className="goal-widget-stats">
                    <div className="stat-item">
                      <span className="stat-value">{goal.current_value}</span>
                      <span className="stat-label">Erreicht</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                      <span className="stat-value">{goal.target_value}</span>
                      <span className="stat-label">Ziel</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-stats frosted-glass">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <p>Noch keine Ziele</p>
            <span>Erstelle dein erstes Ziel auf der Home-Seite</span>
          </div>
        )}

        {/* 7-Tage-Ansicht */}
        <div className="weekly-view frosted-glass">
          <h2>Letzte 7 Tage</h2>
          <div className="week-bars">
            {weeklyData.map((day, index) => {
              const maxCompleted = Math.max(...weeklyData.map(d => d.completed), 1)
              const heightPercent = (day.completed / maxCompleted) * 100
              
              return (
                <div key={index} className="day-bar-container">
                  <div className="day-bar" style={{ height: `${heightPercent}%` }}>
                    <span className="bar-value">{day.completed}</span>
                  </div>
                  <span className="day-label">{day.dayName}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
