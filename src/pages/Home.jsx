import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import SettingsIcon from '../components/SettingsIcon'
import './Home.css'

export default function Home() {
  const { user } = useAuth()
  const [username, setUsername] = useState('')
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false)
  const [tempUsername, setTempUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(0)
  const [completionPercentage, setCompletionPercentage] = useState(0)
  const [goals, setGoals] = useState([])
  const [showCreateGoal, setShowCreateGoal] = useState(false)

  // Form states for new goal
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetDate: '',
    dailyTitle: '',
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  })

  useEffect(() => {
    loadUserProfile()
    loadStreak()
    loadGoals()
    calculateCompletionPercentage()
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
        setShowUsernamePrompt(true)
      }
    } catch (error) {
      console.error('Fehler beim Laden des Profils:', error)
      setShowUsernamePrompt(true)
    } finally {
      setLoading(false)
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

  async function loadStreak() {
    try {
      const { data, error } = await supabase
        .from('streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        if (error.code !== 'PGRST116') throw error
      }
      
      if (data) {
        setStreak(data.current_streak || 0)
      }
    } catch (error) {
      console.error('Fehler beim Laden des Streaks:', error)
    }
  }

  async function loadGoals() {
    try {
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select(`
          *,
          daily_tasks (
            id,
            title,
            target_value,
            active_days
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (goalsError) throw goalsError
      setGoals(goalsData || [])
    } catch (error) {
      console.error('Fehler beim Laden der Ziele:', error)
    }
  }

  async function calculateCompletionPercentage() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const dayName = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' })

      // Get all active tasks for today
      const { data: tasksData, error: tasksError } = await supabase
        .from('daily_tasks')
        .select('id')
        .eq('user_id', user.id)
        .contains('active_days', [dayName])

      if (tasksError) throw tasksError

      const totalTasks = tasksData?.length || 0
      if (totalTasks === 0) {
        setCompletionPercentage(0)
        return
      }

      // Get today's completions
      const { data: completionsData, error: completionsError } = await supabase
        .from('daily_task_completions')
        .select('daily_task_id')
        .eq('user_id', user.id)
        .eq('completed_date', today)

      if (completionsError) throw completionsError

      const completedTasks = completionsData?.length || 0
      const percentage = Math.round((completedTasks / totalTasks) * 100)
      setCompletionPercentage(percentage)
    } catch (error) {
      console.error('Fehler beim Berechnen der Completion Percentage:', error)
    }
  }

  async function createGoal(e) {
    e.preventDefault()
    
    if (!newGoal.title || !newGoal.targetDate) {
      alert('Bitte fülle alle Felder aus')
      return
    }
    
    try {
      // Create goal
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: newGoal.title,
          target_date: newGoal.targetDate,
          target_value: 100,
          unit: '%',
          current_value: 0
        })
        .select()
        .single()

      if (goalError) throw goalError

      // Create daily task linked to goal
      const { error: taskError } = await supabase
        .from('daily_tasks')
        .insert({
          goal_id: goalData.id,
          user_id: user.id,
          title: newGoal.dailyTitle,
          target_value: 1,
          unit: 'mal',
          active_days: newGoal.activeDays
        })

      if (taskError) throw taskError

      // Reset form and reload
      setNewGoal({
        title: '',
        targetDate: '',
        dailyTitle: '',
        activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      })
      setShowCreateGoal(false)
      await loadGoals()
      await calculateCompletionPercentage()
    } catch (error) {
      console.error('Fehler beim Erstellen des Ziels:', error)
      alert('Fehler beim Erstellen des Ziels')
    }
  }

  async function completeTask(goalId, dailyTaskId) {
    const today = new Date().toISOString().split('T')[0]
    
    try {
      // Check if already completed today (prevent double-counting)
      const { data: existingCompletion, error: checkError } = await supabase
        .from('daily_task_completions')
        .select('id')
        .eq('daily_task_id', dailyTaskId)
        .eq('completed_date', today)
        .maybeSingle()

      if (checkError) throw checkError

      if (existingCompletion) {
        alert('Heute bereits erledigt!')
        return
      }

      // Add completion
      const { error: completionError } = await supabase
        .from('daily_task_completions')
        .insert({
          daily_task_id: dailyTaskId,
          user_id: user.id,
          completed_value: 1,
          completed_date: today
        })

      if (completionError) throw completionError

      // Update goal progress (add 1% per completion)
      const goal = goals.find(g => g.id === goalId)
      if (goal) {
        const newProgress = Math.min(100, goal.current_value + 1)
        const { error: updateError } = await supabase
          .from('goals')
          .update({ current_value: newProgress })
          .eq('id', goalId)

        if (updateError) throw updateError
      }

      // Update streak
      await updateStreak()

      // Reload data
      await loadGoals()
      await calculateCompletionPercentage()
    } catch (error) {
      console.error('Fehler beim Abschließen der Aufgabe:', error)
      alert('Fehler beim Abschließen der Aufgabe')
    }
  }

  async function updateStreak() {
    const today = new Date().toISOString().split('T')[0]
    
    try {
      const { data: existingStreak, error: fetchError } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (existingStreak) {
        const lastDate = existingStreak.last_completion_date
        const currentStreak = existingStreak.current_streak || 0
        
        let newStreak = currentStreak
        if (lastDate === today) {
          // Already counted today
          return
        } else if (lastDate) {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = yesterday.toISOString().split('T')[0]
          
          if (lastDate === yesterdayStr) {
            newStreak = currentStreak + 1
          } else {
            newStreak = 1
          }
        } else {
          newStreak = 1
        }

        const longestStreak = Math.max(existingStreak.longest_streak || 0, newStreak)

        const { error } = await supabase
          .from('streaks')
          .update({
            current_streak: newStreak,
            longest_streak: longestStreak,
            last_completion_date: today
          })
          .eq('user_id', user.id)

        if (error) throw error
        setStreak(newStreak)
      } else {
        // Create new streak
        const { error } = await supabase
          .from('streaks')
          .insert({
            user_id: user.id,
            current_streak: 1,
            longest_streak: 1,
            last_completion_date: today
          })

        if (error) throw error
        setStreak(1)
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Streaks:', error)
    }
  }

  function toggleDay(day) {
    setNewGoal(prev => ({
      ...prev,
      activeDays: prev.activeDays.includes(day)
        ? prev.activeDays.filter(d => d !== day)
        : [...prev.activeDays, day]
    }))
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
        <div className="username-prompt-content frosted-glass">
          <h1>Willkommen</h1>
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
      <SettingsIcon />

      {/* Sticky Header */}
      <div className="home-header-sticky frosted-glass">
        <div className="home-header-content">
          <h1>Willkommen, {username}</h1>
          
          {/* Streak Display */}
          <div className="streak-display">
            <div className="streak-item">
              <div className="streak-icon">🔥</div>
              <div className="streak-info">
                <div className="streak-number">{streak}</div>
                <div className="streak-label">Tage Streak</div>
              </div>
            </div>
            <div className="streak-divider"></div>
            <div className="streak-item">
              <div className="today-percentage">{completionPercentage}%</div>
              <div className="today-label">Heute erreicht</div>
            </div>
          </div>
        </div>
      </div>

      <div className="home-content">
        {/* Goals List */}
        {goals.length > 0 && (
          <div className="goals-section">
            <h2>Deine Ziele</h2>
            <div className="goals-list">
              {goals.map(goal => {
                const progress = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                const targetDate = new Date(goal.target_date)
                const formattedDate = targetDate.toLocaleDateString('de-DE', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                })
                
                return (
                  <div key={goal.id} className="goal-card frosted-glass">
                    <div className="goal-header">
                      <div className="goal-title-large">{goal.title}</div>
                      <div className="goal-date-large">bis {formattedDate}</div>
                    </div>
                    
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    
                    <div className="goal-stats">
                      <span className="goal-progress">{progress}% erreicht</span>
                    </div>

                    {/* Daily Tasks for this goal */}
                    {goal.daily_tasks && goal.daily_tasks.length > 0 && (
                      <div className="goal-daily-tasks">
                        <h4>Tägliche Aufgaben:</h4>
                        {goal.daily_tasks.map(task => (
                          <div 
                            key={task.id} 
                            className="daily-task-button"
                            onClick={() => completeTask(goal.id, task.id)}
                          >
                            <span>{task.title}</span>
                            <span className="task-arrow">→</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {goals.length === 0 && !showCreateGoal && (
          <div className="empty-state frosted-glass">
            <h2>Noch keine Ziele</h2>
            <p>Erstelle dein erstes Ziel und beginne deine Reise!</p>
          </div>
        )}

        {/* Create New Goal Button */}
        {!showCreateGoal && (
          <button className="btn-create-goal frosted-glass" onClick={() => setShowCreateGoal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Neues Ziel erstellen
          </button>
        )}

        {/* Create Goal Form */}
        {showCreateGoal && (
          <div className="create-goal-form frosted-glass">
            <h2>Neues Ziel erstellen</h2>
            <form onSubmit={createGoal}>
              <div className="form-section">
                <h3>Zielname</h3>
                <input
                  type="text"
                  placeholder="z.B. 2 Marathons laufen"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-section">
                <h3>Bis wann?</h3>
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
                  required
                />
              </div>

              <div className="form-section">
                <h3>Tägliche Aufgabe</h3>
                <input
                  type="text"
                  placeholder="z.B. 5 km laufen"
                  value={newGoal.dailyTitle}
                  onChange={(e) => setNewGoal({...newGoal, dailyTitle: e.target.value})}
                  required
                />
              </div>

              <div className="form-section">
                <h3>Aktive Tage</h3>
                <div className="days-selector">
                  {[
                    { key: 'monday', label: 'Mo' },
                    { key: 'tuesday', label: 'Di' },
                    { key: 'wednesday', label: 'Mi' },
                    { key: 'thursday', label: 'Do' },
                    { key: 'friday', label: 'Fr' },
                    { key: 'saturday', label: 'Sa' },
                    { key: 'sunday', label: 'So' }
                  ].map(day => (
                    <button
                      key={day.key}
                      type="button"
                      className={`day-btn ${newGoal.activeDays.includes(day.key) ? 'active' : ''}`}
                      onClick={() => toggleDay(day.key)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-submit">Erstellen</button>
                <button type="button" className="btn-cancel" onClick={() => setShowCreateGoal(false)}>
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
