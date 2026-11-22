# 15Punkte

15pkt.pages.dev

Noten- und Abiturmanager für die gymnasiale Oberstufe in Baden-Württemberg. Das Astro-Projekt rendert die Seiten statisch; React übernimmt die interaktive Oberfläche. Gastdaten werden im Browser gespeichert. Mit Google-Anmeldung werden die Daten optional in Firestore synchronisiert.

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

## Firebase einrichten

Die Firebase-Webkonfiguration verwendet standardmäßig das Projekt `punkte-342dd`; öffentliche `PUBLIC_FIREBASE_*`-Variablen können sie beim Build überschreiben. Aktiviere in der Firebase Console unter **Authentication → Anmeldemethode** den Google-Anbieter und trage die produktive Website-Domain unter **Autorisierte Domains** ein.

Veröffentliche anschließend die Firestore-Sicherheitsregeln aus `firestore.rules` im selben Firebase-Projekt. Mit Firebase CLI und entsprechender Projektberechtigung:

```sh
npx firebase-tools deploy --only firestore:rules --project punkte-342dd
```

Die Regeln erlauben angemeldeten Nutzern nur den Zugriff auf ihr eigenes Notenbuch. Bei „Missing or insufficient permissions“ prüfe, ob genau diese Regeln im verwendeten Projekt veröffentlicht sind.

## Fonts

Im lokalen `google font/`-Verzeichnis lagen Google Sans Flex TTF-Schnitte vor, keine WOFF2-Dateien. Für die Oberfläche werden nur Regular, Medium, SemiBold und Bold aus dem `24pt`-Schnitt nach `public/fonts/` kopiert. Die zugehörige SIL Open Font License 1.1 liegt neben den Fonts als `public/fonts/OFL.txt`. Die Schriftarten werden lokal ausgeliefert; es werden keine externen Font- oder Tracking-Dienste geladen.
