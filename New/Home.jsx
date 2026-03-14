import { useAuth } from '../AuthContext'
import { useT } from '../useT'
import './Home.css'

export default function Home() {
  const { profile } = useAuth()
  const t = useT()

  return (
    <main className="home-page">
      <h1 className="home-welcome">{t('welcomeMsg', profile?.display_name)}</h1>
    </main>
  )
}
