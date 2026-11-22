export const SEMESTERS = [1, 2, 3, 4] as const;
export type Semester = (typeof SEMESTERS)[number];
export type CourseType = "Leistungsfach" | "Basisfach";
export type GradeKind = string;
export type GradeArea = "written" | "oral";
export type EntryMode = "individual" | "manual";

export type SemesterSettings = {
  mode: EntryMode;
  manualAverage: number | null;
  writtenWeight: number;
  oralWeight: number;
};

export type SchoolSubject = {
  id: string;
  name: string;
  code: string;
  state: string;
  courseType: CourseType;
  weight: number;
  settings: Record<Semester, SemesterSettings>;
  color: string;
};

export type Performance = {
  id: string;
  subjectId: string;
  semester: Semester;
  points: number;
  kind: GradeKind;
  area: GradeArea;
  date: string;
  title: string;
  weight: number;
};

export type GradebookData = {
  version: 1;
  subjects: SchoolSubject[];
  performances: Performance[];
};
export type AreaResult = {
  average: number | null;
  weight: number;
  count: number;
  numerator: number;
  denominator: number;
};
export type SubjectResult = {
  subject: SchoolSubject;
  semester: Semester;
  mode: EntryMode;
  average: number | null;
  written: AreaResult;
  oral: AreaResult;
  performances: Performance[];
};

export const STATES = ["Baden-Württemberg"] as const;
export const GRADE_KINDS: GradeKind[] = [
  "Klausur",
  "Mündliche Note",
  "GFS",
  "Test / Klassenarbeit",
  "Sonstige Leistung",
];
export const COLORS = [
  "violet",
  "rose",
  "blue",
  "green",
  "amber",
  "teal",
] as const;
export const EMPTY_SEMESTER_SETTINGS = (): Record<
  Semester,
  SemesterSettings
> => ({
  1: {
    mode: "individual",
    manualAverage: null,
    writtenWeight: 1,
    oralWeight: 1,
  },
  2: {
    mode: "individual",
    manualAverage: null,
    writtenWeight: 1,
    oralWeight: 1,
  },
  3: {
    mode: "individual",
    manualAverage: null,
    writtenWeight: 1,
    oralWeight: 1,
  },
  4: {
    mode: "individual",
    manualAverage: null,
    writtenWeight: 1,
    oralWeight: 1,
  },
});
export const emptyGradebook = (): GradebookData => ({
  version: 1,
  subjects: [],
  performances: [],
});
export const semesterLabel = (semester: Semester) => `H${semester}`;
export const formatPoints = (value: number | null, digits = 1) =>
  value === null ? "–" : value.toFixed(digits).replace(".", ",");
export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function areaForKind(kind: GradeKind): GradeArea {
  return kind === "Klausur" || kind === "Test / Klassenarbeit"
    ? "written"
    : "oral";
}

function areaResult(items: Performance[], area: GradeArea): AreaResult {
  const matching = items.filter((item) => item.area === area);
  const numerator = matching.reduce(
    (sum, item) => sum + item.points * item.weight,
    0,
  );
  const denominator = matching.reduce((sum, item) => sum + item.weight, 0);
  return {
    average: denominator ? numerator / denominator : null,
    weight: denominator,
    count: matching.length,
    numerator,
    denominator,
  };
}

export function calculateSubject(
  subject: SchoolSubject,
  performances: Performance[],
  semester: Semester,
): SubjectResult {
  const settings = subject.settings[semester];
  const items = performances.filter(
    (item) => item.subjectId === subject.id && item.semester === semester,
  );
  const written = areaResult(items, "written");
  const oral = areaResult(items, "oral");
  if (settings.mode === "manual") {
    return {
      subject,
      semester,
      mode: "manual",
      average: settings.manualAverage,
      written,
      oral,
      performances: items,
    };
  }
  const activeAreas = [
    ...(written.average === null
      ? []
      : [{ average: written.average, weight: settings.writtenWeight }]),
    ...(oral.average === null
      ? []
      : [{ average: oral.average, weight: settings.oralWeight }]),
  ].filter((area) => area.weight > 0);
  const divisor = activeAreas.reduce((sum, area) => sum + area.weight, 0);
  const average = divisor
    ? activeAreas.reduce((sum, area) => sum + area.average * area.weight, 0) /
      divisor
    : null;
  return {
    subject,
    semester,
    mode: "individual",
    average,
    written,
    oral,
    performances: items,
  };
}

export function calculateSemester(data: GradebookData, semester: Semester) {
  const results = data.subjects
    .map((subject) => calculateSubject(subject, data.performances, semester))
    .filter((result) => result.average !== null);
  const denominator = results.reduce(
    (sum, result) => sum + result.subject.weight,
    0,
  );
  const average = denominator
    ? results.reduce(
        (sum, result) => sum + result.average! * result.subject.weight,
        0,
      ) / denominator
    : null;
  return {
    average,
    results,
    subjectCount: results.length,
    weight: denominator,
  };
}

export function calculateOverall(data: GradebookData) {
  const semesters = SEMESTERS.map((semester) => ({
    semester,
    ...calculateSemester(data, semester),
  })).filter((item) => item.average !== null);
  const denominator = semesters.reduce((sum, item) => sum + item.weight, 0);
  const average = denominator
    ? semesters.reduce((sum, item) => sum + item.average! * item.weight, 0) /
      denominator
    : null;
  return { average, semesters, performanceCount: data.performances.length };
}

export const GRADEBOOK_SCHEMA_VERSION = 2 as const;
export type UserGoal = { id: string; kind: "subject" | "overall" | "abi"; subjectId?: string; title: string; target: number; createdAt: string };
export type AppPreferences = { state: string; schoolType: string; schoolYear: string; currentSemester: Semester; theme: "light" | "dark" | "sepia"; customGradeKinds?: string[] };
export type GradebookDocument = { app: "15punkte"; schemaVersion: typeof GRADEBOOK_SCHEMA_VERSION; exportedAt?: string; data: GradebookData; goals: UserGoal[]; preferences: AppPreferences };

export const defaultPreferences = (): AppPreferences => ({ state: "Baden-Württemberg", schoolType: "Allgemeinbildendes Gymnasium", schoolYear: "2025/26", currentSemester: 1, theme: "light", customGradeKinds: [] });
export const emptyGoals = (): UserGoal[] => [];
export function createDocument(data: GradebookData, goals: UserGoal[], preferences: AppPreferences): GradebookDocument { return { app: "15punkte", schemaVersion: GRADEBOOK_SCHEMA_VERSION, data, goals, preferences: { ...preferences, customGradeKinds: preferences.customGradeKinds ?? [] } }; }

export function validateGradebookDocument(value: unknown): { ok: true; document: GradebookDocument } | { ok: false; error: string } {
  if (!value || typeof value !== "object") return { ok: false, error: "Die Datei enthält kein JSON-Objekt." };
  const record = value as Record<string, unknown>;
  if (record.app !== "15punkte") return { ok: false, error: "Diese Datei stammt nicht aus 15Punkte." };
  if (record.schemaVersion !== GRADEBOOK_SCHEMA_VERSION) return { ok: false, error: `Nicht unterstützte Datenversion (${String(record.schemaVersion)}). Erwartet wird Version ${GRADEBOOK_SCHEMA_VERSION}.` };
  const document = record as unknown as GradebookDocument;
  if (!document.data || !Array.isArray(document.data.subjects) || !Array.isArray(document.data.performances) || !Array.isArray(document.goals) || !document.preferences) return { ok: false, error: "Datenstruktur unvollständig." };
  const rawCustomGradeKinds = document.preferences.customGradeKinds ?? [];
  if (!Array.isArray(rawCustomGradeKinds)) return { ok: false, error: "Die eigenen Notenarten sind ungültig." };
  const customGradeKinds = rawCustomGradeKinds.map((kind) => typeof kind === "string" ? kind.trim().replace(/\s+/g, " ") : "");
  const normalizedKinds = customGradeKinds.map((kind) => kind.toLocaleLowerCase("de"));
  if (customGradeKinds.length > 30 || customGradeKinds.some((kind, index) => typeof rawCustomGradeKinds[index] !== "string" || !kind || kind.length > 40 || GRADE_KINDS.some((standard) => standard.toLocaleLowerCase("de") === normalizedKinds[index])) || new Set(normalizedKinds).size !== customGradeKinds.length) return { ok: false, error: "Die eigenen Notenarten enthalten ungültige oder doppelte Einträge." };
  const subjectIds = new Set<string>();
  for (const subject of document.data.subjects) {
    if (!subject || typeof subject.id !== "string" || !subject.id || subjectIds.has(subject.id) || typeof subject.name !== "string" || !subject.name.trim() || typeof subject.code !== "string" || !(subject.courseType === "Basisfach" || subject.courseType === "Leistungsfach") || !Number.isFinite(subject.weight) || subject.weight <= 0 || !subject.settings || ![1, 2, 3, 4].every((semester) => subject.settings[semester as Semester] && ["individual", "manual"].includes(subject.settings[semester as Semester].mode))) return { ok: false, error: "Mindestens ein Fach enthält ungültige oder fehlende Angaben." };
    subjectIds.add(subject.id);
  }
  const performanceIds = new Set<string>();
  for (const item of document.data.performances) {
    if (!item || typeof item.id !== "string" || !item.id || performanceIds.has(item.id) || !subjectIds.has(item.subjectId) || ![1, 2, 3, 4].includes(item.semester) || !Number.isFinite(item.points) || item.points < 0 || item.points > 15 || !(GRADE_KINDS.includes(item.kind) || customGradeKinds.includes(item.kind)) || !["written", "oral"].includes(item.area) || !Number.isFinite(item.weight) || item.weight < 0 || typeof item.title !== "string" || typeof item.date !== "string") return { ok: false, error: "Mindestens eine Leistung enthält ungültige Angaben (Fach, Halbjahr, Punkte oder Gewichtung)." };
    if (document.data.subjects.find((subject) => subject.id === item.subjectId)!.settings[item.semester].mode === "manual") return { ok: false, error: "Die Datei enthält zugleich einen manuellen Schnitt und Einzelnoten für dasselbe Fach/Halbjahr." };
    performanceIds.add(item.id);
  }
  for (const goal of document.goals) if (!goal || typeof goal.id !== "string" || !["subject", "overall", "abi"].includes(goal.kind) || !Number.isFinite(goal.target) || goal.target < 0 || goal.target > 15 || (goal.kind === "subject" && !subjectIds.has(goal.subjectId ?? ""))) return { ok: false, error: "Mindestens ein Zielwert ist ungültig oder verweist auf ein unbekanntes Fach." };
  const prefs = document.preferences;
  if (!["Baden-Württemberg"].includes(prefs.state) || prefs.schoolType !== "Allgemeinbildendes Gymnasium" || typeof prefs.schoolYear !== "string" || ![1,2,3,4].includes(prefs.currentSemester) || !["light","dark","sepia"].includes(prefs.theme)) return { ok: false, error: "Einstellungen enthalten nicht unterstützte Werte." };
  return { ok: true, document: { ...document, preferences: { ...document.preferences, customGradeKinds } } };
}

export function exportGradebook(document: GradebookDocument): string { return JSON.stringify({ ...document, exportedAt: new Date().toISOString() }, null, 2); }

export function loadGradebook(): GradebookData {
  try {
    const stored = localStorage.getItem("15punkte-gradebook-v2");
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      const validation = validateGradebookDocument(parsed);
      if (validation.ok) return validation.document.data;
    }
    const previousV1 = localStorage.getItem("15punkte-gradebook-v1");
    if (previousV1) {
      const parsed = JSON.parse(previousV1) as GradebookData;
      if (parsed.version === 1 && Array.isArray(parsed.subjects) && Array.isArray(parsed.performances)) return parsed;
    }
    const previous = localStorage.getItem("15punkte-subjects");
    if (previous) {
      const legacy = JSON.parse(previous) as {
        name: string;
        code: string;
        type: CourseType;
        grades?: (number | null)[];
        current?: number;
        color?: string;
      }[];
      const data = emptyGradebook();
      data.subjects = legacy.map((item, index) => ({
        id: newId(),
        name: item.name,
        code: item.code,
        state: "Baden-Württemberg",
        courseType: item.type,
        weight: 1,
        settings: EMPTY_SEMESTER_SETTINGS(),
        color: item.color ?? COLORS[index % COLORS.length],
      }));
      legacy.forEach((item, subjectIndex) =>
        (item.grades ?? []).slice(0, 4).forEach((points, semesterIndex) => {
          if (points === null) return;
          const kind: GradeKind =
            semesterIndex % 2 === 0 ? "Klausur" : "Mündliche Note";
          data.performances.push({
            id: newId(),
            subjectId: data.subjects[subjectIndex].id,
            semester: (semesterIndex + 1) as Semester,
            points,
            kind,
            area: areaForKind(kind),
            date: "",
            title: "Importierte Note",
            weight: 1,
          });
        }),
      );
      return data;
    }
  } catch {
    return emptyGradebook();
  }
  return emptyGradebook();
}


export function simulatePerformance(subject: SchoolSubject, performances: Performance[], semester: Semester, area: GradeArea, points: number, weight: number) {
  const current = calculateSubject(subject, performances, semester);
  const settings = subject.settings[semester];
  const added = area === "written" ? { ...current.written, numerator: current.written.numerator + points * weight, denominator: current.written.denominator + weight } : { ...current.oral, numerator: current.oral.numerator + points * weight, denominator: current.oral.denominator + weight };
  const writtenAverage = area === "written" ? (added.denominator ? added.numerator / added.denominator : null) : current.written.average;
  const oralAverage = area === "oral" ? (added.denominator ? added.numerator / added.denominator : null) : current.oral.average;
  const inputs = [
    ...(writtenAverage === null || settings.writtenWeight <= 0 ? [] : [{ average: writtenAverage, weight: settings.writtenWeight }]),
    ...(oralAverage === null || settings.oralWeight <= 0 ? [] : [{ average: oralAverage, weight: settings.oralWeight }]),
  ];
  const divisor = inputs.reduce((sum, item) => sum + item.weight, 0);
  const average = divisor ? inputs.reduce((sum, item) => sum + item.average * item.weight, 0) / divisor : null;
  return { currentAverage: current.average, projectedAverage: average, delta: current.average === null || average === null ? null : average - current.average };
}

export function requiredPointsForAverage(subject: SchoolSubject, performances: Performance[], semester: Semester, area: GradeArea, targetAverage: number, weight: number): number | null {
  if (weight <= 0 || targetAverage < 0 || targetAverage > 15) return null;
  const current = calculateSubject(subject, performances, semester);
  const settings = subject.settings[semester];
  const areaWeight = area === "written" ? settings.writtenWeight : settings.oralWeight;
  if (areaWeight <= 0) return null;
  const other = area === "written" ? current.oral.average : current.written.average;
  const otherWeight = area === "written" ? settings.oralWeight : settings.writtenWeight;
  const otherContribution = other === null || otherWeight <= 0 ? 0 : other * otherWeight;
  const denominator = other === null || otherWeight <= 0 ? areaWeight : areaWeight + otherWeight;
  const targetAreaAverage = (targetAverage * denominator - otherContribution) / areaWeight;
  const existing = area === "written" ? current.written : current.oral;
  const needed = (targetAreaAverage * (existing.denominator + weight) - existing.numerator) / weight;
  return Number.isFinite(needed) ? needed : null;
}


export function assertGradebookInvariant(data: GradebookData): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const subjects = new Map(data.subjects.map((subject) => [subject.id, subject]));
  const seen = new Set<string>();
  for (const performance of data.performances) {
    const key = `${performance.subjectId}:${performance.semester}`;
    if (!subjects.has(performance.subjectId)) errors.push(`Leistung ${performance.id} verweist auf ein unbekanntes Fach.`);
    if (seen.has(performance.id)) errors.push(`Doppelte Leistungs-ID: ${performance.id}.`);
    seen.add(performance.id);
    if (subjects.get(performance.subjectId)?.settings[performance.semester]?.mode === "manual") errors.push(`Manueller Modus und Einzelleistung gleichzeitig: ${key}.`);
  }
  for (const subject of data.subjects) for (const semester of SEMESTERS) {
    const setting = subject.settings[semester];
    if (setting.mode === "manual" && setting.manualAverage === null) continue;
    if (setting.mode === "manual" && data.performances.some((item) => item.subjectId === subject.id && item.semester === semester)) errors.push(`Doppelberücksichtigung in ${subject.name} H${semester}.`);
  }
  return { ok: errors.length === 0, errors };
}
