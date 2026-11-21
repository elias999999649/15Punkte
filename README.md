# 15Punkte

15pkt.pages.dev

Minimalistischer Noten- und Abiturmanager für die gymnasiale Oberstufe in Baden-Württemberg. Das Astro-Projekt rendert die Seite statisch; React übernimmt die interaktive Oberfläche. Nutzerdaten werden im Browser gespeichert, es gibt keine Backend-Verbindung.

## Lokal entwickeln

```sh
npm install
npm run dev
```

## Prüfen und bauen

```sh
npm run check
npm run build
npm run preview
```

Der statische Build liegt in `dist/` und kann direkt auf Cloudflare Pages veröffentlicht werden: Build-Befehl `npm run build`, Build-Ausgabeverzeichnis `dist`.

## Fonts

Im lokalen `google font/`-Verzeichnis lagen Google Sans Flex TTF-Schnitte vor, keine WOFF2-Dateien. Für die Oberfläche werden nur Regular, Medium, SemiBold und Bold aus dem `24pt`-Schnitt nach `public/fonts/` kopiert. Die zugehörige SIL Open Font License 1.1 liegt neben den Fonts als `public/fonts/OFL.txt`. Es werden keine externen Font- oder sonstigen Laufzeitdienste geladen.
