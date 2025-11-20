# Update: Neue Home-Seite mit Ziel-Tracking

## Änderungen

### 1. Datenbank (database_setup.sql)
- **Neue Tabellen:**
  - `goals`: Hauptziele (z.B. "2 Marathons laufen")
  - `daily_tasks`: Tägliche Aufgaben (z.B. "5 km laufen")
  - `daily_task_completions`: Tracking der täglichen Erledigungen
  - `streaks`: Streak-Tracking für User
  
- **Soft-Delete:**
  - `profiles.deleted_at`: Feld für Soft-Delete
  - Funktion `delete_old_marked_accounts()`: Löscht Accounts nach 30 Tagen
  
- **Neue Funktionen:**
  - `increment_goal_progress()`: Erhöht Goal-Fortschritt automatisch

### 2. Home-Seite (src/pages/Home.jsx & Home.css)
**Komplett neu gestaltet mit Frosted Glass Design:**

- **Oben rechts:** Settings-Icon (immer sichtbar)
- **Willkommenstext:** "Willkommen, {Name}" - ohne Emoji
- **Streak-Anzeige:** 🔥 Orange Flamme mit Anzahl Tage
- **Heutige Aufgaben:** Liste der Daily-Tasks
  - Grüner Haken wenn erledigt
  - Schwarz-weiß wenn nicht erledigt
  - Keine Doppelzählung am selben Tag
  
- **Ziele-Fortschritt:** 
  - Prozentanzeige
  - Fortschrittsbalken
  - Zielwert und Deadline
  
- **Neues Ziel erstellen:**
  - Hauptziel (z.B. 2 Marathons bis 31.12.2025)
  - Daily-Ziel (z.B. 5 km täglich)
  - Tage-Auswahl (Mo-So frei wählbar)

- **Gestern-Info:**
  - Zeigt beim ersten Öffnen des Tages was gestern geschafft wurde
  - Wird nur einmal pro Tag angezeigt

### 3. Settings (src/pages/Settings.jsx)
**Account-Löschung:**
- Soft-Delete: Account wird für Löschung markiert
- 30 Tage Wartezeit
- Bei erneutem Login wird Löschung abgebrochen
- Automatische Löschung nach 30 Tagen (erfordert Cron-Job)

### 4. Auth (src/AuthContext.jsx)
- Reaktivierung: `deleted_at` wird auf `null` gesetzt bei Login

### 5. Design
**Frosted Glass Effekt:**
```css
background: rgba(255, 255, 255, 0.7);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.3);
```

**Dark Mode:**
```css
background: rgba(0, 0, 0, 0.7);
border: 1px solid rgba(255, 255, 255, 0.1);
```

**Responsive:**
- Mobile: Einzelne Spalte
- Desktop (>1024px): 2 Spalten für Tasks & Goals

### 6. Streak-Logik
- Zählt nur weiter wenn mindestens 1 Daily-Ziel erreicht wurde
- Streak wird unterbrochen bei 0 erledigten Aufgaben
- Täglich wird nur einmal gezählt

## Installation & Setup

### 1. Datenbank aktualisieren
```sql
-- In Supabase SQL Editor ausführen:
-- Den Inhalt von database_setup.sql einfügen und ausführen
```

### 2. Dependencies (falls nötig)
```bash
npm install
```

### 3. Entwicklung starten
```bash
npm run dev
```

## Nutzung

### Neues Ziel erstellen:
1. Auf "Neues Ziel erstellen" klicken
2. **Hauptziel** eingeben (z.B. "2 Marathons laufen")
   - Zielwert: 84.39
   - Einheit: km
   - Datum: 31.12.2025
3. **Daily-Ziel** eingeben (z.B. "Laufen")
   - Täglicher Wert: 5
4. **Tage** auswählen (z.B. Mo-Fr)
5. "Erstellen" klicken

### Tägliche Nutzung:
1. App öffnen
2. Heutige Aufgaben sehen
3. Aufgabe abhaken wenn erledigt
4. Fortschritt bei Hauptzielen wird automatisch aktualisiert
5. Streak zählt weiter wenn mindestens 1 Aufgabe erledigt wurde

## Noch zu implementieren

### Push-Benachrichtigungen
Siehe `NOTIFICATIONS.md` für Details:
- Daily Reminder um 16:00 Uhr
- Tagesabschluss-Info
- Benötigt Service Worker + Backend/Cron-Job

### Edge Cases
- [ ] Goal-Löschung implementieren
- [ ] Task-Bearbeitung implementieren
- [ ] Streak-Historie anzeigen
- [ ] Goal-Archivierung bei Erreichen

## Bekannte Einschränkungen
- Mehrfach-Zählung am selben Tag ist verhindert durch UNIQUE constraint
- Cron-Job für Account-Löschung muss separat eingerichtet werden
- Push-Benachrichtigungen erfordern HTTPS und Backend-Setup
- iOS Safari: Web Push erst ab iOS 16.4 verfügbar
