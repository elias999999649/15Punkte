export const SEMESTERS = [1, 2, 3, 4] as const;
export type Semester = (typeof SEMESTERS)[number];
export type CourseType = "Leistungsfach" | "Basisfach";
export type GradeKind =
  | "Klausur"
  | "Mündliche Note"
  | "GFS"
  | "Test / Klassenarbeit"
  | "Sonstige Leistung";
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

export function loadGradebook(): GradebookData {
  try {
    const stored = localStorage.getItem("15punkte-gradebook-v1");
    if (stored) {
      const parsed = JSON.parse(stored) as GradebookData;
      if (
        parsed.version === 1 &&
        Array.isArray(parsed.subjects) &&
        Array.isArray(parsed.performances)
      )
        return parsed;
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
    localStorage.removeItem("15punkte-gradebook-v1");
  }
  return emptyGradebook();
}
