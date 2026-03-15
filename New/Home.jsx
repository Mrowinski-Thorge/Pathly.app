import { useApp } from '../AppContext'
import './Home.css'

export default function Home() {
  const { profile, t } = useApp()
  return (
    <main className="home-container">
      <h1>{t.welcome(profile?.display_name)}</h1>
    </main>
  )
}
