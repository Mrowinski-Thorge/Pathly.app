# Verbleibende Änderungen

## ✅ Abgeschlossen

1. **Sticky Header mit Streak und Prozent** - ✅
   - Header bleibt oben kleben beim Scrollen
   - Frosted Glass Effekt
   - Zeigt Streak und Prozent der heute erreichten Ziele

2. **Vereinfachtes Ziel-Formular** - ✅
   - Nur noch Aufgabenname erforderlich
   - Keine Wert/Einheit/Datum-Felder mehr
   - Tage-Auswahl volle Breite (7 Spalten Grid)

3. **Neue Statistik-Seite** - ✅
   - Streak-Anzeige (aktuell, längster, heute %)
   - Goals mit Fortschritt
   - Heutige Aufgaben Übersicht

## ⏳ Noch zu tun (manuell)

### 1. Settings-Icon Grafik korrigieren
Die Settings-Icon Komponente befindet sich in `/workspaces/Pathly.app/src/components/SettingsIcon.jsx`.
Das Zahnrad-SVG muss korrigiert werden - aktuell ist nur die Mitte richtig, aber der äußere Ring nicht.

**Korrektur:**
```jsx
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <circle cx="12" cy="12" r="3"></circle>
  <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"></path>
</svg>
```

### 2. Push-Benachrichtigungen in Einstellungen

In `/workspaces/Pathly.app/src/pages/Settings.jsx` hinzufügen:

```jsx
// State hinzufügen
const [notificationsEnabled, setNotificationsEnabled] = useState(false)

// Funktion hinzufügen
const toggleNotifications = async () => {
  if (!notificationsEnabled) {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotificationsEnabled(true)
        // TODO: Push subscription registrieren
      }
    }
  } else {
    setNotificationsEnabled(false)
    // TODO: Push subscription entfernen
  }
}

// In der Render-Funktion nach Dark Mode card einfügen:
<div className="card setting-card">
  <div className="setting-item">
    <div className="setting-info">
      <div className="setting-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </div>
      <div className="setting-text">
        <h3>Benachrichtigungen</h3>
        <p>Erinnerungen für deine Ziele</p>
      </div>
    </div>
    <button 
      onClick={toggleNotifications} 
      className={`toggle-button ${notificationsEnabled ? 'active' : ''}`}
    >
      <div className={`toggle-switch ${notificationsEnabled ? 'active' : ''}`}>
        <div className="toggle-slider"></div>
      </div>
    </button>
  </div>
</div>
```

### 3. AI Chat Badge kleiner machen

In `/workspaces/Pathly.app/src/pages/AIChat.jsx` oder wo das "Coming Soon" Badge ist:

```css
.coming-soon-badge {
  position: fixed;
  bottom: 90px; /* Über der Navbar */
  right: 20px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #000;
  z-index: 50;
}

.dark-mode .coming-soon-badge {
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  color: #fff;
}
```

### 4. Statistics.css mit Frosted Glass

Die `/workspaces/Pathly.app/src/pages/Statistics.css` muss neu erstellt werden.
Datei löschen und neu erstellen mit folgendem Inhalt:

```css
/* Siehe die komplette CSS-Datei im vorherigen Terminal-Versuch */
/* Wichtig: .frosted-glass Klasse zu allen Cards hinzufügen */
```

### 5. Datenbank Schema aktualisieren

Da wir jetzt Daily Tasks auch ohne Goals erstellen, muss `goal_id` nullable sein:

```sql
ALTER TABLE daily_tasks ALTER COLUMN goal_id DROP NOT NULL;
```

## Testing

Nach allen Änderungen:

1. Datenbank-Schema in Supabase ausführen
2. `npm run dev` starten
3. Testen:
   - Sticky Header scrollt mit
   - Prozent wird korrekt berechnet
   - Neue Aufgabe kann ohne Goal erstellt werden
   - Tage-Buttons sind alle gleich breit
   - Statistik-Seite zeigt Daten korrekt

## Bekannte Probleme

- Goal-System ist jetzt optional (Daily Tasks können ohne Goal existieren)
- Die alten Goal-bezogenen Funktionen müssen noch entfernt/angepasst werden
- increment_goal_progress Funktion wird nicht mehr benötigt wenn keine Goals verwendet werden
