#!/usr/bin/env python3
import urllib.request
import os

# Erstelle public Ordner falls nicht vorhanden
os.makedirs('public', exist_ok=True)

# Liste der Favicon-Dateien
favicons = {
    'favicon.svg': 'https://realfavicongenerator.net/files/9a5a5c88-ef28-4b50-9eab-16af4260daa7/favicon.svg',
    'favicon-96x96.png': 'https://realfavicongenerator.net/files/9a5a5c88-ef28-4b50-9eab-16af4260daa7/favicon-96x96.png',
    'favicon.ico': 'https://realfavicongenerator.net/files/9a5a5c88-ef28-4b50-9eab-16af4260daa7/favicon.ico',
    'apple-touch-icon.png': 'https://realfavicongenerator.net/files/9a5a5c88-ef28-4b50-9eab-16af4260daa7/apple-touch-icon.png',
    'web-app-manifest-192x192.png': 'https://realfavicongenerator.net/files/9a5a5c88-ef28-4b50-9eab-16af4260daa7/web-app-manifest-192x192.png',
    'web-app-manifest-512x512.png': 'https://realfavicongenerator.net/files/9a5a5c88-ef28-4b50-9eab-16af4260daa7/web-app-manifest-512x512.png',
    'site.webmanifest': 'https://realfavicongenerator.net/files/9a5a5c88-ef28-4b50-9eab-16af4260daa7/site.webmanifest'
}

print("Lade Favicon-Dateien herunter...")
for filename, url in favicons.items():
    try:
        filepath = os.path.join('public', filename)
        print(f"Lade {filename}...", end=' ')
        urllib.request.urlretrieve(url, filepath)
        print("✓")
    except Exception as e:
        print(f"✗ Fehler: {e}")

print("Download abgeschlossen!")
