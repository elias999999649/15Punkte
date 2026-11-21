import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  GraduationCap,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Moon,
  Coffee,
  TrendingUp,
  X,
  Pencil,
} from "lucide-react";
import {
  calculateOverall,
  calculateSemester,
  calculateSubject,
  COLORS,
  emptyGradebook,
  EMPTY_SEMESTER_SETTINGS,
  formatPoints,
  GRADE_KINDS,
  loadGradebook,
  newId,
  SEMESTERS,
  semesterLabel,
  type GradeArea,
  type GradebookData,
  type GradeKind,
  type Performance,
  type SchoolSubject,
  type Semester,
} from "../lib/gradebook";

type Section = "Dashboard" | "Fächer" | "Abitur" | "Einstellungen";
type Theme = "light" | "dark" | "sepia";
type Subject = {
  name: string;
  code: string;
  color: string;
  current: number;
  previous: number;
  trend: "up" | "down" | "same";
  grades: (number | null)[];
  average: string;
  type: string;
};

function exampleGradebook(): GradebookData {
  const data = emptyGradebook();
  const subjects: [string, string, string, SchoolSubject["courseType"], number[]][] = [
    ["Mathematik", "MA", "violet", "Leistungsfach", [13, 12, 14, 13]],
    ["Deutsch", "DE", "rose", "Leistungsfach", [12, 13, 11, 12]],
    ["Englisch", "EN", "blue", "Leistungsfach", [13, 14, 14, 15]],
    ["Biologie", "BI", "green", "Basisfach", [10, 12, 11, 11]],
    ["Geschichte", "GE", "amber", "Basisfach", [11, 12, 13, 12]],
  ];
  subjects.forEach(([name, code, color, courseType, grades]) => {
    const id = newId();
    const subject: SchoolSubject = { id, name, code, color, state: "Baden-Württemberg", courseType, weight: 1, settings: EMPTY_SEMESTER_SETTINGS() };
    data.subjects.push(subject);
    grades.forEach((points, index) => {
      const kind: GradeKind = index % 2 === 0 ? "Klausur" : "Mündliche Note";
      data.performances.push({ id: newId(), subjectId: id, semester: (index + 1) as Semester, points, kind, area: kind === "Klausur" ? "written" : "oral", date: `2026-0${index + 9}-12`, title: `${kind} · ${semesterLabel((index + 1) as Semester)}`, weight: 1 });
    });
  });
  return data;
}

const initialGradebook = exampleGradebook;
const initialSubjects: Subject[] = [
  {
    name: "Mathematik",
    code: "MA",
    color: "violet",
    current: 13,
    previous: 12,
    trend: "up",
    grades: [13, 12, 14, 13, null, null],
    average: "13,0",
    type: "Leistungsfach",
  },
  {
    name: "Deutsch",
    code: "DE",
    color: "rose",
    current: 12,
    previous: 13,
    trend: "down",
    grades: [12, 13, 11, 12, null, null],
    average: "12,0",
    type: "Leistungsfach",
  },
  {
    name: "Englisch",
    code: "EN",
    color: "blue",
    current: 14,
    previous: 13,
    trend: "up",
    grades: [13, 14, 14, 15, null, null],
    average: "14,0",
    type: "Leistungsfach",
  },
  {
    name: "Biologie",
    code: "BI",
    color: "green",
    current: 11,
    previous: 11,
    trend: "same",
    grades: [10, 12, 11, 11, null, null],
    average: "11,0",
    type: "Basisfach",
  },
  {
    name: "Geschichte",
    code: "GE",
    color: "amber",
    current: 12,
    previous: 11,
    trend: "up",
    grades: [11, 12, 13, 12, null, null],
    average: "12,0",
    type: "Basisfach",
  },
];
const navItems: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Fächer", icon: BookOpen },
  { label: "Abitur", icon: GraduationCap },
  { label: "Einstellungen", icon: Settings2 },
];
const formatGrade = (grade: number | null) =>
  grade === null ? "—" : `${grade}`;

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span>15</span>
      <i />
    </div>
  );
}

function ScorePill({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  const mood = value >= 13 ? "good" : value >= 10 ? "mid" : "low";
  return (
    <span className={`score-pill ${mood} ${compact ? "compact" : ""}`}>
      {value}
      <span className="score-suffix"> P</span>
    </span>
  );
}

function Trend({ trend }: { trend: Subject["trend"] }) {
  if (trend === "same") return <span className="trend flat">—</span>;
  return trend === "up" ? (
    <span className="trend positive">
      <ArrowUpRight size={13} /> Aufwärts
    </span>
  ) : (
    <span className="trend negative">
      <ArrowDownRight size={13} /> Leicht rückläufig
    </span>
  );
}

export default function App() {
  const [section, setSection] = useState<Section>("Dashboard");
  const [theme, setTheme] = useState<Theme>("light");
  const [gradebook, setGradebook] = useState<GradebookData>(() => exampleGradebook());
  const skipFirstSave = useRef(true);
  const [showSubject, setShowSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [gradeTarget, setGradeTarget] = useState<{ subjectId?: string; performance?: Performance; semester?: Semester; manual?: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolSubject | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<Semester>(1);
  const [showCalculation, setShowCalculation] = useState(false);
  const [toast, setToast] = useState("");
  const subjects = gradebook.subjects;
  const performances = gradebook.performances;

  useEffect(() => {
    const savedTheme = localStorage.getItem("15punkte-theme") as Theme | null;
    if (savedTheme && ["light", "dark", "sepia"].includes(savedTheme)) setTheme(savedTheme);
    setGradebook(loadGradebook());
  }, []);
  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    localStorage.setItem("15punkte-gradebook-v1", JSON.stringify(gradebook));
  }, [gradebook]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("15punkte-theme", theme);
  }, [theme]);

  const overall = useMemo(() => calculateOverall(gradebook), [gradebook]);
  const semesterResult = useMemo(() => calculateSemester(gradebook, selectedSemester), [gradebook, selectedSemester]);
  const average = overall.average ?? 0;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const savePerformance = (performance: Performance) => {
    setGradebook((current) => ({ ...current, performances: [...current.performances.filter((item) => item.id !== performance.id), performance] }));
    setGradeTarget(null);
    notify("Leistung gespeichert. Dein Schnitt wurde neu berechnet.");
  };
  const deletePerformance = (id: string) => {
    setGradebook((current) => ({ ...current, performances: current.performances.filter((item) => item.id !== id) }));
    setGradeTarget(null);
    notify("Leistung gelöscht.");
  };
  const saveManualAverage = (subjectId: string, semester: Semester, points: number) => {
    setGradebook((current) => ({
      ...current,
      performances: current.performances.filter((item) => !(item.subjectId === subjectId && item.semester === semester)),
      subjects: current.subjects.map((subject) => {
        if (subject.id !== subjectId) return subject;
        const nextSettings: SchoolSubject["settings"] = {
          ...subject.settings,
          [semester]: { ...subject.settings[semester], mode: "manual", manualAverage: points },
        };
        return { ...subject, settings: nextSettings };
      }),
    }));
    setGradeTarget(null);
    notify("Manueller Durchschnitt gespeichert; Einzelnoten sind für dieses Fach und Halbjahr ausgeschlossen.");
  };
  const setEntryMode = (subjectId: string, semester: Semester, mode: "individual" | "manual") => {
    setGradebook((current) => ({
      ...current,
      performances: mode === "manual" ? current.performances.filter((item) => !(item.subjectId === subjectId && item.semester === semester)) : current.performances,
      subjects: current.subjects.map((subject) => {
        if (subject.id !== subjectId) return subject;
        const nextSettings: SchoolSubject["settings"] = {
          ...subject.settings,
          [semester]: { ...subject.settings[semester], mode, manualAverage: mode === "individual" ? null : subject.settings[semester].manualAverage },
        };
        return { ...subject, settings: nextSettings };
      }),
    }));
    notify(mode === "manual" ? "Manueller Modus aktiv. Einzelnoten dieses Fachs/Halbjahrs wurden entfernt." : "Einzelnotenmodus aktiv. Trage die Leistungen neu ein.");
  };
  const saveSubject = (subject: SchoolSubject) => {
    setGradebook((current) => ({ ...current, subjects: current.subjects.some((item) => item.id === subject.id) ? current.subjects.map((item) => item.id === subject.id ? subject : item) : [...current.subjects, subject] }));
    setShowSubject(false);
    setEditingSubject(null);
    notify(`${subject.name} gespeichert.`);
  };
  const deleteSubject = (subject: SchoolSubject) => {
    setGradebook((current) => ({ ...current, subjects: current.subjects.filter((item) => item.id !== subject.id), performances: current.performances.filter((item) => item.subjectId !== subject.id) }));
    setDeleteTarget(null);
    notify(`${subject.name} und zugehörige Leistungen wurden gelöscht.`);
  };
  const saveWeights = (subjectId: string, semester: Semester, writtenWeight: number, oralWeight: number) => {
    setGradebook((current) => ({ ...current, subjects: current.subjects.map((subject) => {
      if (subject.id !== subjectId) return subject;
      const nextSettings: SchoolSubject["settings"] = {
        ...subject.settings,
        [semester]: { ...subject.settings[semester], writtenWeight, oralWeight },
      };
      return { ...subject, settings: nextSettings };
    }) }));
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#dashboard"
          onClick={(event) => {
            event.preventDefault();
            setSection("Dashboard");
          }}
          aria-label="15Punkte Startseite"
        >
          <BrandMark />
          <span className="brand-name">15Punkte</span>
          <span className="brand-beta">BETA</span>
        </a>
        <button
          className="school-switch"
          onClick={() =>
            notify("Dein Schulprofil: Gymnasium · Baden-Württemberg")
          }
        >
          <span className="school-avatar">
            <GraduationCap size={16} />
          </span>
          <span className="school-copy">
            <strong>Gymnasium</strong>
            <small>Baden-Württemberg</small>
          </span>
          <ChevronDown size={15} className="muted-icon" />
        </button>
        <div className="nav-label">ÜBERSICHT</div>
        <nav className="main-nav" aria-label="Hauptnavigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${section === label ? "active" : ""}`}
              onClick={() => setSection(label)}
              aria-current={section === label ? "page" : undefined}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Fächer" && (
                <span className="nav-count">{subjects.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <div className="privacy-icon">
              <Check size={13} />
            </div>
            <div>
              <strong>Deine Daten bleiben bei dir.</strong>
              <span>Nur auf diesem Gerät gespeichert.</span>
            </div>
          </div>
          <button
            className="profile-button"
            onClick={() => setSection("Einstellungen")}
          >
            <span className="profile-avatar">E</span>
            <span className="profile-copy">
              <strong>Mein Überblick</strong>
              <small>Jahrgang 2026/27</small>
            </span>
            <MoreHorizontal size={17} className="muted-icon" />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>15Punkte</span>
            <ChevronRight size={14} />
            <strong>{section}</strong>
          </div>
          <div className="topbar-actions">
            <span className="school-year">
              Kursstufe 1 <i /> 2026 / 27
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              aria-label="Hilfe"
              onClick={() =>
                notify("Deine Noten werden lokal auf diesem Gerät gespeichert.")
              }
            >
              <CircleHelp size={17} />
            </button>
            <button
              className="icon-button theme-quick"
              aria-label="Theme wechseln"
              onClick={() =>
                setTheme(
                  theme === "light"
                    ? "dark"
                    : theme === "dark"
                      ? "sepia"
                      : "light",
                )
              }
            >
              {theme === "dark" ? (
                <Moon size={17} />
              ) : theme === "sepia" ? (
                <Coffee size={17} />
              ) : (
                <Sun size={17} />
              )}
            </button>
            <button
              className="avatar-button"
              aria-label="Einstellungen öffnen"
              onClick={() => setSection("Einstellungen")}
            >
              E
            </button>
          </div>
        </header>

        <div className="content-wrap">
          {section === "Dashboard" && <Dashboard subjects={subjects} performances={performances} semesters={overall.semesters} average={average} performanceCount={overall.performanceCount} onAddGrade={() => setGradeTarget({})} onOpenSubjects={() => setSection("Fächer")} />}
          {section === "Fächer" && <SubjectsPage subjects={subjects} gradebook={gradebook} semester={selectedSemester} onSemester={setSelectedSemester} onAdd={() => setShowSubject(true)} onEdit={(subject) => { setEditingSubject(subject.id); setShowSubject(true); }} onDelete={setDeleteTarget} onGrade={(subject, manual = false) => setGradeTarget({ subjectId: subject.id, semester: selectedSemester, manual })} onWeights={saveWeights} onMode={setEntryMode} onPerformanceEdit={(performance) => setGradeTarget({ performance, subjectId: performance.subjectId, semester: performance.semester })} onPerformanceDelete={deletePerformance} />}
          {section === "Abitur" && <AbiturPage average={average} />}
          {section === "Einstellungen" && (
            <SettingsPage
              theme={theme}
              onTheme={setTheme}
              onReset={() => {
                const fresh = initialGradebook();
                setGradebook(fresh);
                localStorage.removeItem("15punkte-gradebook-v1");
                notify("Beispieldaten wurden wiederhergestellt.");
              }}
            />
          )}
          <footer className="page-footer">
            <span>Mit Ruhe zum Ziel.</span>
            <span>
              15Punkte <i /> Deine Daten. Dein Überblick.
            </span>
          </footer>
        </div>
      </main>
      {showSubject && <SubjectModal subject={subjects.find((subject) => subject.id === editingSubject)} onClose={() => { setShowSubject(false); setEditingSubject(null); }} onSave={saveSubject} />}
      {gradeTarget && <PerformanceModal subjects={subjects} initial={gradeTarget.performance} initialSubjectId={gradeTarget.subjectId} initialSemester={gradeTarget.semester} manual={gradeTarget.manual} onClose={() => setGradeTarget(null)} onSave={savePerformance} onSaveManual={saveManualAverage} onDelete={deletePerformance} />}
      {deleteTarget && <ConfirmDelete subject={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteSubject(deleteTarget)} />}
      {showCalculation && <CalculationModal result={semesterResult} semester={selectedSemester} onClose={() => setShowCalculation(false)} />}
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}

function LegacyDashboard({
  subjects,
  average,
  onAdd,
  onOpenSubjects,
  onOpenAbi,
  onEditGrade,
}: {
  subjects: Subject[];
  average: number;
  onAdd: () => void;
  onOpenSubjects: () => void;
  onOpenAbi: () => void;
  onEditGrade: (name: string) => void;
}) {
  const topSubjects = [...subjects]
    .sort((a, b) => b.current - a.current)
    .slice(0, 4);
  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="status-dot" /> DEIN SCHULJAHR · KURSSTUFE 1
          </div>
          <h1>
            Dein Abi. <span>Im Überblick.</span>
          </h1>
          <p>Ein guter Überblick macht den Unterschied. Hier ist deiner.</p>
        </div>
        <button className="button button-primary" onClick={onAdd}>
          <Plus size={16} /> Note eintragen
        </button>
      </section>
      <section className="metric-grid" aria-label="Deine aktuellen Kennzahlen">
        <article className="metric-card main-metric">
          <div className="metric-top">
            <span>Aktueller Schnitt</span>
            <span className="metric-icon lavender">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="metric-value">
            {average.toFixed(1).replace(".", ",")}
            <span> Punkte</span>
          </div>
          <div className="metric-foot">
            <span className="delta">
              <ArrowUpRight size={14} /> +0,4
            </span>
            <span>zum letzten Halbjahr</span>
          </div>
          <div className="metric-sparkline" aria-hidden="true">
            <svg viewBox="0 0 140 40" preserveAspectRatio="none">
              <path d="M1 33 C18 31 20 24 34 27 S52 31 62 20 S77 24 87 18 S103 21 112 12 S128 17 139 5" />
              <path
                className="spark-fill"
                d="M1 33 C18 31 20 24 34 27 S52 31 62 20 S77 24 87 18 S103 21 112 12 S128 17 139 5 V40 H1Z"
              />
            </svg>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-top">
            <span>Eingebrachte Kurse</span>
            <span className="metric-icon blue-tint">
              <BookOpen size={16} />
            </span>
          </div>
          <div className="metric-value">
            {subjects.length}
            <span> / 40</span>
          </div>
          <div className="metric-foot">
            <div className="progress-track">
              <span
                style={{
                  width: `${Math.min((subjects.length / 40) * 100, 100)}%`,
                }}
              />
            </div>
            <span>{Math.round((subjects.length / 40) * 100)} %</span>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-top">
            <span>Im Zielbereich</span>
            <span className="metric-icon green-tint">
              <Sparkles size={16} />
            </span>
          </div>
          <div className="metric-value">
            {subjects.filter((subject) => subject.current >= 10).length}
            <span> Fächer</span>
          </div>
          <div className="metric-foot">
            <span className="quiet-note">
              von {subjects.length} Fächern ≥ 10 Punkte
            </span>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-top">
            <span>Bis zum Abitur</span>
            <span className="metric-icon amber-tint">
              <GraduationCap size={16} />
            </span>
          </div>
          <div className="metric-value">
            Noch <span className="plain-value">1,5</span>
            <span> Jahre</span>
          </div>
          <div className="metric-foot">
            <span className="quiet-note">Abiturprüfung · Frühjahr 2028</span>
          </div>
        </article>
      </section>

      <section className="dashboard-columns">
        <article className="panel grades-panel">
          <div className="panel-heading">
            <div>
              <h2>Deine Fächer</h2>
              <p>Deine Leistung auf einen Blick.</p>
            </div>
            <div className="panel-heading-actions"><button className="text-button" onClick={onOpenSubjects}>Alle Fächer <ArrowRight size={14} /></button><button className="grade-edit-link" onClick={() => onEditGrade(subjects[0]?.name ?? "Mathematik")}><Pencil size={12} /> Note eintragen</button></div>
          </div>
          <div className="table-scroll">
            <table className="grades-table">
              <thead>
                <tr>
                  <th>FACH</th>
                  <th>HALBJAHR</th>
                  <th>VERLAUF</th>
                  <th>Ø PUNKTE</th>
                </tr>
              </thead>
              <tbody>
                {subjects.slice(0, 5).map((subject) => (
                  <tr key={`${subject.code}-${subject.name}`}>
                    <td>
                      <span className={`subject-mark ${subject.color}`}>
                        {subject.code}
                      </span>
                      <span className="subject-name">
                        {subject.name}
                        <small>{subject.type}</small>
                      </span>
                    </td>
                    <td><button className="grade-cell-button" aria-label={`Note für ${subject.name} bearbeiten`} onClick={() => onEditGrade(subject.name)}><ScorePill value={subject.current} compact /></button></td>
                    <td>
                      <Trend trend={subject.trend} />
                    </td>
                    <td>
                      <strong className="table-average">
                        {subject.average}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="add-row" onClick={onAdd}>
            <Plus size={15} /> Fach oder Note hinzufügen
          </button>
        </article>
        <aside className="right-column">
          <article className="panel focus-panel">
            <div className="panel-heading compact-heading">
              <div>
                <h2>Dein Fokus</h2>
                <p>Das läuft gerade richtig gut.</p>
              </div>
              <span className="focus-spark">
                <Sparkles size={15} />
              </span>
            </div>
            <div className="focus-subjects">
              {topSubjects.slice(0, 3).map((subject, index) => (
                <div className="focus-row" key={subject.code}>
                  <span className={`subject-mark small ${subject.color}`}>
                    {subject.code}
                  </span>
                  <span className="focus-name">{subject.name}</span>
                  <ScorePill value={subject.current} compact />
                  <span className={`focus-rank rank-${index + 1}`}>
                    0{index + 1}
                  </span>
                </div>
              ))}
            </div>
            <div className="focus-message">
              <span className="message-line" />
              <p>
                Starke Leistung in{" "}
                <strong>{topSubjects[0]?.name ?? "deinem Fach"}.</strong> Weiter
                so!
              </p>
            </div>
          </article>
          <article className="panel abi-panel">
            <div className="abi-panel-top">
              <div>
                <span className="eyebrow small-eyebrow">ABITUR-PROGNOSE</span>
                <h2>Du bist auf Kurs.</h2>
              </div>
              <span className="abi-icon">
                <GraduationCap size={18} />
              </span>
            </div>
            <div className="abi-number">
              {(average * 40).toFixed(0)}
              <span> / 900</span>
            </div>
            <div className="abi-progress">
              <span
                style={{
                  width: `${Math.min(((average * 40) / 900) * 100, 100)}%`,
                }}
              />
            </div>
            <div className="abi-caption">
              <span>Orientierungswert</span>
              <button
                onClick={onOpenAbi}
              >
                Mehr erfahren <ArrowRight size={13} />
              </button>
            </div>
          </article>
        </aside>
      </section>
      <section className="note-banner">
        <div className="note-banner-icon">
          <Calculator size={17} />
        </div>
        <div>
          <strong>Gut zu wissen</strong>
          <p>
            In Baden-Württemberg zählen die Kurse aus zwei Jahren Kursstufe in
            deine Abiturwertung ein.
          </p>
        </div>
        <button
          aria-label="Hinweis schließen"
          onClick={(event) =>
            (event.currentTarget.parentElement as HTMLElement).remove()
          }
        >
          <X size={15} />
        </button>
      </section>
    </>
  );
}

function LegacySubjectsPage({
  subjects,
  onAdd,
  onEditGrade,
}: {
  subjects: Subject[];
  onAdd: () => void;
  onEditGrade: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="status-dot" /> DEIN SCHULJAHR · KURSSTUFE 1
          </div>
          <h1>
            Deine <span>Fächer.</span>
          </h1>
          <p>Alle Kurse und deine bisherigen Leistungen an einem Ort.</p>
        </div>
        <button className="button button-primary" onClick={onAdd}>
          <Plus size={16} /> Fach hinzufügen
        </button>
      </section>
      <section className="subject-summary">
        <div>
          <span>Fächer eingetragen</span>
          <strong>
            {subjects.length}
            <small> / 40 Kurse</small>
          </strong>
        </div>
        <div>
          <span>Aktueller Schnitt</span>
          <strong>
            {(
              subjects.reduce((sum, subject) => sum + subject.current, 0) /
              Math.max(subjects.length, 1)
            )
              .toFixed(1)
              .replace(".", ",")}
            <small> Punkte</small>
          </strong>
        </div>
        <div>
          <span>Leistungsfächer</span>
          <strong>
            {
              subjects.filter((subject) => subject.type === "Leistungsfach")
                .length
            }
            <small> Fächer</small>
          </strong>
        </div>
      </section>
      <article className="panel full-subjects">
        <div className="panel-heading">
          <div>
            <h2>Alle Kurse</h2>
            <p>Halbjahresnoten und Entwicklung je Fach.</p>
          </div>
          <label className="search-field">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Fach suchen"
            />
          </label>
        </div>
        <div className="table-scroll">
          <table className="grades-table full-table">
            <thead>
              <tr>
                <th>FACH</th>
                <th>ART</th>
                <th>H1</th>
                <th>H2</th>
                <th>H3</th>
                <th>H4</th>
                <th>AKTUELLER Ø</th>
                <th>VERLAUF</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((subject) => (
                <tr key={`${subject.code}-${subject.name}`}>
                  <td>
                    <span className={`subject-mark ${subject.color}`}>
                      {subject.code}
                    </span>
                    <span className="subject-name">{subject.name}</span>
                  </td>
                  <td>
                    <span className="course-tag">
                      {subject.type === "Leistungsfach"
                        ? "Leistungsfach"
                        : "Basisfach"}
                    </span>
                  </td>
                  {subject.grades.slice(0, 4).map((grade, index) => (
                    <td key={index}>
                      <span
                        className={
                          grade !== null ? "history-grade" : "history-empty"
                        }
                      >
                        {formatGrade(grade)}
                      </span>
                    </td>
                  ))}
                  <td><button className="grade-cell-button" aria-label={`Note für ${subject.name} bearbeiten`} onClick={() => onEditGrade(subject.name)}><strong className="table-average">{subject.average}</strong></button></td>
                  <td>
                    <Trend trend={subject.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-search">
              Kein Fach mit diesem Namen gefunden.
            </div>
          )}
        </div>
        <button className="add-row" onClick={onAdd}>
          <Plus size={15} /> Neues Fach eintragen
        </button>
      </article>
    </>
  );
}

function AbiturPage({ average }: { average: number }) {
  const estimate = Math.round(average * 40);
  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="status-dot" /> BADEN-WÜRTTEMBERG · G8/G9
          </div>
          <h1>
            Dein Weg zum <span>Abitur.</span>
          </h1>
          <p>Behalte deine Einbringung und deine Abiturwertung im Blick.</p>
        </div>
      </section>
      <section className="abi-hero panel">
        <div className="abi-hero-copy">
          <span className="eyebrow small-eyebrow">DEINE ORIENTIERUNG</span>
          <h2>
            Du bist auf einem
            <br />
            guten Weg.
          </h2>
          <p>
            Auf Basis deines aktuellen Schnitts zeichnet sich eine solide
            Ausgangslage ab. Die Prognose wird mit deinen Noten genauer.
          </p>
        </div>
        <div className="abi-score-wrap">
          <div className="abi-score-circle">
            <span>{estimate}</span>
            <small>von 900 Punkten</small>
          </div>
          <span className="score-caption">Aktuelle Orientierung</span>
        </div>
      </section>
      <section className="abi-details">
        <article className="panel detail-card">
          <span className="detail-kicker">BLOCK I</span>
          <h2>Kursleistungen</h2>
          <p>Bis zu 600 Punkte aus den Kursen der vier Halbjahre.</p>
          <div className="detail-progress">
            <span
              style={{ width: `${Math.min((estimate / 900) * 100, 100)}%` }}
            />
          </div>
          <div className="detail-meta">
            <span>Orientierung</span>
            <strong>{estimate} / 600*</strong>
          </div>
        </article>
        <article className="panel detail-card">
          <span className="detail-kicker">BLOCK II</span>
          <h2>Abiturprüfungen</h2>
          <p>Die fünf Prüfungsfächer bilden den zweiten Wertungsblock.</p>
          <div className="exam-chips">
            <span>
              Schriftlich <b>4</b>
            </span>
            <span>
              Mündlich <b>1</b>
            </span>
          </div>
          <button
            className="text-button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Prüfungsfächer ansehen <ArrowRight size={14} />
          </button>
        </article>
      </section>
      <section className="note-banner">
        <div className="note-banner-icon">
          <Calculator size={17} />
        </div>
        <div>
          <strong>
            Eine erste Orientierung, keine verbindliche Berechnung
          </strong>
          <p>
            Die offizielle Abiturwertung richtet sich nach der aktuellen
            Oberstufenverordnung Baden-Württemberg. *Vereinfachte Schätzung.
          </p>
        </div>
      </section>
    </>
  );
}

function SettingsPage({
  theme,
  onTheme,
  onReset,
}: {
  theme: Theme;
  onTheme: (theme: Theme) => void;
  onReset: () => void;
}) {
  const themes: {
    id: Theme;
    label: string;
    description: string;
    icon: typeof Sun;
  }[] = [
    {
      id: "light",
      label: "Hell",
      description: "Klar und konzentriert",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dunkel",
      description: "Angenehm bei wenig Licht",
      icon: Moon,
    },
    {
      id: "sepia",
      label: "Sepia",
      description: "Warm und augenschonend",
      icon: Coffee,
    },
  ];
  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="status-dot" /> DEIN BEREICH
          </div>
          <h1>
            Deine <span>Einstellungen.</span>
          </h1>
          <p>Gestalte 15Punkte so, wie es für dich passt.</p>
        </div>
      </section>
      <section className="settings-layout">
        <article className="panel settings-panel">
          <div className="settings-section-title">
            <div>
              <h2>Darstellung</h2>
              <p>Wähle das Erscheinungsbild für deine App.</p>
            </div>
          </div>
          <div className="theme-options">
            {themes.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                className={`theme-option ${theme === id ? "selected" : ""}`}
                onClick={() => onTheme(id)}
              >
                <span className={`theme-preview preview-${id}`}>
                  <Icon size={17} />
                </span>
                <span className="theme-label">
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                {theme === id && (
                  <span className="theme-check">
                    <Check size={13} />
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="settings-divider" />
          <div className="settings-section-title">
            <div>
              <h2>Schulprofil</h2>
              <p>Deine schulischen Rahmenbedingungen.</p>
            </div>
          </div>
          <div className="setting-row">
            <span>Bundesland</span>
            <strong>Baden-Württemberg</strong>
          </div>
          <div className="setting-row">
            <span>Schulart</span>
            <strong>Allgemeinbildendes Gymnasium</strong>
          </div>
          <div className="setting-row">
            <span>Abiturjahrgang</span>
            <strong>2028</strong>
          </div>
        </article>
        <aside className="panel data-panel">
          <div className="data-icon">
            <Check size={17} />
          </div>
          <h2>Deine Daten. Bei dir.</h2>
          <p>
            Deine Noten werden ausschließlich lokal in deinem Browser
            gespeichert. Es gibt kein Nutzerkonto und keinen Server, der deine
            Daten erhält.
          </p>
          <div className="data-separator" />
          <span className="local-label">
            <span className="status-dot" /> LOKALE SPEICHERUNG AKTIV
          </span>
          <button className="reset-button" onClick={onReset}>
            Beispieldaten wiederherstellen
          </button>
        </aside>
      </section>
      <div className="settings-footnote">
        <Command size={14} /> 15Punkte ist noch in der Entwicklung. Feedback
        hilft uns, besser zu werden.
      </div>
    </>
  );
}

function AddSubjectModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (name: string, type: string) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Basisfach");
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="add-modal"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) onAdd(name.trim(), type);
        }}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow small-eyebrow">DEIN SCHULJAHR</span>
            <h2>Fach hinzufügen</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Schließen"
          >
            <X size={17} />
          </button>
        </div>
        <label className="form-label">
          Fachname
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. Physik"
            maxLength={40}
            required
          />
        </label>
        <label className="form-label">
          Kursart
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option>Basisfach</option>
            <option>Leistungsfach</option>
          </select>
        </label>
        <div className="modal-actions">
          <button
            type="button"
            className="button button-quiet"
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button className="button button-primary" disabled={!name.trim()}>
            <Plus size={15} /> Fach hinzufügen
          </button>
        </div>
      </form>
    </div>
  );
}


function GradeModal({ subject, onClose, onSave }: { subject: Subject; onClose: () => void; onSave: (name: string, grade: number) => void }) {
  const [value, setValue] = useState(String(subject.current));
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="add-modal" onSubmit={(event) => { event.preventDefault(); onSave(subject.name, Number(value)); }}><div className="modal-heading"><div><span className="eyebrow small-eyebrow">{subject.type.toUpperCase()}</span><h2>Halbjahresnote</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Schließen"><X size={17} /></button></div><p className="grade-modal-subject"><span className={`subject-mark ${subject.color}`}>{subject.code}</span>{subject.name}</p><label className="form-label">Punkte im aktuellen Halbjahr<select value={value} onChange={(event) => setValue(event.target.value)}>{Array.from({ length: 16 }, (_, index) => 15 - index).map((grade) => <option value={grade} key={grade}>{grade} Punkte{grade === 15 ? ' · sehr gut plus' : grade === 0 ? ' · ungenügend' : ''}</option>)}</select></label><div className="grade-scale">Notenskala: 0 bis 15 Punkte · Änderungen werden lokal gespeichert.</div><div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Abbrechen</button><button className="button button-primary"><Check size={15} /> Note speichern</button></div></form></div>;
}


function Dashboard({ subjects, performances, semesters, average, performanceCount, onAddGrade, onOpenSubjects }: { subjects: SchoolSubject[]; performances: Performance[]; semesters: ReturnType<typeof calculateOverall>["semesters"]; average: number; performanceCount: number; onAddGrade: () => void; onOpenSubjects: () => void }) {
  const semesterResults = SEMESTERS.map((semester) => ({ semester, ...calculateSemester({ version: 1, subjects, performances }, semester) }));
  const latest = [...semesterResults].reverse().find((item) => item.average !== null);
  const ranked = (latest?.results ?? []).slice().sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  const best = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const current = semesters.length ? semesters[semesters.length - 1] : null;
  return <>
    <section className="page-heading"><div><div className="eyebrow"><span className="status-dot" /> DEIN SCHULJAHR · KURSSTUFE 1</div><h1>Dein Abi. <span>Im Überblick.</span></h1><p>Deine Leistungen, klar und auf einen Blick.</p></div><button className="button button-primary" onClick={onAddGrade}><Plus size={16} /> Leistung eintragen</button></section>
    <div className="model-notice"><Calculator size={14} /><span><strong>Persönliche Modellrechnung</strong> · unverbindlich, nicht die offizielle schulische Bewertung.</span></div>
    <section className="metric-grid grade-metrics"><article className="metric-card main-metric"><div className="metric-top"><span>Gesamtdurchschnitt</span><span className="metric-icon lavender"><TrendingUp size={16} /></span></div><div className="metric-value">{average ? average.toFixed(2).replace(".", ",") : "–"}<span> Punkte</span></div><div className="metric-foot"><span>{subjects.length} Fächer mit anrechenbaren Werten</span></div></article><article className="metric-card"><div className="metric-top"><span>Eingetragene Leistungen</span><span className="metric-icon blue-tint"><BookOpen size={16} /></span></div><div className="metric-value">{performanceCount}<span> Noten</span></div><div className="metric-foot"><span>Einzelleistungen über alle Halbjahre</span></div></article><article className="metric-card"><div className="metric-top"><span>Bestes Fach · {latest ? semesterLabel(latest.semester) : "—"}</span><span className="metric-icon green-tint"><ArrowUpRight size={16} /></span></div><div className="metric-value small-metric-value">{best?.subject.name ?? "Noch offen"}</div><div className="metric-foot">{best?.average === null || best?.average === undefined ? "Noch kein Halbjahresschnitt" : `${best.average.toFixed(2).replace(".", ",")} Punkte`}</div></article><article className="metric-card"><div className="metric-top"><span>Niedrigster Schnitt · {latest ? semesterLabel(latest.semester) : "—"}</span><span className="metric-icon amber-tint"><ArrowDownRight size={16} /></span></div><div className="metric-value small-metric-value">{weakest?.subject.name ?? "Noch offen"}</div><div className="metric-foot">{weakest?.average === null || weakest?.average === undefined ? "Noch kein Halbjahresschnitt" : `${weakest.average.toFixed(2).replace(".", ",")} Punkte`}</div></article></section>
    <section className="dashboard-columns grade-dashboard-columns"><article className="panel semester-overview"><div className="panel-heading"><div><h2>Durchschnitt je Halbjahr</h2><p>Deine Entwicklung auf Basis eingetragener Werte.</p></div><span className="course-tag">Modellrechnung</span></div><div className="semester-bars">{semesterResults.map(({ semester, average: termAverage, subjectCount }) => <div className="semester-bar" key={semester}><div className="semester-bar-top"><span>{semesterLabel(semester)}</span><strong>{termAverage === null ? "–" : termAverage.toFixed(2).replace(".", ",")}</strong></div><div className="semester-track"><span style={{ width: `${termAverage === null ? 0 : termAverage / 15 * 100}%` }} /></div><small>{subjectCount} Fächer</small></div>)}</div></article><article className="panel development-panel"><div className="panel-heading"><div><h2>Leistungsentwicklung</h2><p>Halbjahresschnitt im Verlauf.</p></div></div><div className="development-list">{semesterResults.map(({ semester, average: termAverage }, index) => { const previous = semesterResults[index - 1]?.average; const trend = termAverage === null || previous === null || previous === undefined ? "–" : termAverage > previous ? "↗" : termAverage < previous ? "↘" : "→"; return <div className="development-row" key={semester}><span className="development-semester">{semesterLabel(semester)}</span><span className="development-track"><i style={{ width: `${termAverage === null ? 0 : termAverage / 15 * 100}%` }} /></span><strong>{termAverage === null ? "–" : termAverage.toFixed(2).replace(".", ",")}</strong><span className={trend === "↗" ? "trend positive" : trend === "↘" ? "trend negative" : "trend flat"}>{trend}</span></div>; })}</div></article></section>
    <article className="panel dashboard-subject-panel"><div className="panel-heading"><div><h2>Fächerübersicht</h2><p>{current ? `Aktuelles Halbjahr · ${semesterLabel(current.semester)}` : "Fachschnitte über die Halbjahre"}</p></div><button className="text-button" onClick={onOpenSubjects}>Fächer verwalten <ArrowRight size={14} /></button></div><div className="table-scroll"><table className="grades-table"><thead><tr><th>FACH</th><th>KURSART</th><th>H1</th><th>H2</th><th>H3</th><th>H4</th><th>AKTUELL</th></tr></thead><tbody>{subjects.map((subject) => { const results = SEMESTERS.map((semester) => calculateSubject(subject, performances, semester)); const selectedResult = calculateSubject(subject, performances, latest?.semester ?? 1); return <tr key={subject.id}><td><span className={`subject-mark ${subject.color}`}>{subject.code}</span><span className="subject-name">{subject.name}</span></td><td><span className="course-tag">{subject.courseType}</span></td>{results.map((result) => <td key={result.semester}><span className={result.average === null ? "history-empty" : "history-grade"}>{result.average === null ? "–" : result.average.toFixed(1).replace(".", ",")}</span></td>)}<td>{selectedResult.average === null ? <span className="history-empty">–</span> : <ScorePill value={Math.round(selectedResult.average)} compact />}</td></tr>; })}</tbody></table>{subjects.length === 0 && <p className="empty-search">Noch keine Fächer eingetragen.</p>}</div><div className="model-caption"><Calculator size={13} /> Gewichtete persönliche Modellrechnung; keine offizielle schulische Bewertung.</div></article>
  </>;
}

function SubjectsPage({ subjects, gradebook, semester, onSemester, onAdd, onEdit, onDelete, onGrade, onWeights, onMode, onPerformanceEdit, onPerformanceDelete }: { subjects: SchoolSubject[]; gradebook: GradebookData; semester: Semester; onSemester: (semester: Semester) => void; onAdd: () => void; onEdit: (subject: SchoolSubject) => void; onDelete: (subject: SchoolSubject) => void; onGrade: (subject: SchoolSubject, manual?: boolean) => void; onWeights: (subjectId: string, semester: Semester, written: number, oral: number) => void; onMode: (subjectId: string, semester: Semester, mode: "individual" | "manual") => void; onPerformanceEdit: (performance: Performance) => void; onPerformanceDelete: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const filtered = subjects.filter((subject) => `${subject.name} ${subject.code}`.toLowerCase().includes(query.toLowerCase()));
  const semesterResult = calculateSemester(gradebook, semester);
  return <>
    <section className="page-heading"><div><div className="eyebrow"><span className="status-dot" /> NOTENVERWALTUNG · BADEN-WÜRTTEMBERG</div><h1>Deine <span>Fächer.</span></h1><p>Kurse, Gewichtungen und alle Leistungen an einem Ort.</p></div><button className="button button-primary" onClick={onAdd}><Plus size={16} /> Fach hinzufügen</button></section>
    <div className="model-notice"><Calculator size={14} /><span><strong>Persönliche Modellrechnung</strong> · ersetzt nicht die offizielle schulische Bewertung.</span></div>
    <section className="subject-summary"><div><span>Fächer</span><strong>{subjects.length}</strong></div><div><span>Leistungen · {semesterLabel(semester)}</span><strong>{gradebook.performances.filter((item) => item.semester === semester).length}</strong></div><div><span>Halbjahresschnitt · {semesterLabel(semester)}</span><strong>{semesterResult.average === null ? "–" : semesterResult.average.toFixed(2).replace(".", ",")}<small> Punkte</small></strong></div></section>
    <article className="panel full-subjects subject-manager"><div className="panel-heading manager-heading"><div><h2>Kursübersicht</h2><p>Fach anklicken, um Noten, Gewichtung und Rechenweg zu verwalten.</p></div><label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fach suchen" /></label></div><div className="semester-selector" aria-label="Halbjahr auswählen">{SEMESTERS.map((item) => <button key={item} className={semester === item ? "selected" : ""} onClick={() => onSemester(item)}>{semesterLabel(item)}</button>)}</div>
      <div className="subject-list">{filtered.map((subject) => { const result = calculateSubject(subject, gradebook.performances, semester); const isExpanded = expanded === subject.id; const settings = subject.settings[semester]; return <section className={`managed-subject ${isExpanded ? "expanded" : ""}`} key={subject.id}><div className="managed-subject-main"><button className="subject-expand" onClick={() => setExpanded(isExpanded ? null : subject.id)} aria-expanded={isExpanded}><ChevronRight size={15} className="expand-chevron" /><span className={`subject-mark ${subject.color}`}>{subject.code}</span><span className="managed-subject-name"><strong>{subject.name}</strong><small>{subject.courseType} · Fachgewicht {subject.weight}× · {subject.state}</small></span></button><span className={`mode-badge ${settings.mode}`}>{settings.mode === "manual" ? "Manueller Schnitt" : "Einzelnoten"}</span><span className="managed-average">{result.average === null ? "–" : result.average.toFixed(2).replace(".", ",")}<small> P</small></span><div className="managed-actions"><button className="icon-button" aria-label={`${subject.name} bearbeiten`} onClick={() => onEdit(subject)}><Pencil size={14} /></button><button className="icon-button danger-hover" aria-label={`${subject.name} löschen`} onClick={() => onDelete(subject)}><X size={14} /></button></div></div>
        {isExpanded && <div className="subject-details"><div className="entry-mode-row"><span>Eingabemodus für {semesterLabel(semester)}</span><button className={settings.mode === "individual" ? "mode-switch active" : "mode-switch"} onClick={() => settings.mode !== "individual" && onMode(subject.id, semester, "individual")}>Einzelleistungen</button><button className={settings.mode === "manual" ? "mode-switch active" : "mode-switch"} onClick={() => settings.mode !== "manual" && onGrade(subject, true)}>Durchschnitt manuell</button></div>
          {settings.mode === "manual" ? <div className="manual-average-panel"><div><span>Manuell eingetragener Schnitt</span><strong>{settings.manualAverage === null ? "Noch nicht gesetzt" : `${settings.manualAverage.toFixed(2).replace(".", ",")} Punkte`}</strong><small>Einzelnoten werden in diesem Modus nicht mitgezählt.</small></div><button className="button button-quiet small-button" onClick={() => onGrade(subject, true)}><Pencil size={13} /> Durchschnitt bearbeiten</button></div> : <>
            <div className="area-weight-grid"><AreaSummary title="Schriftlich" result={result.written} weight={settings.writtenWeight} onWeight={(value) => onWeights(subject.id, semester, value, settings.oralWeight)} /><AreaSummary title="Mündlich" result={result.oral} weight={settings.oralWeight} onWeight={(value) => onWeights(subject.id, semester, settings.writtenWeight, value)} /></div>
            <div className="detail-actions"><button className="button button-primary small-button" onClick={() => onGrade(subject)}><Plus size={14} /> Leistung eintragen</button><button className="button button-quiet small-button" onClick={() => onGrade(subject, true)}>Bekannten Schnitt eintragen</button><span>Noten mit Faktor 0 werden ignoriert.</span></div>
            {result.performances.length ? <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>LEISTUNG</th><th>BEREICH</th><th>DATUM</th><th>PUNKTE</th><th>FAKTOR</th><th></th></tr></thead><tbody>{result.performances.map((item) => <tr key={item.id}><td><strong>{item.title || item.kind}</strong><small>{item.kind}</small></td><td>{item.area === "written" ? "Schriftlich" : "Mündlich"}</td><td>{item.date ? new Date(`${item.date}T12:00:00`).toLocaleDateString("de-DE") : "–"}</td><td><ScorePill value={item.points} compact /></td><td>{item.weight}×</td><td><button className="text-button" onClick={() => onPerformanceEdit(item)}>Bearbeiten</button><button className="text-button remove-performance" onClick={() => onPerformanceDelete(item.id)} aria-label={`${item.title || item.kind} löschen`}><X size={14} /></button></td></tr>)}</tbody></table></div> : <p className="empty-performances">Noch keine Einzelleistungen in {semesterLabel(semester)} erfasst.</p>}
          </>}
          <details className="calculation-details"><summary>Rechenweg ansehen</summary><div className="calculation-copy">{settings.mode === "manual" ? <p>Manueller Modus: <strong>{settings.manualAverage === null ? "kein Durchschnitt eingetragen" : `${formatPoints(settings.manualAverage, 2)} Punkte`}</strong>. Es werden keine Einzelnoten angerechnet.</p> : <><p>Schriftlich: {result.written.count ? `(${result.performances.filter((item) => item.area === "written").map((item) => `${item.points} × ${item.weight}`).join(" + ")}) ÷ ${formatPoints(result.written.denominator, 2)} = ${formatPoints(result.written.average, 2)}` : "keine gewichteten Leistungen"}.</p><p>Mündlich: {result.oral.count ? `(${result.performances.filter((item) => item.area === "oral").map((item) => `${item.points} × ${item.weight}`).join(" + ")}) ÷ ${formatPoints(result.oral.denominator, 2)} = ${formatPoints(result.oral.average, 2)}` : "keine gewichteten Leistungen"}.</p><p>Fachschnitt: ({result.written.average === null ? "" : `${formatPoints(result.written.average, 2)} × ${settings.writtenWeight}`} {result.written.average !== null && result.oral.average !== null ? "+ " : ""}{result.oral.average === null ? "" : `${formatPoints(result.oral.average, 2)} × ${settings.oralWeight}`}) ÷ Summe aktiver Bereichsgewichte.</p></>}<p>Persönliche Modellrechnung – keine offizielle schulische Bewertung.</p></div></details>
        </div>}
      </section>; })}{filtered.length === 0 && <p className="empty-search">Keine Fächer gefunden.</p>}</div>
    </article>
  </>;
}

function AreaSummary({ title, result, weight, onWeight }: { title: string; result: { average: number | null; count: number; denominator: number }; weight: number; onWeight: (value: number) => void }) {
  return <div className="area-summary"><div className="area-summary-heading"><div><span>{title}</span><strong>{result.average === null ? "–" : result.average.toFixed(2).replace(".", ",")}<small> P</small></strong></div><span className="course-tag">{result.count} Leistungen</span></div><label>Bereichsgewicht <input type="number" min="0" max="20" step="0.25" value={weight} onChange={(event) => onWeight(Math.max(0, Number(event.target.value)))} />×</label><small>Rechenfaktor {result.denominator.toFixed(2).replace(".", ",")}</small></div>;
}


function SubjectModal({ subject, onClose, onSave }: { subject?: SchoolSubject; onClose: () => void; onSave: (subject: SchoolSubject) => void }) {
  const [name, setName] = useState(subject?.name ?? "");
  const [code, setCode] = useState(subject?.code ?? "");
  const [state, setState] = useState(subject?.state ?? "Baden-Württemberg");
  const [courseType, setCourseType] = useState<SchoolSubject["courseType"]>(subject?.courseType ?? "Basisfach");
  const [weight, setWeight] = useState(subject?.weight ?? 1);
  const [defaultWritten, setDefaultWritten] = useState(subject?.settings[1].writtenWeight ?? 1);
  const [defaultOral, setDefaultOral] = useState(subject?.settings[1].oralWeight ?? 1);
  return <ModalFrame onClose={onClose} labelledBy="subject-modal-title"><form className="add-modal extended-modal" onSubmit={(event) => { event.preventDefault(); if (!name.trim() || !code.trim()) return; const settings = subject ? { ...subject.settings } : EMPTY_SEMESTER_SETTINGS(); SEMESTERS.forEach((semester) => { settings[semester] = { ...settings[semester], writtenWeight: defaultWritten, oralWeight: defaultOral }; }); onSave({ id: subject?.id ?? newId(), name: name.trim(), code: code.trim().toUpperCase(), state, courseType, weight: Math.max(0.1, weight), settings, color: subject?.color ?? COLORS[(subject ? 0 : Date.now()) % COLORS.length] }); }}><div className="modal-heading"><div><span className="eyebrow small-eyebrow">FÄCHERVERWALTUNG</span><h2 id="subject-modal-title">{subject ? "Fach bearbeiten" : "Fach hinzufügen"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Schließen"><X size={17} /></button></div><div className="form-grid"><label className="form-label">Fachname<input value={name} onChange={(event) => setName(event.target.value)} placeholder="z. B. Physik" maxLength={40} required /></label><label className="form-label">Kürzel<input value={code} onChange={(event) => setCode(event.target.value)} placeholder="PH" maxLength={5} required /></label><label className="form-label">Bundesland<select value={state} onChange={(event) => setState(event.target.value)}><option>Baden-Württemberg</option></select></label><label className="form-label">Kursart<select value={courseType} onChange={(event) => setCourseType(event.target.value as SchoolSubject["courseType"])}><option>Basisfach</option><option>Leistungsfach</option></select></label><label className="form-label">Fachgewicht (Gesamtschnitt)<input type="number" min="0.1" max="10" step="0.1" value={weight} onChange={(event) => setWeight(Number(event.target.value))} required /></label><label className="form-label">Schriftlich : mündlich<input aria-label="Schriftliches Gewicht" type="number" min="0" max="20" step="0.25" value={defaultWritten} onChange={(event) => setDefaultWritten(Number(event.target.value))} required /><span className="form-help">Schriftlich × {defaultWritten} : mündlich × {defaultOral}</span></label><label className="form-label">Mündliches Gewicht<input aria-label="Mündliches Gewicht" type="number" min="0" max="20" step="0.25" value={defaultOral} onChange={(event) => setDefaultOral(Number(event.target.value))} required /></label></div><p className="grade-scale">Gewichtungen gelten je Halbjahr und können in der Fächerübersicht individuell angepasst werden.</p><div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Abbrechen</button><button className="button button-primary" disabled={!name.trim() || !code.trim()}><Check size={15} /> {subject ? "Änderungen speichern" : "Fach anlegen"}</button></div></form></ModalFrame>;
}

function PerformanceModal({ subjects, initial, initialSubjectId, initialSemester, manual, onClose, onSave, onSaveManual, onDelete }: { subjects: SchoolSubject[]; initial?: Performance; initialSubjectId?: string; initialSemester?: Semester; manual?: boolean; onClose: () => void; onSave: (performance: Performance) => void; onSaveManual: (subjectId: string, semester: Semester, points: number) => void; onDelete: (id: string) => void }) {
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? initialSubjectId ?? subjects[0]?.id ?? "");
  const [semester, setSemester] = useState<Semester>(initial?.semester ?? initialSemester ?? 1);
  const [points, setPoints] = useState(String(initial?.points ?? ""));
  const [kind, setKind] = useState<GradeKind>(initial?.kind ?? "Klausur");
  const [area, setArea] = useState<GradeArea>(initial?.area ?? "written");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [weight, setWeight] = useState(initial?.weight ?? 1);
  const [entryMode, setEntryMode] = useState<"individual" | "manual">(manual ? "manual" : "individual");
  const selected = subjects.find((item) => item.id === subjectId);
  const modeLabel = entryMode === "manual" ? "Manueller Durchschnitt · Einzelnoten ausgeschlossen" : "Einzelleistungen · Gewichtung pro Note";
  return <ModalFrame onClose={onClose} labelledBy="performance-modal-title"><form className="add-modal extended-modal" onSubmit={(event) => { event.preventDefault(); if (!selected || points === "") return; const value = Math.max(0, Math.min(15, Number(points))); if (entryMode === "manual") { onSaveManual(subjectId, semester, value); return; } onSave({ id: initial?.id ?? newId(), subjectId, semester, points: value, kind, area: kind === "GFS" ? area : kind === "Klausur" || kind === "Test / Klassenarbeit" ? "written" : "oral", date, title: title.trim() || kind, weight: Math.max(0, weight) }); }}><div className="modal-heading"><div><span className="eyebrow small-eyebrow">{modeLabel}</span><h2 id="performance-modal-title">{entryMode === "manual" ? "Fachschnitt eintragen" : initial ? "Leistung bearbeiten" : "Neue Leistung"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Schließen"><X size={17} /></button></div><div className="form-grid"><label className="form-label">Fach<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} required>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="form-label">Halbjahr<select value={semester} onChange={(event) => setSemester(Number(event.target.value) as Semester)}>{SEMESTERS.map((item) => <option key={item} value={item}>{semesterLabel(item)}</option>)}</select></label>{entryMode === "manual" ? <><label className="form-label full-field">Bekannter Durchschnitt · 0–15 Punkte<input type="number" min="0" max="15" step="0.01" value={points} onChange={(event) => setPoints(event.target.value)} placeholder="z. B. 12,5" required autoFocus /></label><p className="manual-warning full-field">Der manuelle Schnitt ersetzt alle Einzelnoten dieses Fachs und Halbjahrs. So wird nichts doppelt gezählt.</p></> : <><label className="form-label">Punkte · 0 bis 15<input type="number" min="0" max="15" step="1" value={points} onChange={(event) => setPoints(event.target.value)} placeholder="z. B. 12" required autoFocus /></label><label className="form-label">Leistungsart<select value={kind} onChange={(event) => { const next = event.target.value as GradeKind; setKind(next); if (next === "GFS") setArea("oral"); }}>{GRADE_KINDS.map((item) => <option key={item}>{item}</option>)}</select></label>{kind === "GFS" && <label className="form-label full-field">GFS-Leistungsbereich<select value={area} onChange={(event) => setArea(event.target.value as GradeArea)}><option value="written">Schriftlicher Leistungsbereich</option><option value="oral">Mündlicher Leistungsbereich</option></select></label>}<label className="form-label">Datum<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="form-label">Gewichtungsfaktor<input type="number" min="0" max="20" step="0.25" value={weight} onChange={(event) => setWeight(Number(event.target.value))} /><span className="form-help">0 schließt die Note aus dem Schnitt aus.</span></label><label className="form-label full-field">Bezeichnung / Thema<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="z. B. Analysis · Integralrechnung" maxLength={100} /></label><label className="form-label full-field mode-select-label">Eingabemodus<select value={entryMode} onChange={(event) => setEntryMode(event.target.value as "individual" | "manual")}><option value="individual">Einzelleistung (weitere Noten werden gewichtet gemittelt)</option><option value="manual">Bekannten Fachschnitt eintragen (Einzelnoten werden ersetzt)</option></select></label></>}</div><div className="modal-actions">{initial && <button type="button" className="button delete-button" onClick={() => onDelete(initial.id)}><X size={14} /> Löschen</button>}<button type="button" className="button button-quiet" onClick={onClose}>Abbrechen</button><button className="button button-primary" disabled={!selected || points === ""}><Check size={15} /> {entryMode === "manual" ? "Durchschnitt speichern" : "Leistung speichern"}</button></div></form></ModalFrame>;
}

function ModalFrame({ children, onClose, labelledBy }: { children: React.ReactNode; onClose: () => void; labelledBy: string }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-labelledby={labelledBy}>{children}</div></div>;
}

function ConfirmDelete({ subject, onCancel, onConfirm }: { subject: SchoolSubject; onCancel: () => void; onConfirm: () => void }) {
  return <ModalFrame onClose={onCancel} labelledBy="delete-subject-title"><div className="add-modal confirm-modal"><span className="eyebrow small-eyebrow">FACH UND LEISTUNGEN ENTFERNEN</span><h2 id="delete-subject-title">{subject.name} löschen?</h2><p>Das Fach und alle zugehörigen Einzelnoten werden dauerhaft aus diesem Browser entfernt.</p><div className="modal-actions"><button className="button button-quiet" onClick={onCancel}>Abbrechen</button><button className="button delete-button" onClick={onConfirm}><X size={14} /> Fach und Noten löschen</button></div></div></ModalFrame>;
}

function CalculationModal({ result, semester, onClose }: { result: ReturnType<typeof calculateSemester>; semester: Semester; onClose: () => void }) {
  return <ModalFrame onClose={onClose} labelledBy="calculation-title"><div className="add-modal calculation-modal"><div className="modal-heading"><div><span className="eyebrow small-eyebrow">PERSÖNLICHE MODELLRECHNUNG</span><h2 id="calculation-title">Rechenweg · {semesterLabel(semester)}</h2></div><button className="icon-button" onClick={onClose} aria-label="Schließen"><X size={17} /></button></div><p className="calculation-lead">Halbjahresschnitt: <strong>{formatPoints(result.average, 2)} Punkte</strong></p><div className="calc-steps">{result.results.map((item) => <div className="calc-step" key={item.subject.id}><strong>{item.subject.name}</strong>{item.mode === "manual" ? <span>Manueller Fachschnitt · {formatPoints(item.average, 2)} P · keine Einzelnoten</span> : <span>Schriftlich {formatPoints(item.written.average, 2)} P × {item.subject.settings[semester].writtenWeight} · Mündlich {formatPoints(item.oral.average, 2)} P × {item.subject.settings[semester].oralWeight} · Fachgewicht {item.subject.weight}× → {formatPoints(item.average, 2)} P</span>}</div>)}</div><p className="manual-warning">Unverbindliche persönliche Modellrechnung. Die offizielle schulische Bewertung kann abweichen.</p><div className="modal-actions"><button className="button button-primary" onClick={onClose}>Schließen</button></div></div></ModalFrame>;
}
