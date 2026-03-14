import { useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../supabaseClient'
import './Home.css'

function calculateDaysLeft(deletedAt) {
  const scheduledDeletionDate = new Date(deletedAt)
  scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + 30)

  const msPerDay = 1000 * 60 * 60 * 24
  const diffInDays = Math.ceil((scheduledDeletionDate.getTime() - Date.now()) / msPerDay)

  return Math.max(0, diffInDays)
}

export default function Home() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) {
      return
    }

    const sessionFlag = `deletion_prompt_checked_${user.id}`
    if (sessionStorage.getItem(sessionFlag) === '1') {
      return
    }

    sessionStorage.setItem(sessionFlag, '1')

    const checkPendingDeletion = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('deleted_at')
          .eq('id', user.id)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        if (!data?.deleted_at) {
          return
        }

        const daysLeft = calculateDaysLeft(data.deleted_at)
        const shouldCancelDeletion = window.confirm(
          `Dein Account ist zur Loeschung markiert und wird in ${daysLeft} Tag(en) geloescht.\n\nMoechtest du die Loeschung abbrechen?`
        )

        if (!shouldCancelDeletion) {
          return
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            deleted_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) {
          throw updateError
        }

        window.alert('Die geplante Account-Loeschung wurde abgebrochen.')
      } catch (error) {
        console.error('Fehler beim Pruefen der Account-Loeschung:', error)
      }
    }

    checkPendingDeletion()
  }, [user])

  return (
    <main className="home-simple-container">
      <h1>Herzlich willkommen</h1>
    </main>
  )
}
