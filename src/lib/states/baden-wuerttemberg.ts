export const BADEN_WUERTTEMBERG_RULES = {
  id: "baden-wuerttemberg-gymnasium",
  state: "Baden-Württemberg",
  schoolType: "Allgemeinbildendes Gymnasium",
  rulesetVersion: "2026-27-review-1",
  status: "verified-partial" as const,
  validFrom: "2025-08-01",
  validThrough: null as string | null,
  examinationOrder:
    "Abiturverordnung Gymnasien der Normalform (AGVO), Fassung vom 19.10.2018, jeweils geltende Änderungsfassung; ergänzt durch die Kursstufen- und Abiturhinweise des Kultusministeriums.",
  sourceCheckedOn: "2026-11-21",
  sources: [
    {
      label: "Kultusministerium BW – Abitur und Oberstufe",
      url: "https://km.baden-wuerttemberg.de/de/schule/gymnasium/abitur-und-oberstufe",
      checked: "2026-11-21",
      note: "Offizielle Übersicht, Kursstufe, Prüfungsfächer und Leistungsbewertung; aktuelle Jahrgangsangaben vor Einsatz mit Schule abgleichen.",
    },
    {
      label: "Landesrecht BW – AGVO",
      url: "https://www.landesrecht-bw.de/bsbw/document/jlr-GymAbiV8pP1",
      checked: "2026-11-21",
      note: "Amtliche konsolidierte Rechtsquelle zur Abiturverordnung der Gymnasien der Normalform. Die jeweils aktuelle Änderungsfassung ist maßgeblich.",
    },
    {
      label: "Kultusministerium BW – Gymnasiale Oberstufe / Abitur",
      url: "https://km.baden-wuerttemberg.de/de/schule/gymnasium",
      checked: "2026-11-21",
      note: "Amtliche Einstiegsseite zu Gymnasium und Oberstufe; landesrechtliche Detailregeln gehen vor.",
    },
    {
      label:
        "KMK – Vereinbarung zur Gestaltung der gymnasialen Oberstufe und der Abiturprüfung",
      url: "https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2023/2023_03_16-Vereinbarung-Gestaltung-gymnasiale-Oberstufe-Abiturpruefung.pdf",
      checked: "2026-11-21",
      note: "Länderübergreifender Rahmen, nicht Ersatz der baden-württembergischen AGVO.",
    },
  ],
  fundamentals: {
    pointScale:
      "0–15 Punkte pro Kurs/Prüfung; schulische Halbjahresleistungen werden nach den landesrechtlichen Vorgaben festgesetzt.",
    phases:
      "Einführungsphase und Qualifikationsphase sind getrennte Regelungsabschnitte. Die Kursstufe umfasst vier Halbjahre; Kursbelegung, Kurswahl und Prüfungsfachkombination hängen von Jahrgang und AGVO-Fassung ab.",
    blocks:
      "Die Gesamtqualifikation verwendet Block I (Kursleistungen) und Block II (Abiturprüfungen). Die weithin bekannte Höchstsumme 900 Punkte und Blockgrenzen sind in diesem Rechner erst dann als offizielle Berechnung freizuschalten, wenn die vollständige aktuell anwendbare AGVO-Anlage/Jahrgangszuordnung maschinenlesbar und gegen die amtliche Fassung geprüft wurde.",
  },
  verifiedFacts: [
    "Die AGVO ist die maßgebliche baden-württembergische Rechtsgrundlage für die Abiturprüfung an Gymnasien der Normalform.",
    "Die Kursstufe umfasst vier Halbjahre der Qualifikationsphase; Block I und Block II sind als getrennte Abschnitte der Gesamtqualifikation zu behandeln.",
    "Die offizielle Kurswahl und anzurechnende Kurse sind nicht durch einen allgemeinen gewichteten Mittelwert über sämtliche Schülerfächer ersetzbar.",
  ],
  unresolved: [
    "Die vollständige Einbringungsregel (Pflichtkurse, Wahlbereich, Streich-/Zusatzkurse und Sonderfälle) muss je Abiturjahrgang unmittelbar aus der dann geltenden AGVO samt Anlagen operationalisiert und juristisch gegengeprüft werden.",
    "Für die Abiturjahrgänge 2027 ff. ist in diesem Stand keine abschließend versionierte Liste der erlaubten Prüfungsfachkombinationen und sämtlicher Belegpflichten hinterlegt.",
    "Die konkrete Umrechnung der Gesamtpunktzahl in die Durchschnittsnote ist bis zur Verifikation der für den Jahrgang geltenden Notentabelle bewusst nicht implementiert.",
    "Fachweise Gewichtung und schriftlich/mündlich-Bereichsgewichtung der persönlichen Modellrechnung sind nutzerdefiniert; sie stellen keine amtliche Berechnungsvorschrift dar.",
  ],
  requirements: [
    {
      id: "subject-choice",
      title: "Kursbelegung und Fächerkombination",
      status: "needs-input" as const,
      detail:
        "Noch keine jahrgangsspezifische Kurswahl oder Pflichtfach-Belegung hinterlegt.",
    },
    {
      id: "course-results",
      title: "Kursleistungen aus vier Halbjahren",
      status: "needs-input" as const,
      detail:
        "Alle für Block I relevanten Kurse und Halbjahrespunkte müssen nachgewiesen werden.",
    },
    {
      id: "exam-subjects",
      title: "Fünf Abiturprüfungsfächer",
      status: "needs-input" as const,
      detail:
        "Prüfungsfächer, Aufgabenfelder und zulässige Kombination müssen mit der gültigen Jahrgangsregel abgeglichen sein.",
    },
    {
      id: "exam-results",
      title: "Ergebnisse der Abiturprüfungen",
      status: "needs-input" as const,
      detail:
        "Schriftliche und mündliche Prüfungsleistungen sowie mögliche besondere Prüfungsbestandteile fehlen.",
    },
    {
      id: "eligibility",
      title: "Zulassung und Gesamtqualifikation",
      status: "needs-input" as const,
      detail:
        "Pflichtbelegung, Mindestpunktzahlen, Unterkurse und Sperrklauseln sind im Modell noch nicht abschließend verifiziert.",
    },
  ],
} as const;
