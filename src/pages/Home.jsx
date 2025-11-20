import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import './Home.css'

export default function Home() {
  const { user } = useAuth()
  const [habits, setHabits] = useState([])
  const [newHabitName, setNewHabitName] = useState('')
  const [loading, setLoading] = useState(true)
  const [completingHabit, setCompletingHabit] = useState(null)
  const [username, setUsername] = useState('')
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false)
  const [tempUsername, setTempUsername] = useState('')

  useEffect(() => {
    loadUserProfile()
    loadHabits()
  }, [user])

  async function loadUserProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data?.username) {
        setUsername(data.username)
      } else {
        // Kein Username gefunden - Prompt anzeigen
        setShowUsernamePrompt(true)
      }
    } catch (error) {
      console.error('Fehler beim Laden des Profils:', error)
      setShowUsernamePrompt(true)
    }
  }

  async function saveUsername(e) {
    e.preventDefault()
    if (!tempUsername.trim()) return

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          username: tempUsername.trim(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      
      setUsername(tempUsername.trim())
      setShowUsernamePrompt(false)
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      alert('Fehler beim Speichern des Namens')
    }
  }

  async function loadHabits() {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setHabits(data || [])
    } catch (error) {
      console.error('Fehler beim Laden der Habits:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addHabit(e) {
    e.preventDefault()
    if (!newHabitName.trim()) return

    try {
      const { data, error } = await supabase
        .from('habits')
        .insert([
          { 
            user_id: user.id, 
            name: newHabitName.trim(),
            completed_today: false
          }
        ])
        .select()

      if (error) throw error
      if (data) {
        setHabits([...habits, data[0]])
        setNewHabitName('')
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen:', error)
      alert('Fehler beim Hinzufügen des Habits')
    }
  }

  async function toggleHabit(habitId, currentStatus) {
    if (currentStatus) {
      // Bereits abgehakt - zurücksetzen
      try {
        const { error } = await supabase
          .from('habits')
          .update({ completed_today: false })
          .eq('id', habitId)

        if (error) throw error

        setHabits(habits.map(h => 
          h.id === habitId ? { ...h, completed_today: false } : h
        ))
      } catch (error) {
        console.error('Fehler beim Zurücksetzen:', error)
      }
    } else {
      // Abhaken mit Animation
      setCompletingHabit(habitId)

      try {
        // Completion in Datenbank speichern
        const { error: compError } = await supabase
          .from('habit_completions')
          .insert([
            { 
              habit_id: habitId,
              user_id: user.id,
              completed_at: new Date().toISOString()
            }
          ])

        if (compError) throw compError

        // Habit Status aktualisieren
        const { error: habitError } = await supabase
          .from('habits')
          .update({ 
            completed_today: true,
            last_completed: new Date().toISOString()
          })
          .eq('id', habitId)

        if (habitError) throw habitError

        // Animation abwarten, dann nach unten sortieren
        setTimeout(() => {
          setHabits(prev => {
            const updated = prev.map(h => 
              h.id === habitId ? { ...h, completed_today: true, last_completed: new Date().toISOString() } : h
            )
            // Sortiere: Nicht abgehakt oben, abgehakt unten
            return updated.sort((a, b) => {
              if (a.completed_today === b.completed_today) return 0
              return a.completed_today ? 1 : -1
            })
          })
          setCompletingHabit(null)
        }, 600)
      } catch (error) {
        console.error('Fehler beim Abhaken:', error)
        setCompletingHabit(null)
      }
    }
  }

  async function deleteHabit(habitId) {
    if (!confirm('Möchtest du dieses Habit wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', habitId)

      if (error) throw error
      setHabits(habits.filter(h => h.id !== habitId))
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      alert('Fehler beim Löschen des Habits')
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    )
  }

  if (showUsernamePrompt) {
    return (
      <div className="username-prompt-container">
        <div className="username-prompt-content">
          <h1>Willkommen! 👋</h1>
          <p>Wie möchtest du genannt werden?</p>
          <form onSubmit={saveUsername} className="username-form">
            <input
              type="text"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              placeholder="Dein Name"
              className="username-input"
              autoFocus
              maxLength={30}
            />
            <button type="submit" className="username-submit">
              Los geht's
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="home-header">
          <h1>Willkommen, {username}! 👋</h1>
          <p className="subtitle">Verfolge deine täglichen Gewohnheiten</p>
        </div>

        <form onSubmit={addHabit} className="add-habit-form">
          <input
            type="text"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="Neues Habit hinzufügen..."
            className="habit-input"
          />
          <button type="submit" className="add-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </form>

        <div className="habits-list">
          {habits.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
              </svg>
              <p>Noch keine Habits vorhanden</p>
              <span>Füge dein erstes Habit hinzu!</span>
            </div>
          ) : (
            habits.map((habit) => (
              <div 
                key={habit.id} 
                className={`habit-item ${habit.completed_today ? 'completed' : ''} ${completingHabit === habit.id ? 'completing' : ''}`}
              >
                <div className="habit-checkbox-wrapper" onClick={() => toggleHabit(habit.id, habit.completed_today)}>
                  <div className="habit-checkbox">
                    {habit.completed_today && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                  <span className="habit-name">{habit.name}</span>
                </div>
                <button 
                  onClick={() => deleteHabit(habit.id)} 
                  className="delete-button"
                  aria-label="Löschen"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
