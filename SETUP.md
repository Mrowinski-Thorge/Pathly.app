# 🎯 Pathly - Habit Tracking App

Eine moderne Webapp zum Tracken deiner täglichen Gewohnheiten (Habits) mit Statistiken und Animationen.

## ✨ Features

- ✅ **Habit-Liste**: Erstelle und verwalte deine täglichen Gewohnheiten
- 🎨 **Animierte Checkboxen**: Grüne Haken-Animation beim Abhaken
- 📊 **Statistiken**: Detaillierte Ansicht deiner Fortschritte und Erfolge
- 🌓 **Dark Mode**: Automatischer Dark/Light Mode
- ⚙️ **Einstellungen**: Account-Verwaltung mit animiertem Settings-Icon
- 📱 **Responsive**: Funktioniert perfekt auf Desktop und Mobile
- 🍎 **Apple-Style Navigation**: Bottom Navigation Bar für intuitive Bedienung

## 🚀 Installation

### 1. Repository klonen

```bash
git clone <repository-url>
cd Pathly.app
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Supabase einrichten

1. Erstelle ein kostenloses Konto auf [supabase.com](https://supabase.com)
2. Erstelle ein neues Projekt
3. Gehe zu **SQL Editor** und führe das Script `database_setup.sql` aus
4. Gehe zu **Settings → API** und kopiere:
   - `Project URL`
   - `anon public` API Key

### 4. Umgebungsvariablen einrichten

Erstelle eine `.env` Datei im Root-Verzeichnis:

```env
VITE_SUPABASE_URL=deine_supabase_url
VITE_SUPABASE_ANON_KEY=dein_anon_key
```

### 5. App starten

```bash
npm run dev
```

Die App läuft nun auf `http://localhost:5173`

## 📱 Features im Detail

### Home Screen
- Liste aller Habits mit Checkboxen
- Neue Habits hinzufügen
- Habits abhaken mit animierter grüner Checkbox
- Abgehakte Habits wandern automatisch nach unten
- Habits löschen

### Statistik Screen
- Anzahl der heute erledigten Habits
- Beste Serie (Streak) in Tagen
- Gesamt erledigte Habits
- Heutige Erfolgsrate in Prozent
- Balkendiagramm der letzten 7 Tage

### Settings
- Dark/Light Mode Toggle mit Animation
- E-Mail-Anzeige
- Passwort ändern
- Abmelden
- **Account löschen** mit Bestätigungsdialog

### Navigation
- **Settings-Icon**: Fest positioniert oben rechts, rotiert sanft
- **Bottom Navigation**: Apple-Style Bar mit Home und Statistik

## 🎨 Design

- Gradient-Farbschema: Lila/Pink (`#667eea` → `#764ba2`)
- Glassmorphism-Effekte
- Smooth Animationen
- Responsive für alle Bildschirmgrößen
- iOS Safe Area Support

## 🛠 Tech Stack

- **Frontend**: React 18 + Vite
- **Routing**: React Router DOM
- **Backend**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styling**: Vanilla CSS mit CSS-Animationen

## 📊 Datenbank-Schema

### `habits` Tabelle
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key zu auth.users)
- `name`: Text (Habit-Name)
- `completed_today`: Boolean
- `last_completed`: Timestamp
- `created_at`: Timestamp
- `updated_at`: Timestamp

### `habit_completions` Tabelle
- `id`: UUID (Primary Key)
- `habit_id`: UUID (Foreign Key zu habits)
- `user_id`: UUID (Foreign Key zu auth.users)
- `completed_at`: Timestamp

## 🔒 Security

- Row Level Security (RLS) aktiviert
- Benutzer können nur ihre eigenen Daten sehen/bearbeiten
- Sichere Authentifizierung über Supabase

## 📝 Hinweise

- Habits werden täglich zurückgesetzt (kann angepasst werden)
- Statistiken zeigen die letzten 7 Tage
- Account-Löschung entfernt alle Habit-Daten
- Dark Mode Präferenz wird lokal gespeichert

## 🚀 Deployment

### Auf GitHub Pages deployen:

```bash
npm run build
# Deploy das `dist` Verzeichnis auf GitHub Pages
```

Stelle sicher, dass `basename="/Pathly.app"` in `App.jsx` auf deine GitHub Pages URL angepasst ist.

## 📄 Lizenz

MIT License

---

Viel Erfolg beim Tracken deiner Habits! 🎯
