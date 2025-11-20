# Push-Benachrichtigungen - Implementierungsplan

## Übersicht
Die App soll Benachrichtigungen zu folgenden Zeitpunkten senden:

1. **Daily Reminder um 16:00 Uhr**
   - Text: "Vergiss deine täglichen Ziele nicht! 🔥🔥🔥"
   - Nur an Tagen wo noch nicht alle Daily-Ziele erreicht wurden

2. **Tagesabschluss am Ende des Tages**
   - Zeigt an was man geschafft hat (Anzahl erreichte Daily-Ziele)
   - Nur wenn mindestens ein Ziel erreicht wurde

## Technische Umsetzung

### 1. Service Worker Setup
```bash
npm install workbox-webpack-plugin
```

Erstelle `public/service-worker.js`:
```javascript
self.addEventListener('push', function(event) {
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200]
  }
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})
```

### 2. Push-Benachrichtigungen aktivieren
In `src/main.jsx` oder einer neuen `src/utils/notifications.js`:

```javascript
export async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      // Registriere Service Worker
      const registration = await navigator.serviceWorker.register('/service-worker.js')
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: '<YOUR_VAPID_PUBLIC_KEY>'
      })
      
      // Sende subscription an Backend
      await saveSubscription(subscription)
    }
  }
}

async function saveSubscription(subscription) {
  const { data: { user } } = await supabase.auth.getUser()
  
  await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      subscription: subscription,
      updated_at: new Date().toISOString()
    })
}
```

### 3. Datenbank-Tabelle für Subscriptions
```sql
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);
```

### 4. Backend für geplante Benachrichtigungen
Benötigt einen Cron-Job oder Supabase Edge Function:

#### 16:00 Uhr Daily Reminder
```typescript
// supabase/functions/daily-reminder/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(...)
  
  // Hole alle User die heute noch nicht fertig sind
  const today = new Date().toISOString().split('T')[0]
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' })
  
  const { data: incompleteTasks } = await supabase
    .from('daily_tasks')
    .select('user_id')
    .contains('active_days', [dayName])
    .not('id', 'in', `(
      SELECT daily_task_id FROM daily_task_completions 
      WHERE completed_date = '${today}'
    )`)
  
  const userIds = [...new Set(incompleteTasks.map(t => t.user_id))]
  
  // Hole subscriptions und sende notifications
  for (const userId of userIds) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
    
    for (const sub of subs) {
      await sendPushNotification(sub.subscription, {
        title: 'Pathly',
        body: 'Vergiss deine täglichen Ziele nicht! 🔥🔥🔥'
      })
    }
  }
  
  return new Response('OK')
})
```

#### Tagesabschluss
Ähnliche Logik für Ende des Tages (z.B. 23:00 Uhr)

### 5. Aktivierung in der App
In `src/pages/Settings.jsx` einen neuen Bereich hinzufügen:

```jsx
<div className="card setting-card">
  <div className="setting-item">
    <div className="setting-info">
      <div className="setting-icon">
        <svg><!-- Bell Icon --></svg>
      </div>
      <div className="setting-text">
        <h3>Push-Benachrichtigungen</h3>
        <p>Erinnerungen für deine Ziele</p>
      </div>
    </div>
    <button onClick={requestNotificationPermission} className="btn btn-primary">
      Aktivieren
    </button>
  </div>
</div>
```

## Web Push VAPID Keys generieren
```bash
npm install web-push -g
web-push generate-vapid-keys
```

Die Keys in Supabase Edge Function Environment Variables speichern.

## Hinweise
- iOS Safari unterstützt Web Push erst ab iOS 16.4
- Benachrichtigungen funktionieren nur über HTTPS
- Service Worker muss im Root registriert werden
- Cron-Jobs können über Supabase, Vercel Cron oder GitHub Actions implementiert werden
