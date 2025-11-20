import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import './Statistics.css'

export default function Statistics() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalHabits: 0,
    completedToday: 0,
    weeklyCompletions: [],
    bestStreak: 0,
    totalCompletions: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStatistics()
  }, [user])

  async function loadStatistics() {
    try {
      // Habits laden
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)

      if (habitsError) throw habitsError

      // Completions der letzten 7 Tage
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const { data: completions, error: compError } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', weekAgo.toISOString())
        .order('completed_at', { ascending: true })

      if (compError) throw compError

      // Alle Completions für Streak-Berechnung
      const { data: allCompletions, error: allCompError } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })

      if (allCompError) throw allCompError

      // Statistiken berechnen
      const completedToday = habits?.filter(h => h.completed_today).length || 0
      const weeklyData = calculateWeeklyData(completions || [])
      const streak = calculateBestStreak(allCompletions || [])

      setStats({
        totalHabits: habits?.length || 0,
        completedToday,
        weeklyCompletions: weeklyData,
        bestStreak: streak,
        totalCompletions: allCompletions?.length || 0
      })
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error)
    } finally {
      setLoading(false)
    }
  }

  function calculateWeeklyData(completions) {
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    const today = new Date()
    const weekData = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const dayCompletions = completions.filter(c => {
        const compDate = new Date(c.completed_at)
        compDate.setHours(0, 0, 0, 0)
        return compDate.getTime() === date.getTime()
      }).length

      weekData.push({
        day: days[date.getDay()],
        count: dayCompletions,
        date: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
      })
    }

    return weekData
  }

  function calculateBestStreak(completions) {
    if (completions.length === 0) return 0

    const dates = [...new Set(completions.map(c => {
      const date = new Date(c.completed_at)
      date.setHours(0, 0, 0, 0)
      return date.getTime()
    }))].sort((a, b) => b - a)

    let currentStreak = 1
    let bestStreak = 1

    for (let i = 0; i < dates.length - 1; i++) {
      const diff = (dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24)
      
      if (diff === 1) {
        currentStreak++
        bestStreak = Math.max(bestStreak, currentStreak)
      } else {
        currentStreak = 1
      }
    }

    return bestStreak
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    )
  }

  const maxCount = Math.max(...stats.weeklyCompletions.map(d => d.count), 1)
  const completionRate = stats.totalHabits > 0 
    ? Math.round((stats.completedToday / stats.totalHabits) * 100) 
    : 0

  return (
    <div className="statistics-container">
      <div className="statistics-content">
        <div className="statistics-header">
          <h1>Statistiken</h1>
          <p className="subtitle">Dein Fortschritt im Überblick</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#000' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.completedToday}/{stats.totalHabits}</div>
              <div className="stat-label">Heute geschafft</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#ff6b00' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2c1.5 3 4 5 7 6-3 1-5.5 3-7 6-1.5-3-4-5-7-6 3-1 5.5-3 7-6z"/>
                <path d="M12 14c1 2 2.5 3.5 5 4-2.5.5-4 2-5 4-1-2-2.5-3.5-5-4 2.5-.5 4-2 5-4z"/>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.bestStreak}</div>
              <div className="stat-label">Beste Serie (Tage)</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#000' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.totalCompletions}</div>
              <div className="stat-label">Gesamt erledigt</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#000' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{completionRate}%</div>
              <div className="stat-label">Heutige Rate</div>
            </div>
          </div>
        </div>

        <div className="weekly-chart-container">
          <h2>Letzte 7 Tage</h2>
          <div className="weekly-chart">
            {stats.weeklyCompletions.map((day, index) => (
              <div key={index} className="chart-bar-wrapper">
                <div className="chart-bar-container">
                  <div 
                    className="chart-bar"
                    style={{ 
                      height: `${(day.count / maxCount) * 100}%`,
                      minHeight: day.count > 0 ? '8px' : '0'
                    }}
                  >
                    {day.count > 0 && <span className="bar-count">{day.count}</span>}
                  </div>
                </div>
                <div className="chart-label">
                  <div className="day-name">{day.day}</div>
                  <div className="day-date">{day.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {stats.totalHabits === 0 && (
          <div className="empty-stats">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <p>Noch keine Daten vorhanden</p>
            <span>Füge Habits hinzu, um deine Statistiken zu sehen</span>
          </div>
        )}
      </div>
    </div>
  )
}
