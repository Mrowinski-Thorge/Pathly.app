#!/usr/bin/env python3
import urllib.request
import os

# Public folder
public_folder = 'public'

# Liste der neuen Favicon-Dateien
favicons = {
    'favicon.svg': 'https://realfavicongenerator.net/files/9973f94b-bcaf-449a-b11a-c722acfd2e3c/favicon.svg',
    'favicon-96x96.png': 'https://realfavicongenerator.net/files/9973f94b-bcaf-449a-b11a-c722acfd2e3c/favicon-96x96.png',
    'favicon.ico': 'https://realfavicongenerator.net/files/9973f94b-bcaf-449a-b11a-c722acfd2e3c/favicon.ico',
    'apple-touch-icon.png': 'https://realfavicongenerator.net/files/9973f94b-bcaf-449a-b11a-c722acfd2e3c/apple-touch-icon.png',
    'web-app-manifest-192x192.png': 'https://realfavicongenerator.net/files/9973f94b-bcaf-449a-b11a-c722acfd2e3c/web-app-manifest-192x192.png',
    'web-app-manifest-512x512.png': 'https://realfavicongenerator.net/files/9973f94b-bcaf-449a-b11a-c722acfd2e3c/web-app-manifest-512x512.png',
    'site.webmanifest': 'https://realfavicongenerator.net/files/9973f94b-bcaf-449a-b11a-c722acfd2e3c/site.webmanifest'
}

print("Lade neue Favicon-Dateien herunter...")
for filename, url in favicons.items():
    try:
        filepath = os.path.join(public_folder, filename)
        print(f"Lade {filename}...", end=' ')
        urllib.request.urlretrieve(url, filepath)
        print("✓")
    except Exception as e:
        print(f"✗ Fehler: {e}")

print("\nDownload abgeschlossen!")
