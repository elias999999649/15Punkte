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
  const [subjects, setSubjects] = useState(initialSubjects);
  const skipFirstSubjectSave = useRef(true);
  const [showAdd, setShowAdd] = useState(false);
  const [gradeTarget, setGradeTarget] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("15punkte-theme") as Theme | null;
    if (savedTheme && ["light", "dark", "sepia"].includes(savedTheme)) setTheme(savedTheme);
    const savedSubjects = localStorage.getItem("15punkte-subjects");
    if (savedSubjects) {
      try {
        const parsed = JSON.parse(savedSubjects) as Subject[];
        if (Array.isArray(parsed)) setSubjects(parsed);
      } catch {
        localStorage.removeItem("15punkte-subjects");
      }
    }
  }, []);
  useEffect(() => {
    if (skipFirstSubjectSave.current) {
      skipFirstSubjectSave.current = false;
      return;
    }
    localStorage.setItem("15punkte-subjects", JSON.stringify(subjects));
  }, [subjects]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("15punkte-theme", theme);
  }, [theme]);

  const average = useMemo(
    () =>
      subjects.reduce((sum, item) => sum + item.current, 0) / Math.max(subjects.length, 1),
    [subjects],
  );
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const saveGrade = (name: string, value: number) => {
    setSubjects((current) => current.map((subject) => {
      if (subject.name !== name) return subject;
      const grades = [...subject.grades];
      grades[0] = value;
      const completed = grades.filter((grade): grade is number => grade !== null);
      const nextAverage = (completed.reduce((sum, grade) => sum + grade, 0) / completed.length).toFixed(1).replace(".", ",");
      return { ...subject, current: value, grades, average: nextAverage, trend: value > subject.previous ? "up" : value < subject.previous ? "down" : "same" };
    }));
    setGradeTarget(null);
    notify(`Note für ${name} gespeichert.`);
  };
  const addSubject = (name: string, type: string) => {
    const initials = name.slice(0, 2).toUpperCase();
    setSubjects((current) => [
      ...current,
      {
        name,
        code: initials,
        color: "teal",
        current: 12,
        previous: 12,
        trend: "same",
        grades: [null, null, null, null, null, null],
        average: "—",
        type,
      },
    ]);
    setShowAdd(false);
    notify(`${name} wurde zu deinen Fächern hinzugefügt.`);
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
          {section === "Dashboard" && (
            <Dashboard
              subjects={subjects}
              average={average}
              onAdd={() => setShowAdd(true)}
              onEditGrade={(name) => setGradeTarget(name)}
              onOpenSubjects={() => setSection("Fächer")}
              onOpenAbi={() => setSection("Abitur")}
            />
          )}
          {section === "Fächer" && (
            <SubjectsPage subjects={subjects} onAdd={() => setShowAdd(true)} onEditGrade={(name) => setGradeTarget(name)} />
          )}
          {section === "Abitur" && <AbiturPage average={average} />}
          {section === "Einstellungen" && (
            <SettingsPage
              theme={theme}
              onTheme={setTheme}
              onReset={() => {
                setSubjects(initialSubjects);
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
      {showAdd && (
        <AddSubjectModal onClose={() => setShowAdd(false)} onAdd={addSubject} />
      )}
      {gradeTarget && <GradeModal subject={subjects.find((subject) => subject.name === gradeTarget)!} onClose={() => setGradeTarget(null)} onSave={saveGrade} />}
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Dashboard({
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

function SubjectsPage({
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
