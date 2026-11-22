export const BADEN_WUERTTEMBERG_RULES = {
  id: "baden-wuerttemberg-gymnasium",
  state: "Baden-Württemberg",
  schoolType: "Allgemeinbildendes Gymnasium",
  rulesetVersion: "abitur-2028-guide-2025-12-16",
  status: "verified-partial" as const,
  validFrom: "2025-08-01",
  validThrough: null as string | null,
  examinationOrder:
    "Abiturverordnung Gymnasien der Normalform (AGVO), Fassung vom 19.10.2018, jeweils geltende Änderungsfassung; ergänzt durch die Kursstufen- und Abiturhinweise des Kultusministeriums.",
  sourceCheckedOn: "2026-11-21",
  sources: [
    {
      label: "Kultusministerium BW – Leitfaden gymnasiale Oberstufe, Abitur 2028 (Stand 16.12.2025)",
      url: "https://km.baden-wuerttemberg.de/fileadmin/redaktion/m-km/intern/PDF/Publikationen/Gymnasium/2025-12-16-Leitfaden-ABI-2028.pdf",
      checked: "2026-11-21",
      note: "Verbindlicher Jahrgangsleitfaden für Kurswahl, Einbringung und Gesamtqualifikation; die Rechtsverordnung hat Vorrang.",
    },
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
    pointScale: "0–15 Punkte pro Kurs und Prüfung; die Kursstufe im allgemeinbildenden Gymnasium umfasst vier Kurshalbjahre.",
    phases: "Einführungsphase vor Eintritt in die zweijährige Qualifikationsphase. Die Kursbelegung, Kurswahl und Prüfungsfachkombination hängen vom Abiturjahrgang und der geltenden AGVO ab.",
    blocks: "Abitur 2028: Block I umfasst 40 eingebrachte Kurse. Zwei der drei Leistungsfächer werden mit ihren je vier Kursen doppelt gewichtet; die übrigen Kurse zählen einfach. Das Ergebnis wird mit 40/48 multipliziert, maximal 600 Punkte. Block II umfasst fünf Prüfungsfächer, grundsätzlich vierfach gewertet, maximal 300 Punkte. Gesamt maximal 900.",
  },
  verifiedFacts: [
    "Die AGVO ist die Rechtsgrundlage; die detaillierte Jahrgangszuordnung wird mit dem offiziellen KM-Leitfaden Abitur 2028 vom 16.12.2025 konkretisiert.",
    "Einführungsphase und Qualifikationsphase sind getrennt; die Qualifikationsphase der Kursstufe umfasst vier Halbjahre.",
    "Drei Leistungsfächer werden über vier Halbjahre belegt. Zwei der drei Fächer werden ausgewählt und ihre jeweils vier Kurse im Block I doppelt gewichtet; das dritte Leistungsfach zählt einfach.",
    "Block I wird aus 40 Kursen berechnet: Die acht Kurse aus zwei gewählten Leistungsfächern zählen doppelt, alle übrigen einfach. Die gewichtete Summe wird mit 40/48 multipliziert; maximal 600 Punkte.",
    "Block II: fünf Prüfungsfächer, darunter drei schriftliche; alle fünf Ergebnisse vierfach, maximal 300 Punkte.",
    "Für die Gesamtqualifikation gelten Mindestwerte 200 Punkte in Block I, 100 in Block II und 300 insgesamt; Unterkurse/Prüfungsergebnisse unter 5 Punkten sind begrenzt.",
    "Die offizielle Durchschnittsnote wird anhand der Notentabelle im Abitur-2028-Leitfaden aus der Gesamtpunktzahl ermittelt.",
  ],
  unresolved: [
    "Die vollständige schulische Kurswahl-/Belegpflichtprüfung (Fremdsprachen, Aufgabenfelder, Profil und Sonderfälle) ist noch nicht umgesetzt; eine automatische Zulassungsentscheidung ist daher ausgeschlossen.",
    "Prüfungsfachkombinationen und Kursbelegung müssen anhand der konkreten Schullaufbahn und der für den Jahrgang geltenden AGVO-Prüfungsordnung bestätigt werden.",
    "Die Punktwerte bilden eine rechnerische Orientierung. Die schulische Kursbelegung und Zulassung werden nicht vollständig automatisiert geprüft.",
    "Andere Abiturjahrgänge benötigen ein eigenes versioniertes und fachlich geprüftes Regelmodul.",
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


export type AbiturCourseGrade = { subjectId: string; subjectName: string; semester: 1 | 2 | 3 | 4; points: number | null; courseType: "Leistungsfach" | "Basisfach"; doubled?: boolean; compulsory?: boolean; excluded?: boolean };
export type ExamSubject = { subjectId: string; subjectName: string; points: number | null; written: boolean; oral: boolean };
export type AbiturSimulationInput = { courses: AbiturCourseGrade[]; exams: ExamSubject[]; confirmedEligible?: boolean };
export type QualificationStatus = "passed" | "failed" | "incomplete";

const gradeTable: [number, string][] = [[823,"1,0"],[805,"1,1"],[787,"1,2"],[769,"1,3"],[751,"1,4"],[733,"1,5"],[715,"1,6"],[697,"1,7"],[679,"1,8"],[661,"1,9"],[643,"2,0"],[625,"2,1"],[607,"2,2"],[589,"2,3"],[571,"2,4"],[553,"2,5"],[535,"2,6"],[517,"2,7"],[499,"2,8"],[481,"2,9"],[463,"3,0"],[445,"3,1"],[427,"3,2"],[409,"3,3"],[391,"3,4"],[373,"3,5"],[355,"3,6"],[337,"3,7"],[319,"3,8"],[301,"3,9"],[300,"4,0"]];
export function officialGrade(total: number | null) { if (total === null || total < 300 || total > 900) return null; return gradeTable.find(([threshold]) => total >= threshold)?.[1] ?? "4,0"; }
export function simulateAbitur(input: AbiturSimulationInput) {
  const mandatory = input.courses.filter((course) => course.compulsory);
  const courseCompleteness = mandatory.length === 0 ? "missing-requirement-map" as const : mandatory.every((course) => course.points !== null) ? "complete" as const : "incomplete" as const;
  const included = input.courses.filter((course) => !course.excluded && course.points !== null);
  const advancedCourses = included.filter((course) => course.courseType === "Leistungsfach");
  const advancedSubjects = new Set(advancedCourses.map((course) => course.subjectId));
  const threeCompleteAdvancedSubjects = advancedSubjects.size === 3 && [...advancedSubjects].every((subjectId) => {
    const semesters = new Set(advancedCourses.filter((course) => course.subjectId === subjectId).map((course) => course.semester));
    return semesters.size === 4 && [1, 2, 3, 4].every((semester) => semesters.has(semester as AbiturCourseGrade["semester"]));
  });
  const doubledSubjects = new Set(advancedCourses.filter((course) => course.doubled).map((course) => course.subjectId));
  const twoCompleteDoubledSubjects = doubledSubjects.size === 2 && [...doubledSubjects].every((subjectId) => {
    const semesters = new Set(advancedCourses.filter((course) => course.subjectId === subjectId).map((course) => course.semester));
    return semesters.size === 4 && [1, 2, 3, 4].every((semester) => semesters.has(semester as AbiturCourseGrade["semester"]));
  });
  const coursesValid = included.length === 40 && advancedCourses.length === 12 && threeCompleteAdvancedSubjects && twoCompleteDoubledSubjects;
  const weightedCourseTotal = included.reduce((sum, course) => sum + (course.points ?? 0) * (course.courseType === "Leistungsfach" && course.doubled ? 2 : 1), 0);
  const blockI = coursesValid ? weightedCourseTotal * 40 / 48 : null;
  const fiveExams = input.exams.length === 5 && new Set(input.exams.map((exam) => exam.subjectId)).size === 5;
  const hasThreeWritten = input.exams.filter((exam) => exam.written).length === 3;
  const examComplete = fiveExams && input.exams.every((exam) => exam.points !== null) && hasThreeWritten;
  const blockII = examComplete ? input.exams.reduce((sum, exam) => sum + (exam.points ?? 0), 0) * 4 : null;
  const resultTotal = blockI !== null && blockII !== null ? Math.round(blockI + blockII) : null;
  const missing: string[] = [];
  if (courseCompleteness === "missing-requirement-map") missing.push("Die jahrgangsspezifische Pflichtkurs-/Belegliste ist nicht vollständig hinterlegt.");
  if (courseCompleteness === "incomplete") missing.push("Punkte für verpflichtend einzubringende Kurse fehlen.");
  if (included.length !== 40) missing.push(`Block I benötigt genau 40 eingebrachte Kurse; aktuell ${included.length}.`);
  if (included.filter((course) => course.courseType === "Leistungsfach").length !== 12) missing.push("Block I setzt 12 Halbjahreskurse aus den drei Leistungsfächern voraus.");
  else if (!threeCompleteAdvancedSubjects) missing.push("Die zwölf LK-Kurse müssen aus drei Leistungsfächern mit je vier Halbjahren stammen.");
  else if (!twoCompleteDoubledSubjects) missing.push("Wähle genau zwei der drei Leistungsfächer für die doppelte Gewichtung aus.");
  if (!fiveExams) missing.push("Es müssen fünf unterschiedliche Abiturprüfungsfächer ausgewählt sein.");
  if (!hasThreeWritten) missing.push("Die Prüfungskonfiguration muss drei schriftliche Prüfungsfächer ausweisen.");
  if (input.exams.some((exam) => exam.points === null)) missing.push("Ergebnisse ausstehender Abiturprüfungen fehlen.");
  if (!input.confirmedEligible) missing.push("Die Zulassung zur Abiturprüfung ist nicht als geprüft bestätigt.");
  const courseTotal = included.reduce((sum, course) => sum + (course.points ?? 0), 0);
  const blockITotal = blockI === null ? null : Math.round(blockI);
  const blockIValid = included.length === 40 && blockITotal !== null && blockITotal >= 200 && included.filter((course) => (course.points ?? 0) < 5).length <= 8 && included.filter((course) => course.courseType === "Leistungsfach" && (course.points ?? 0) < 5).length <= 3;
  const examResultsValid = examComplete && input.exams.every((exam) => (exam.points ?? 0) >= 1) && input.exams.filter((exam) => (exam.points ?? 0) < 5).length <= 2;
  const totalValid = resultTotal !== null && resultTotal >= 300;
  const status: QualificationStatus = missing.length ? "incomplete" : blockIValid && examResultsValid && totalValid ? "passed" : "failed";
  return {
    blockI, blockII, total: resultTotal,
    grade: blockIValid && examResultsValid && totalValid ? officialGrade(resultTotal) : null,
    status, missing,
    checks: { courseCompleteness, coursesValid, blockIValid, examComplete, examResultsValid, totalValid, confirmedEligible: Boolean(input.confirmedEligible) },
    counts: { included: included.length, advanced: included.filter((course) => course.courseType === "Leistungsfach").length, coursePoints: courseTotal, exams: input.exams.length },
  };
}

export const BW_ABITUR_2028_RULES = {
  ...BADEN_WUERTTEMBERG_RULES,
  status: "verified-for-abitur-2028-guide" as const,
  validFrom: "2025-08-01",
  validThrough: "2028-07-31",
  examinationOrder: "AGVO in der für den Abiturjahrgang 2028 geltenden Fassung, ergänzt durch den Leitfaden der gymnasialen Oberstufe, Abitur 2028 (Stand 16.12.2025). Bei Abweichungen hat die Rechtsverordnung Vorrang.",
  sources: [
    ...BADEN_WUERTTEMBERG_RULES.sources,
    { label: "Kultusministerium BW – Leitfaden für die gymnasiale Oberstufe, Abitur 2028 (PDF, 16.12.2025)", url: "https://km.baden-wuerttemberg.de/fileadmin/redaktion/m-km/intern/PDF/Publikationen/Gymnasium/2025-12-16-Leitfaden-ABI-2028.pdf", checked: "2026-11-21", note: "Offizielle jahrgangsbezogene Quelle für Kurswahl, Einbringung, Abiturprüfung, Gesamtqualifikation, Mindestanforderungen und Notenumrechnung." },
    { label: "Schule-BW – Abitur und Oberstufe", url: "https://www.schule-bw.de/faecher-und-schularten/schularten/gymnasium/oberstufe/abitur", checked: "2026-11-21", note: "Offizielle Landesbildungsserver-Übersicht mit Materialien und jahrgangsbezogenen Hinweisen." },
  ],
  verifiedFacts: [
    "Für den Abiturjahrgang 2028 sind drei Leistungsfächer über alle vier Halbjahre zu belegen. Zwei der drei Leistungsfächer werden ausgewählt; deren acht Kurse zählen doppelt. Das dritte Leistungsfach zählt einfach.",
    "Block I: genau 40 Kurse, höchstens 600 Punkte; Berechnungsfaktor 40/48 auf die gewichtete Kurssumme.",
    "Block II: fünf Prüfungsfächer, darunter drei schriftliche; alle fünf Ergebnisse vierfach gewertet, höchstens 300 Punkte.",
    "Gesamtqualifikation höchstens 900 Punkte. Zum Bestehen: mindestens 200 in Block I, mindestens 100 in Block II und mindestens 300 insgesamt; Block-I-Unterkurse und Block-II-Ergebnisse unter 5 Punkten sind zusätzlich begrenzt.",
    "Die Durchschnittsnote wird nach der amtlichen Tabelle des Leitfadens aus der Gesamtpunktzahl ermittelt.",
  ],
  unresolved: [
    "Automatische Prüfung der vollständigen Pflichtfachbelegung und der Wahl-/Kombinationsregeln erfordert zusätzliche, schülerbezogene Angaben zu Aufgabenfeldern, Fremdsprachenbeginn, Profil, Kurswahl und möglichen Sonderfällen.",
    "Eine verbindliche Zulassungsentscheidung trifft die Schule; der Rechner kann die schulische Bestätigung nicht ersetzen.",
    "Die Prüfungsordnung für andere Abiturjahrgänge muss jeweils in einem eigenen, fachlich geprüften Regelnmodul ergänzt werden.",
  ],
} as const;
