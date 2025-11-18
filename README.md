# Pathly App

🚀 Live unter: https://mrowinski-thorge.github.io/Pathly.app/

Eine geschützte React-Anwendung mit Supabase-Authentifizierung.

## Features

- 🔐 **Sichere Authentifizierung** mit Supabase
- 👤 **Benutzerverwaltung** - Registrierung und Anmeldung
- 🔒 **Geschützte Routen** - Nur für angemeldete Nutzer
- ⚙️ **Einstellungen** - Dark Mode, Passwort ändern, Profilverwaltung
- 🎨 **Modernes Design** - Frosted Glass Effekt, schwarz-weiß
- 🔄 **Passwort Reset** - E-Mail-basierte Passwort-Wiederherstellung
- ✅ **Nutzungsbedingungen** - Checkbox bei Registrierung

## Technologie-Stack

- **React** - UI Framework
- **Vite** - Build Tool
- **React Router** - Routing
- **Supabase** - Backend & Authentifizierung
- **CSS** - Styling mit Frosted Glass Effekten

## Installation

```bash
npm install
```

## Entwicklung

```bash
npm run dev
```

Die App läuft auf `http://localhost:5173/pathly.app/`

## Build für Production

```bash
npm run build
```

Die Build-Dateien befinden sich im `dist/` Verzeichnis.

## Deployment

Diese App ist für **GitHub Pages** konfiguriert und deployed automatisch bei jedem Push auf `main`.

### GitHub Pages Setup:

1. In den Repository Settings → Pages
2. Source auf **"GitHub Actions"** setzen
3. Bei jedem Push auf `main` wird automatisch gebaut und deployed

Die App ist dann erreichbar unter: `https://mrowinski-thorge.github.io/pathly.app/`

## Routen

- `/auth` - Login/Registrierung (nur für nicht angemeldete Nutzer)
  - Passwort vergessen Funktion
  - Nutzungsbedingungen bei Registrierung
- `/` - Dashboard (geschützt)
  - Coming Soon Seite
- `/settings` - Einstellungen (geschützt)
  - Dark Mode Toggle
  - E-Mail anzeigen
  - Passwort ändern
  - Abmelden

## Favicons

Die Favicon-Struktur ist bereits vorbereitet. Bitte siehe `FAVICON_SETUP.md` für Details zum Erstellen der Icon-Dateien.

## Hinweise

- Die App erfordert eine aktive Internetverbindung für Supabase
- Der Supabase API-Key ist öffentlich und serverseitig geschützt
- Passwörter müssen mindestens 6 Zeichen lang sein
- Dark Mode wird automatisch vom System erkannt und kann manuell umgeschaltet werden
