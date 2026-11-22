import { useEffect, useMemo, useRef, useState } from "react";
import type { Auth, User } from "firebase/auth";
import type { Firestore, Unsubscribe } from "firebase/firestore";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calculator,
  Check,
  ChevronUp,
  Trash2,
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
import { Dashboard } from "./Dashboard";
import { GradeEntryModal } from "./GradeEntryModal";
import { CalculationDialog } from "./CalculationDialog";
import { FirebaseAccountPanel, type CloudStatus } from "./FirebaseAccountPanel";
import {
  calculateOverall,
  calculateSemester,
  calculateSubject,
  defaultPreferences,
  emptyGoals,
  createDocument,
  exportGradebook,
  validateGradebookDocument,
  requiredPointsForAverage,
  simulatePerformance,
  type AppPreferences,
  type UserGoal,
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
import {
  BW_ABITUR_2028_RULES,
  simulateAbitur,
  type AbiturCourseGrade,
  type ExamSubject,
} from "../lib/states/baden-wuerttemberg";

type Section = "Dashboard" | "Fächer" | "Abitur" | "Rechner" | "Regeln" | "Statistiken" | "Einstellungen";
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
  { label: "Rechner", icon: Calculator },
  { label: "Statistiken", icon: TrendingUp },
  { label: "Regeln", icon: CircleHelp },
  { label: "Einstellungen", icon: Settings2 },
];
const formatGrade = (grade: number | null) =>
  grade === null ? "—" : `${grade}`;

function readLocalDocument(): import("../lib/gradebook").GradebookDocument | null {
  const stored = localStorage.getItem("15punkte-gradebook-v2");
  if (stored) {
    try {
      const validation = validateGradebookDocument(JSON.parse(stored));
      if (validation.ok) return validation.document;
    } catch {
      return null;
    }
  }
  if (
    localStorage.getItem("15punkte-gradebook-v1") ||
    localStorage.getItem("15punkte-subjects")
  ) {
    return createDocument(loadGradebook(), emptyGoals(), defaultPreferences());
  }
  return null;
}

function hasMeaningfulLocalData(
  document: import("../lib/gradebook").GradebookDocument | null,
) {
  if (!document) return false;
  return (
    document.data.subjects.length > 0 ||
    document.data.performances.length > 0 ||
    document.goals.length > 0 ||
    JSON.stringify(document.preferences) !== JSON.stringify(defaultPreferences())
  );
}

function errorMessage(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  if (code === "auth/unauthorized-domain") {
    return "Diese Domain ist in Firebase Authentication nicht freigegeben. Füge sie in der Firebase Console unter Authentication → Einstellungen → Autorisierte Domains hinzu.";
  }
  if (code === "auth/popup-blocked") {
    return "Das Anmelde-Popup wurde blockiert. Erlaube Pop-ups für diese Website und versuche es erneut.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Die Google-Anmeldung wurde geschlossen, bevor sie abgeschlossen war.";
  }
  if (code === "auth/network-request-failed") {
    return "Keine Verbindung zu Firebase. Prüfe deine Internetverbindung und versuche es erneut.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google-Anmeldung ist in Firebase Authentication noch nicht aktiviert.";
  }
  return error instanceof Error
    ? error.message
    : "Ein unbekannter Fehler ist aufgetreten.";
}

type FirebaseApi = typeof import("../lib/firebase");

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true" style={{ background: 'transparent', overflow: 'hidden' }}>
      <img src="/faviconandlogo.jpg" alt="" style={{ width: '100%', height: '100%', borderRadius: '11px', objectFit: 'cover' }} />
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
  const [gradebook, setGradebook] = useState<GradebookData>(emptyGradebook);
  const [goals, setGoals] = useState<UserGoal[]>(emptyGoals);
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
  const [hasUnsavedWarning, setHasUnsavedWarning] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const localDocument = useRef<import("../lib/gradebook").GradebookDocument | null>(null);
  const firebaseServices = useRef<{ auth: Auth; db: Firestore } | null>(null);
  const firebaseApi = useRef<FirebaseApi | null>(null);
  const lastCloudDocument = useRef<string | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [guestReady, setGuestReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("loading");
  const [cloudDataExists, setCloudDataExists] = useState(false);
  const [localMigrationAvailable, setLocalMigrationAvailable] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [syncAttempt, setSyncAttempt] = useState(0);
  const [pendingCloudImport, setPendingCloudImport] = useState(false);
  const [pendingAccountDelete, setPendingAccountDelete] = useState(false);
  const [showSubject, setShowSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [gradeTarget, setGradeTarget] = useState<{ subjectId?: string; performance?: Performance; semester?: Semester; manual?: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolSubject | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<Semester>(1);
  const [showCalculation, setShowCalculation] = useState(false);
  const [toast, setToast] = useState("");
  const [pendingImport, setPendingImport] = useState<import("../lib/gradebook").GradebookDocument | null>(null);
  const [pendingReset, setPendingReset] = useState(false);
  useEffect(() => {
    const openRules = () => setSection("Regeln");
    const openCalculator = () => setSection("Rechner");
    window.addEventListener("open-rules", openRules);
    window.addEventListener("open-calculator", openCalculator);
    return () => { window.removeEventListener("open-rules", openRules); window.removeEventListener("open-calculator", openCalculator); };
  }, []);
  const subjects = gradebook.subjects;
  const performances = gradebook.performances;

  useEffect(() => {
    let active = true;
    let authSubscription: Unsubscribe | undefined;
    let documentSubscription: Unsubscribe | undefined;
    let sessionVersion = 0;

    const restoreGuestData = () => {
      const saved = readLocalDocument();
      localDocument.current = saved;
      if (saved) {
        setGradebook(saved.data);
        setGoals(saved.goals);
        setPreferences(saved.preferences);
        setTheme(saved.preferences.theme);
        setSelectedSemester(saved.preferences.currentSemester);
      } else {
        setGradebook(loadGradebook());
        setGoals(emptyGoals());
        setPreferences(defaultPreferences());
        setSelectedSemester(defaultPreferences().currentSemester);
        const savedTheme = localStorage.getItem("15punkte-theme") as Theme | null;
        if (savedTheme && ["light", "dark", "sepia"].includes(savedTheme)) {
          setTheme(savedTheme);
        } else {
          setTheme("light");
        }
      }
      const stored = localStorage.getItem("15punkte-gradebook-v2");
      if (stored) {
        try {
          if (!validateGradebookDocument(JSON.parse(stored)).ok) {
            setHasUnsavedWarning(true);
          }
        } catch {
          setHasUnsavedWarning(true);
        }
      }
      setGuestReady(true);
    };

    restoreGuestData();

    const startFirebase = async () => {
      try {
        const api = await import("../lib/firebase");
        const services = await api.initializeFirebase();
        if (!active) return;
        firebaseApi.current = api;
        firebaseServices.current = services;
        authSubscription = api.watchAuthentication(
          (user) => {
            const currentSession = ++sessionVersion;
            documentSubscription?.();
            documentSubscription = undefined;
            setAuthUser(user);
            setAuthReady(true);
            setAccountError("");

            if (!user) {
              setGuestReady(false);
              setCloudReady(false);
              setCloudDataExists(false);
              setLocalMigrationAvailable(false);
              lastCloudDocument.current = null;
              restoreGuestData();
              setCloudStatus("guest");
              return;
            }

            setGuestReady(false);
            setCloudReady(false);
            setCloudStatus("loading");
            let firstSnapshot = true;
            documentSubscription = api.watchUserGradebook(
              services.db,
              user.uid,
              (remoteDocument) => {
                if (!active || currentSession !== sessionVersion) return;
                if (!remoteDocument) {
                  setCloudDataExists(false);
                  lastCloudDocument.current = null;
                  if (hasMeaningfulLocalData(localDocument.current)) {
                    setLocalMigrationAvailable(true);
                    setCloudStatus("migration");
                    setCloudReady(false);
                  } else {
                    const empty = createDocument(
                      emptyGradebook(),
                      emptyGoals(),
                      defaultPreferences(),
                    );
                    setGradebook(empty.data);
                    setGoals(empty.goals);
                    setPreferences(empty.preferences);
                    setTheme(empty.preferences.theme);
                    setSelectedSemester(empty.preferences.currentSemester);
                    setLocalMigrationAvailable(false);
                    setCloudReady(true);
                    setCloudStatus("syncing");
                  }
                  firstSnapshot = false;
                  return;
                }

                const validation = validateGradebookDocument(remoteDocument);
                if (!validation.ok) {
                  setCloudStatus("error");
                  setCloudReady(false);
                  setAccountError(`Cloud-Daten sind ungültig: ${validation.error}`);
                  firstSnapshot = false;
                  return;
                }
                const document = validation.document;
                const canonical = createDocument(
                  document.data,
                  document.goals,
                  document.preferences,
                );
                const serialized = JSON.stringify(canonical);
                const savedLocally = localDocument.current;
                if (
                  firstSnapshot &&
                  savedLocally !== null &&
                  hasMeaningfulLocalData(savedLocally) &&
                  JSON.stringify(
                    createDocument(
                      savedLocally.data,
                      savedLocally.goals,
                      savedLocally.preferences,
                    ),
                  ) !== serialized
                ) {
                  setLocalMigrationAvailable(true);
                } else if (firstSnapshot) {
                  setLocalMigrationAvailable(false);
                }
                setCloudDataExists(true);
                lastCloudDocument.current = serialized;
                setGradebook(document.data);
                setGoals(document.goals);
                setPreferences(document.preferences);
                setTheme(document.preferences.theme);
                setSelectedSemester(document.preferences.currentSemester);
                setCloudReady(true);
                setCloudStatus("saved");
                firstSnapshot = false;
              },
              (error) => {
                if (!active || currentSession !== sessionVersion) return;
                setCloudStatus("error");
                setCloudReady(false);
                setAccountError(`Cloud-Daten konnten nicht geladen werden: ${error.message}`);
              },
            );
          },
          (error) => {
            if (!active) return;
            setAuthReady(true);
            setCloudStatus("error");
            setAccountError(`Firebase-Anmeldung konnte nicht wiederhergestellt werden: ${error.message}`);
          },
        );
      } catch (error) {
        if (!active) return;
        setAuthReady(true);
        setGuestReady(true);
        setCloudStatus("error");
        setAccountError(`Firebase konnte nicht initialisiert werden: ${errorMessage(error)}`);
      }
    };
    void startFirebase();
    return () => {
      active = false;
      sessionVersion += 1;
      authSubscription?.();
      documentSubscription?.();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !guestReady || authUser) return;
    const document = createDocument(gradebook, goals, { ...preferences, theme });
    try {
      localStorage.setItem("15punkte-gradebook-v2", JSON.stringify(document));
      localDocument.current = document;
      setHasUnsavedWarning(false);
    } catch {
      setHasUnsavedWarning(true);
    }
  }, [gradebook, goals, preferences, theme, authReady, guestReady, authUser]);

  useEffect(() => {
    const services = firebaseServices.current;
    const api = firebaseApi.current;
    if (!authUser || !cloudReady || !services || !api) return;
    const document = createDocument(gradebook, goals, { ...preferences, theme });
    const serialized = JSON.stringify(document);
    if (serialized === lastCloudDocument.current) return;

    let active = true;
    const timer = window.setTimeout(() => {
      setCloudStatus("syncing");
      void api.saveUserGradebook(services.db, authUser.uid, document)
        .then(() => {
          if (!active) return;
          lastCloudDocument.current = serialized;
          setCloudDataExists(true);
          setCloudStatus("saved");
          setAccountError("");
        })
        .catch((error: unknown) => {
          if (!active) return;
          setCloudStatus("error");
          setAccountError(`Cloud-Speichern fehlgeschlagen: ${errorMessage(error)}`);
        });
    }, 500);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [gradebook, goals, preferences, theme, authUser, cloudReady, syncAttempt]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (authReady && guestReady && !authUser) {
      localStorage.setItem("15punkte-theme", theme);
    }
    setPreferences((current) => current.theme === theme ? current : { ...current, theme });
  }, [theme, authReady, guestReady, authUser]);

  const overall = useMemo(() => calculateOverall(gradebook), [gradebook]);
  const semesterResult = useMemo(() => calculateSemester(gradebook, selectedSemester), [gradebook, selectedSemester]);
  const average = overall.average ?? 0;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const downloadDocumentBackup = (
    backup: import("../lib/gradebook").GradebookDocument,
  ) => {
    const text = exportGradebook(backup);
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `15punkte-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
  };
  const downloadBackup = () => {
    downloadDocumentBackup(createDocument(gradebook, goals, { ...preferences, theme }));
  };
  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const validation = validateGradebookDocument(parsed);
      if (!validation.ok) { notify(`Import abgelehnt: ${validation.error}`); return; }
      setPendingImport(validation.document);
    } catch { notify("Import abgelehnt: Datei ist kein gültiges JSON."); }
    finally { if (fileInput.current) fileInput.current.value = ""; }
  };
  const confirmImport = () => {
    if (!pendingImport) return;
    setGradebook(pendingImport.data); setGoals(pendingImport.goals); setPreferences(pendingImport.preferences); setTheme(pendingImport.preferences.theme); setSelectedSemester(pendingImport.preferences.currentSemester); setPendingImport(null); notify(authUser ? "Backup importiert; Synchronisierung läuft." : "Backup importiert und lokal gespeichert.");
  };
  const confirmReset = () => {
    setGradebook(emptyGradebook()); setGoals([]); setPreferences(defaultPreferences()); setTheme("light"); setSelectedSemester(1); localDocument.current = null; setLocalMigrationAvailable(false); localStorage.removeItem("15punkte-gradebook-v1"); localStorage.removeItem("15punkte-gradebook-v2"); localStorage.removeItem("15punkte-subjects"); setPendingReset(false); notify("Alle Noten und Ziele wurden zurückgesetzt.");
  };
  const handleGoogleSignIn = async () => {
    setAccountBusy(true);
    setAccountError("");
    try {
      const api = firebaseApi.current;
      if (!api) throw new Error("Firebase ist noch nicht bereit. Lade die Seite neu.");
      await api.signInWithGoogle();
    } catch (error) {
      setAccountError(errorMessage(error));
    } finally {
      setAccountBusy(false);
    }
  };
  const handleGoogleSignOut = async () => {
    setAccountBusy(true);
    setAccountError("");
    try {
      const api = firebaseApi.current;
      if (!api) throw new Error("Firebase ist noch nicht bereit. Lade die Seite neu.");
      await api.signOutFromGoogle();
      notify("Du wurdest abgemeldet. Deine Gastdaten bleiben auf diesem Gerät.");
    } catch (error) {
      setAccountError(`Abmelden fehlgeschlagen: ${errorMessage(error)}`);
    } finally {
      setAccountBusy(false);
    }
  };
  const confirmLocalCloudImport = async () => {
    const saved = localDocument.current;
    const services = firebaseServices.current;
    const api = firebaseApi.current;
    if (!saved || !authUser || !services || !api) return;
    const document = createDocument(saved.data, saved.goals, saved.preferences);
    setAccountBusy(true);
    setAccountError("");
    try {
      if (cloudDataExists) {
        downloadBackup();
      }
      await api.saveUserGradebook(services.db, authUser.uid, document);
      lastCloudDocument.current = JSON.stringify(document);
      setGradebook(document.data);
      setGoals(document.goals);
      setPreferences(document.preferences);
      setTheme(document.preferences.theme);
      setSelectedSemester(document.preferences.currentSemester);
      setCloudDataExists(true);
      setCloudReady(true);
      setCloudStatus("saved");
      setLocalMigrationAvailable(false);
      setPendingCloudImport(false);
      notify(
        cloudDataExists
          ? "Lokale Daten übernommen. Die bisherige Cloud-Sicherung wurde heruntergeladen."
          : "Lokale Daten wurden in dein Konto übernommen.",
      );
    } catch (error) {
      setCloudStatus("error");
      setAccountError(`Datenübernahme fehlgeschlagen: ${errorMessage(error)}`);
    } finally {
      setAccountBusy(false);
    }
  };
  const keepCurrentCloudData = () => {
    setLocalMigrationAvailable(false);
    setPendingCloudImport(false);
    if (cloudDataExists) {
      setCloudReady(true);
      setCloudStatus("saved");
      return;
    }
    const empty = createDocument(emptyGradebook(), emptyGoals(), defaultPreferences());
    lastCloudDocument.current = null;
    setGradebook(empty.data);
    setGoals(empty.goals);
    setPreferences(empty.preferences);
    setTheme(empty.preferences.theme);
    setSelectedSemester(empty.preferences.currentSemester);
    setCloudReady(true);
    setCloudStatus("syncing");
  };
  const confirmAccountDelete = async () => {
    const services = firebaseServices.current;
    const api = firebaseApi.current;
    if (!authUser || !services || !api) return;
    setAccountBusy(true);
    setAccountError("");
    try {
      await api.deleteGoogleAccount(authUser, services.db);
      setPendingAccountDelete(false);
      notify("Dein Konto und die zugehörigen Cloud-Daten wurden gelöscht.");
    } catch (error) {
      setAccountError(`Konto konnte nicht gelöscht werden: ${errorMessage(error)}`);
    } finally {
      setAccountBusy(false);
    }
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
              <strong>{authUser ? "Cloud-Synchronisierung aktiv." : "Gastmodus aktiv."}</strong>
              <span>{authUser ? "Nur für dein Konto zugänglich." : "Daten bleiben auf diesem Gerät."}</span>
            </div>
          </div>
          <button
            className="profile-button"
            onClick={() => setSection("Einstellungen")}
          >
            <span className="profile-avatar">
              {authUser?.displayName?.charAt(0) ?? authUser?.email?.charAt(0) ?? "G"}
            </span>
            <span className="profile-copy">
              <strong>{authUser?.displayName ?? authUser?.email ?? "Gastmodus"}</strong>
              <small>{authUser ? "Google-Konto" : "Ohne Anmeldung"}</small>
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
            <button className="icon-button" aria-label="Regelwerk Baden-Württemberg öffnen" onClick={() => setSection("Regeln")}><CircleHelp size={17} /></button>
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
              aria-label={authUser ? "Konto-Einstellungen öffnen" : "Anmelden und Einstellungen öffnen"}
              onClick={() => setSection("Einstellungen")}
            >
              {authUser?.displayName?.charAt(0) ?? authUser?.email?.charAt(0) ?? "G"}
            </button>
          </div>
        </header>

        <div className="content-wrap">
          {section === "Dashboard" && <Dashboard data={gradebook} average={overall.average} performanceCount={overall.performanceCount} onAddGrade={() => setGradeTarget({})} onOpenSubjects={() => setSection("Fächer")} onShowCalculation={() => setShowCalculation(true)} />}
          {section === "Statistiken" && <StatisticsPage data={gradebook} goals={goals} onGoals={setGoals} />}
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(event) => void importBackup(event.target.files?.[0])} />
          {section === "Fächer" && <SubjectsPage subjects={subjects} gradebook={gradebook} semester={selectedSemester} onSemester={setSelectedSemester} onAdd={() => setShowSubject(true)} onEdit={(subject) => { setEditingSubject(subject.id); setShowSubject(true); }} onDelete={setDeleteTarget} onGrade={(subject, manual = false) => setGradeTarget({ subjectId: subject.id, semester: selectedSemester, manual })} onWeights={saveWeights} onMode={setEntryMode} onPerformanceEdit={(performance) => setGradeTarget({ performance, subjectId: performance.subjectId, semester: performance.semester })} onPerformanceDelete={deletePerformance} />}
          {section === "Abitur" && <AbiturPage average={average} />}
          {section === "Regeln" && <RulesPage />}
          {section === "Rechner" && <OfficialCalculatorPage data={gradebook} onAddCourse={() => setShowSubject(true)} />}
          {section === "Einstellungen" && <SettingsPage theme={theme} onTheme={setTheme} preferences={preferences} onPreferences={(next) => { setPreferences(next); setSelectedSemester(next.currentSemester); setTheme(next.theme); }} onExport={downloadBackup} onImport={() => fileInput.current?.click()} onReset={() => setPendingReset(true)} saveWarning={hasUnsavedWarning} accountProps={{ user: authUser, authReady, busy: accountBusy, status: cloudStatus, error: accountError, migrationAvailable: localMigrationAvailable, cloudDataExists, onSignIn: () => void handleGoogleSignIn(), onSignOut: () => void handleGoogleSignOut(), onDeleteAccount: () => setPendingAccountDelete(true), onImportLocal: () => setPendingCloudImport(true), onKeepCurrent: keepCurrentCloudData,           onRetrySync: () => cloudReady ? setSyncAttempt((value) => value + 1) : window.location.reload() }} /> }
          <footer className="page-footer">
            <span>Mit Ruhe zum Ziel.</span>
            <span>
              15Punkte <i /> Deine Daten. Dein Überblick.
            </span>
          </footer>
        </div>
      </main>
      {showSubject && <SubjectModal subject={subjects.find((subject) => subject.id === editingSubject)} onClose={() => { setShowSubject(false); setEditingSubject(null); }} onSave={saveSubject} />}
      {gradeTarget && <GradeEntryModal subjects={subjects} initial={gradeTarget.performance} initialSubjectId={gradeTarget.subjectId} initialSemester={gradeTarget.semester} manual={gradeTarget.manual} onClose={() => setGradeTarget(null)} onSave={savePerformance} onSaveManual={saveManualAverage} onDelete={deletePerformance} />}
      {deleteTarget && <ConfirmDelete subject={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteSubject(deleteTarget)} />}
      {showCalculation && <CalculationDialog result={semesterResult} semester={selectedSemester} onClose={() => setShowCalculation(false)} />}
      {pendingImport && <ConfirmAction title="Backup importieren?" message="Deine aktuell gespeicherten Daten werden durch den validierten Inhalt der JSON-Datei ersetzt. Dieser Vorgang kann nicht automatisch rückgängig gemacht werden." confirmLabel="Importieren und ersetzen" onCancel={() => setPendingImport(null)} onConfirm={confirmImport} />}
      {pendingReset && <ConfirmAction title="Alle persönlichen Daten löschen?" message="Alle Fächer, Leistungen, Ziele und Einstellungen werden unwiderruflich aus diesem Browser entfernt. Exportiere vorher ein Backup, falls du die Daten behalten möchtest." confirmLabel="Alle Daten löschen" onCancel={() => setPendingReset(false)} onConfirm={confirmReset} />}
      {pendingCloudImport && <ConfirmAction title={cloudDataExists ? "Cloud-Daten ersetzen?" : "Lokale Sicherung übernehmen?"} message={cloudDataExists ? "Die vorhandenen Cloud-Daten werden durch die lokale Sicherung ersetzt. Vorher wird die aktuelle Cloud-Sicherung als JSON heruntergeladen. Fahre nur fort, wenn du diese Änderung möchtest." : "Deine lokale Sicherung wird in dein Google-Konto kopiert. Sie bleibt zusätzlich als Gastdaten auf diesem Gerät erhalten."} confirmLabel="Lokale Daten übernehmen" onCancel={() => setPendingCloudImport(false)} onConfirm={() => void confirmLocalCloudImport()} />}
      {pendingAccountDelete && <ConfirmAction title="Google-Konto und Cloud-Daten löschen?" message="Das Notenbuch in Firestore und dein Firebase-Anmeldekonto werden dauerhaft gelöscht. Deine getrennt gespeicherten Gastdaten auf diesem Gerät bleiben erhalten. Zur Bestätigung wirst du möglicherweise erneut bei Google angemeldet." confirmLabel="Konto endgültig löschen" onCancel={() => setPendingAccountDelete(false)} onConfirm={() => void confirmAccountDelete()} />}
      {hasUnsavedWarning && <div className="storage-warning" role="alert">Speichern im Browser ist fehlgeschlagen oder der gespeicherte Datenstand war ungültig. Exportiere deine Daten als Backup.</div>}
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}

function _LegacyDashboard({
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
            <div className="panel-heading-actions"><button className="text-button" onClick={onOpenSubjects}>Alle Fächer <ArrowRight size={14} /></button></div>
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

function _LegacySubjectsPage({ subjects, onAdd, onEditGrade }: { subjects: Subject[]; onAdd: () => void; onEditGrade: (name: string) => void }) {
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

function LegacyAbiturPage({ average }: { average: number }) {
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

function LegacySettingsPage({ theme, onTheme, onReset }: { theme: Theme; onTheme: (theme: Theme) => void; onReset: () => void }) {
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


function _LegacyDashboardDuplicate({ subjects, performances, average, performanceCount, onAddGrade, onOpenSubjects }: { subjects: SchoolSubject[]; performances: Performance[]; average: number; performanceCount: number; onAddGrade: () => void; onOpenSubjects: () => void }) {
  const semesterResults = SEMESTERS.map((semester) => ({ semester, ...calculateSemester({ version: 1, subjects, performances }, semester) }));
  const latest = [...semesterResults].reverse().find((item) => item.average !== null);
  const ranked = (latest?.results ?? []).slice().sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  const best = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const current = latest ?? null;
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


function OfficialCalculatorPage({ data, onAddCourse }: { data: GradebookData; onAddCourse: () => void }) {
  const [courses, setCourses] = useState<AbiturCourseGrade[]>(() => data.subjects.flatMap((subject) => SEMESTERS.map((semester) => { const result = calculateSubject(subject, data.performances, semester); return { subjectId: subject.id, subjectName: subject.name, semester, points: result.average === null ? null : Math.round(result.average), courseType: subject.courseType, compulsory: false, excluded: false }; })));
  const [exams, setExams] = useState<ExamSubject[]>(() => Array.from({ length: 5 }, (_, index) => ({ subjectId: data.subjects[index]?.id ?? `exam-${index + 1}`, subjectName: data.subjects[index]?.name ?? `Prüfungsfach ${index + 1}`, points: null, written: index < 3, oral: index >= 3 })));
  const [confirmedEligible, setConfirmedEligible] = useState(false);
  const [mode, setMode] = useState<"estimate" | "official">("estimate");
  const result = simulateAbitur({ courses, exams, confirmedEligible });
  const replaceCourse = (key: string, points: number | null, field: "points" | "excluded" = "points") => setCourses((current) => current.map((course) => `${course.subjectId}-${course.semester}` !== key ? course : { ...course, [field]: points }));
  const setExam = (index: number, patch: Partial<ExamSubject>) => setExams((current) => current.map((exam, item) => item === index ? { ...exam, ...patch } : exam));
  const setExamSubject = (index: number, subjectId: string) => { const subject = data.subjects.find((item) => item.id === subjectId); if (subject) setExam(index, { subjectId, subjectName: subject.name, written: index < 3, oral: index >= 3 }); };
  const subjectOptions = data.subjects;
  return <><section className="page-heading"><div><div className="eyebrow"><span className="status-dot" /> BADEN-WÜRTTEMBERG · ABITUR 2028</div><h1>Abitur-<span>rechner.</span></h1><p>Block I, Prüfungen und Voraussetzungen – mit getrenntem Szenario und offiziellem Ergebnis.</p></div></section><div className="model-notice"><Calculator size={14} /><span><strong>Simulationsstand:</strong> {result.status === "passed" ? "Voraussetzungen laut eingegebenen Daten erfüllt." : result.status === "failed" ? "Mindestens eine Bestehensvoraussetzung ist laut Simulation nicht erfüllt." : "Noch keine vollständige offizielle Gesamtqualifikation – fehlende Voraussetzungen unten."}</span></div><div className="calculator-mode"><button className={mode === "estimate" ? "selected" : ""} onClick={() => setMode("estimate")}>Persönliche Prognose</button><button className={mode === "official" ? "selected" : ""} onClick={() => setMode("official")}>Offizielle Berechnung</button></div>
    <section className="qualification-summary"><article className="panel qualification-block"><span className="eyebrow small-eyebrow">BLOCK I · KURSLEISTUNGEN</span><strong>{result.blockI === null ? "Noch offen" : `${result.blockI.toFixed(1).replace(".", ",")} / 600`}</strong><div className="qualification-track"><span style={{ width: `${result.blockI === null ? 0 : Math.min(result.blockI / 600 * 100, 100)}%` }} /></div><small>{result.counts.included} von 40 Kursen · {result.counts.advanced}/12 Leistungskurse</small></article><article className="panel qualification-block"><span className="eyebrow small-eyebrow">BLOCK II · PRÜFUNGEN</span><strong>{result.blockII === null ? "Noch offen" : `${result.blockII} / 300`}</strong><div className="qualification-track"><span style={{ width: `${result.blockII === null ? 0 : Math.min(result.blockII / 300 * 100, 100)}%` }} /></div><small>{exams.filter((exam) => exam.points !== null).length} von 5 Ergebnissen eingetragen</small></article><article className="panel qualification-total"><span className="eyebrow small-eyebrow">GESAMTQUALIFIKATION</span><strong>{result.total === null ? "Keine belastbare Summe" : `${result.total} / 900`}</strong><small>{result.grade ? `Voraussichtliche Note ${result.grade}` : "Note erst nach vollständiger und gültiger Eingabe"}</small></article></section>
    {mode === "estimate" ? <div className="panel scenario-card"><h2>Persönliche Prognose · Annahmen</h2><p>Trage angenommene Punktzahlen in noch offene Felder ein. Prognosewerte werden nur simuliert und zeigen kein offizielles Ergebnis.</p><button className="button button-quiet small-button" onClick={() => setMode("official")}>Zur offiziellen Berechnung wechseln</button></div> : <div className="panel scenario-card official-mode-note"><h2>Offizielle Berechnung</h2><p>Ein Ergebnis wird nur angezeigt, wenn die Kurse, Prüfungen, Pflichtbelegung und Zulassung bestätigt sind. Fiktive Annahmen sind deaktiviert.</p></div>}
    <article className="panel calculator-panel"><div className="panel-heading"><div><h2>Block I · 40 einzubringende Kurse</h2><p>Drei Leistungsfächer × vier Halbjahre doppelt; 28 weitere Kurse einfach.</p></div><button className="text-button" onClick={onAddCourse}>Fach ergänzen <Plus size={14} /></button></div>{courses.length === 0 ? <div className="empty-search">Lege Fächer und Halbjahresnoten zuerst an. <button className="text-button" onClick={onAddCourse}>Fach erstellen</button></div> : <div className="table-scroll"><table className="grades-table calculator-table"><thead><tr><th>FACH</th><th>HALBJAHR</th><th>KURSART</th><th>PUNKTE</th><th>BLOCK I</th></tr></thead><tbody>{courses.map((course) => <tr key={`${course.subjectId}-${course.semester}`}><td>{course.subjectName}</td><td>H{course.semester}</td><td>{course.courseType}</td><td><input aria-label={`${course.subjectName} H${course.semester} Punkte`} type="number" min="0" max="15" value={course.points ?? ""} placeholder="–" onChange={(event) => replaceCourse(`${course.subjectId}-${course.semester}`, event.target.value === "" ? null : Math.max(0, Math.min(15, Number(event.target.value))))} /></td><td><label className="checkbox-label"><input type="checkbox" checked={Boolean(course.excluded)} onChange={(event) => setCourses((current) => current.map((item) => `${item.subjectId}-${item.semester}` === `${course.subjectId}-${course.semester}` ? { ...item, excluded: event.target.checked } : item))} /> Einbringen</label></td></tr>)}</tbody></table></div>}<div className="model-caption"><Calculator size={13} /> Block-I-Gesamt wird erst bei genau 40 vollständigen Kursen und 12 LF-Kursen berechnet.</div></article>
    <article className="panel calculator-panel"><div className="panel-heading"><div><h2>Block II · Abiturprüfungen</h2><p>Fünf unterschiedliche Prüfungsfächer; drei schriftliche Prüfungen.</p></div></div><div className="table-scroll"><table className="grades-table calculator-table exam-table"><thead><tr><th>PRÜFUNGSFACH</th><th>PRÜFUNGSART</th><th>PUNKTE</th><th>GEWICHTUNG</th></tr></thead><tbody>{exams.map((exam, index) => <tr key={index}><td><select aria-label={`Prüfungsfach ${index + 1}`} value={subjectOptions.some((subject) => subject.id === exam.subjectId) ? exam.subjectId : ""} onChange={(event) => setExamSubject(index, event.target.value)}><option value="">Fach auswählen</option>{subjectOptions.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></td><td>{index < 3 ? "Schriftlich" : "Mündlich"}</td><td><input aria-label={`Prüfung ${index + 1} Punkte`} type="number" min="0" max="15" value={exam.points ?? ""} placeholder="offen" onChange={(event) => setExam(index, { points: event.target.value === "" ? null : Math.max(0, Math.min(15, Number(event.target.value))) })} /></td><td>4×</td></tr>)}</tbody></table></div></article>
    <section className="panel requirements-panel"><div className="panel-heading"><div><h2>Voraussetzungen & fehlende Angaben</h2><p>Eine fehlende Pflichtbelegungsprüfung verhindert ein amtliches Ergebnis.</p></div><span className="course-tag">{result.missing.length} offen</span></div><label className="eligibility-confirm"><input type="checkbox" checked={confirmedEligible} onChange={(event) => setConfirmedEligible(event.target.checked)} /> Die Schule hat meine Zulassung zur Abiturprüfung bestätigt.</label><ul className="requirement-list">{result.missing.map((missing) => <li key={missing}><CircleHelp size={14} />{missing}</li>)}</ul><p className="manual-warning">Die vollständige jahrgangsspezifische Pflichtfach-/Aufgabenfeldprüfung ist nicht automatisiert. Auch mit erfüllten Rechenwerten bleibt die Zulassung durch die Schule maßgeblich.</p></section>
    <section className="panel official-result-panel"><div><span className="eyebrow small-eyebrow">{mode === "official" ? "OFFIZIELLE BERECHNUNG" : "PERSÖNLICHE PROGNOSE"}</span><h2>{result.status === "passed" ? `Voraussichtlicher Abiturschnitt ${result.grade}` : result.status === "failed" ? "Bestehensgrenzen nicht erfüllt" : "Noch keine belastbare Abiturnote"}</h2><p>{result.total === null ? "Block I und Block II werden erst ausgewiesen, wenn die jeweiligen Eingangsdaten vollständig sind." : `Block I ${result.blockI?.toFixed(1).replace(".", ",")} + Block II ${result.blockII} = ${result.total} Gesamtpunkte.`}</p></div><span className={`result-status ${result.status}`}>{result.status === "passed" ? "Voraussetzungen erfüllt" : result.status === "failed" ? "nicht bestanden" : "Angaben fehlen"}</span></section>
    <section className="panel rules-note"><h2>Regelstand & Prüfungsordnung</h2><p>Abiturjahrgang 2028 · AGVO, ergänzt durch den KM-Leitfaden gymnasiale Oberstufe (Stand 16.12.2025). Quellen und offene Prüfpunkte findest du im <button className="text-button" onClick={() => window.dispatchEvent(new CustomEvent("open-rules"))}>Regelwerk.</button></p></section></>;
}


function AbiturPage({ average }: { average: number }) {
  return <><section className="page-heading"><div><div className="eyebrow"><span className="status-dot" /> BADEN-WÜRTTEMBERG · ABITUR 2028</div><h1>Dein Weg zum <span>Abitur.</span></h1><p>Die Simulation zeigt dir transparent, was schon feststeht und was noch fehlt.</p></div><button className="button button-primary" onClick={() => window.dispatchEvent(new CustomEvent("open-calculator"))}><Calculator size={15} /> Abiturrechner öffnen</button></section><div className="model-notice"><Calculator size={14} /><span><strong>Persönliche Modellrechnung ≠ offizielle Bewertung.</strong> Die landesrechtliche Gesamtqualifikation wird erst bei vollständigen und bestätigten Angaben ausgewiesen.</span></div><section className="abi-hero panel"><div className="abi-hero-copy"><span className="eyebrow small-eyebrow">AKTUELLER KURS-SCHNITT</span><h2>{average ? `${average.toFixed(2).replace(".", ",")} Punkte` : "Noch keine Note"}</h2><p>Der persönliche Gesamtschnitt ist eine gewichtete Modellrechnung über deine erfassten Fächer. Er ist kein Abiturschnitt.</p></div><div className="abi-score-wrap"><div className="abi-score-circle"><span>?</span><small>Prognose offen</small></div><span className="score-caption">Offizielle Berechnung unvollständig</span></div></section><section className="panel rules-list-panel"><div className="panel-heading"><div><h2>Dein Stand für Block I & II</h2><p>Vollständige Eingabe im Abiturrechner.</p></div><button className="text-button" onClick={() => window.dispatchEvent(new CustomEvent("open-calculator"))}>Rechner öffnen <ArrowRight size={14} /></button></div><ul className="rules-facts unresolved-facts"><li><CircleHelp size={14} />Es fehlen Kursbelegung, genau 40 einzubringende Kurse und bestätigte Prüfungsfächer.</li><li><CircleHelp size={14} />Eine Prognose ohne Pflichtfach- und Zulassungsprüfung wäre irreführend – daher aktuell keine Note.</li><li><Check size={14} />Der individuelle Kursdurchschnitt liegt bei {average ? average.toFixed(2).replace(".", ",") : "–"} Punkten (persönliche Modellrechnung).</li></ul></section></>;
}

function _OldOfficialCalculatorPage2a({ data, onAddCourse }: { data: GradebookData; onAddCourse: () => void }) {
  const [courses, setCourses] = useState<AbiturCourseGrade[]>(() => data.subjects.flatMap((subject) => SEMESTERS.map((semester) => { const result = calculateSubject(subject, data.performances, semester); return { subjectId: subject.id, subjectName: subject.name, semester, points: result.average === null ? null : Math.round(result.average), courseType: subject.courseType, compulsory: false, excluded: false }; })));
  const [exams, setExams] = useState<ExamSubject[]>(() => Array.from({ length: 5 }, (_, index) => ({ subjectId: data.subjects[index]?.id ?? `exam-${index + 1}`, subjectName: data.subjects[index]?.name ?? `Prüfungsfach ${index + 1}`, points: null, written: index < 3, oral: index >= 3 })));
  const [confirmedEligible, setConfirmedEligible] = useState(false);
  const [mode, setMode] = useState<"estimate" | "official">("official");
  const result = simulateAbitur({ courses, exams, confirmedEligible });
  const replaceCourse = (key: string, points: number | null) => setCourses((current) => current.map((course) => `${course.subjectId}-${course.semester}` !== key ? course : { ...course, points }));
  const toggleIncluded = (key: string, included: boolean) => setCourses((current) => current.map((course) => `${course.subjectId}-${course.semester}` !== key ? course : { ...course, excluded: !included }));
  const setExam = (index: number, patch: Partial<ExamSubject>) => setExams((current) => current.map((exam, item) => item === index ? { ...exam, ...patch } : exam));
  const setExamSubject = (index: number, subjectId: string) => { const subject = data.subjects.find((item) => item.id === subjectId); if (subject) setExam(index, { subjectId, subjectName: subject.name, written: index < 3, oral: index >= 3 }); };
  const subjectOptions = data.subjects;
  const predicted = result.status === "passed" && mode === "estimate";
  return <><section className="page-heading"><div><div className="eyebrow"><span className="status-dot" /> BADEN-WÜRTTEMBERG · ABITUR 2028</div><h1>Abitur-<span>rechner.</span></h1><p>Block I, Prüfungen und Voraussetzungen – mit klar getrennter persönlicher Prognose und offiziellem Ergebnis.</p></div></section><div className="model-notice"><Calculator size={14} /><span><strong>Simulationsstand:</strong> {result.status === "passed" ? "Die eingegebenen Rechenwerte erfüllen die geprüften Punktgrenzen." : result.status === "failed" ? "Mindestens eine Bestehensvoraussetzung ist laut Simulation nicht erfüllt." : "Noch keine vollständige offizielle Gesamtqualifikation – fehlende Voraussetzungen unten."}</span></div><div className="calculator-mode"><button className={mode === "estimate" ? "selected" : ""} onClick={() => setMode("estimate")}>Persönliche Prognose</button><button className={mode === "official" ? "selected" : ""} onClick={() => setMode("official")}>Offizielle Berechnung</button></div>
    <section className="qualification-summary"><article className="panel qualification-block"><span className="eyebrow small-eyebrow">BLOCK I · KURSLEISTUNGEN</span><strong>{result.blockI === null ? "Noch offen" : `${result.blockI.toFixed(1).replace(".", ",")} / 600`}</strong><div className="qualification-track"><span style={{ width: `${result.blockI === null ? 0 : Math.min(result.blockI / 600 * 100, 100)}%` }} /></div><small>{result.counts.included} von 40 Kursen · {result.counts.advanced}/12 Leistungskurse</small></article><article className="panel qualification-block"><span className="eyebrow small-eyebrow">BLOCK II · PRÜFUNGEN</span><strong>{result.blockII === null ? "Noch offen" : `${result.blockII} / 300`}</strong><div className="qualification-track"><span style={{ width: `${result.blockII === null ? 0 : Math.min(result.blockII / 300 * 100, 100)}%` }} /></div><small>{exams.filter((exam) => exam.points !== null).length} von 5 Ergebnissen eingetragen</small></article><article className="panel qualification-total"><span className="eyebrow small-eyebrow">GESAMTQUALIFIKATION</span><strong>{result.total === null ? "Keine belastbare Summe" : `${result.total} / 900`}</strong><small>{result.grade ? `Voraussichtliche Note ${result.grade}` : "Note erst nach vollständiger und gültiger Eingabe"}</small></article></section>
    {mode === "estimate" ? <div className="panel scenario-card"><h2>Persönliche Prognose · Annahmen</h2><p>Trage angenommene Ergebnisse in die markierten Felder ein. Eine Prognose wird nur angezeigt, wenn die Modellbedingungen erfüllt und sämtliche realen Kurspunkte vorhanden sind. Eingaben werden nicht als offizielle Ist-Werte ausgegeben.</p></div> : <div className="panel scenario-card official-mode-note"><h2>Offizielle Berechnung</h2><p>Die offizielle Summe wird erst angezeigt, wenn alle Kurse, Prüfungen, Pflichtbelegungen und die schulische Zulassung bestätigt sind. Eine unbestätigte Laufbahn bleibt ausdrücklich unvollständig.</p></div>}
    <article className="panel calculator-panel"><div className="panel-heading"><div><h2>Block I · 40 einzubringende Kurse</h2><p>Drei Leistungsfächer × vier Halbjahre doppelt; 28 weitere Kurse einfach.</p></div><button className="text-button" onClick={onAddCourse}>Fach ergänzen <Plus size={14} /></button></div>{courses.length === 0 ? <div className="empty-search">Lege Fächer und Halbjahresnoten zuerst an. <button className="text-button" onClick={onAddCourse}>Fach erstellen</button></div> : <div className="table-scroll"><table className="grades-table calculator-table"><thead><tr><th>FACH</th><th>HALBJAHR</th><th>KURSART</th><th>PUNKTE</th><th>BLOCK I</th></tr></thead><tbody>{courses.map((course) => <tr key={`${course.subjectId}-${course.semester}`}><td>{course.subjectName}</td><td>H{course.semester}</td><td>{course.courseType}</td><td><input aria-label={`${course.subjectName} H${course.semester} Punkte`} type="number" min="0" max="15" value={course.points ?? ""} placeholder="–" onChange={(event) => replaceCourse(`${course.subjectId}-${course.semester}`, event.target.value === "" ? null : Math.max(0, Math.min(15, Number(event.target.value))))} /></td><td><label className="checkbox-label"><input type="checkbox" checked={!course.excluded} onChange={(event) => toggleIncluded(`${course.subjectId}-${course.semester}`, event.target.checked)} /> Einbringen</label></td></tr>)}</tbody></table></div>}<div className="model-caption"><Calculator size={13} /> Der Rechner kontrolliert 40 vollständige Kurse, davon genau 12 LF-Kurse. Pflichtkurs-Status muss zusätzlich von der Schule bestätigt werden.</div></article>
    <article className="panel calculator-panel"><div className="panel-heading"><div><h2>Block II · Abiturprüfungen</h2><p>Fünf unterschiedliche Prüfungsfächer; drei schriftliche Prüfungen.</p></div></div><div className="table-scroll"><table className="grades-table calculator-table exam-table"><thead><tr><th>PRÜFUNGSFACH</th><th>PRÜFUNGSART</th><th>PUNKTE</th><th>GEWICHTUNG</th></tr></thead><tbody>{exams.map((exam, index) => <tr key={index}><td><select aria-label={`Prüfungsfach ${index + 1}`} value={subjectOptions.some((subject) => subject.id === exam.subjectId) ? exam.subjectId : ""} onChange={(event) => setExamSubject(index, event.target.value)}><option value="">Fach auswählen</option>{subjectOptions.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></td><td>{index < 3 ? "Schriftlich" : "Mündlich"}</td><td><input aria-label={`Prüfung ${index + 1} Punkte`} type="number" min="0" max="15" value={exam.points ?? ""} placeholder="offen" onChange={(event) => setExam(index, { points: event.target.value === "" ? null : Math.max(0, Math.min(15, Number(event.target.value))) })} /></td><td>4×</td></tr>)}</tbody></table></div></article>
    <section className="panel requirements-panel"><div className="panel-heading"><div><h2>Voraussetzungen & fehlende Angaben</h2><p>Fehlende Belegungsprüfung verhindert ein amtliches Ergebnis.</p></div><span className="course-tag">{result.missing.length} offen</span></div><label className="eligibility-confirm"><input type="checkbox" checked={confirmedEligible} onChange={(event) => setConfirmedEligible(event.target.checked)} /> Die Schule hat meine Zulassung zur Abiturprüfung bestätigt.</label><ul className="requirement-list">{result.missing.map((missing) => <li key={missing}><CircleHelp size={14} />{missing}</li>)}</ul><p className="manual-warning">Die vollständige jahrgangsspezifische Pflichtfach-/Aufgabenfeldprüfung ist nicht automatisiert. Auch mit erfüllten Rechenwerten bleibt die Zulassung durch die Schule maßgeblich.</p></section>
    <section className="panel official-result-panel"><div><span className="eyebrow small-eyebrow">{predicted ? "PERSÖNLICHE PROGNOSE" : "OFFIZIELLE BERECHNUNG"}</span><h2>{result.status === "passed" ? `${predicted ? "Szenario · " : "Voraussichtlicher Abiturschnitt "}${result.grade}` : result.status === "failed" ? "Bestehensgrenzen nicht erfüllt" : "Noch keine belastbare Abiturnote"}</h2><p>{result.total === null ? "Block I und Block II werden erst ausgewiesen, wenn die Eingangsdaten vollständig sind." : `Block I ${result.blockI?.toFixed(1).replace(".", ",")} + Block II ${result.blockII} = ${result.total} Gesamtpunkte.`}</p></div><span className={`result-status ${result.status}`}>{result.status === "passed" ? "Rechenwerte erfüllt" : result.status === "failed" ? "Grenzen unterschritten" : "Angaben fehlen"}</span></section>
    <section className="panel rules-note"><h2>Regelstand & Prüfungsordnung</h2><p>Abiturjahrgang 2028 · AGVO, ergänzt durch den KM-Leitfaden gymnasiale Oberstufe (Stand 16.12.2025). Quellen und offene Prüfpunkte findest du im <button className="text-button" onClick={() => window.dispatchEvent(new CustomEvent("open-rules"))}>Regelwerk.</button></p></section></>;
}


function RulesPage() {
  const rules = BW_ABITUR_2028_RULES;
  return <><section className="page-heading"><div><div className="eyebrow"><span className="status-dot" /> REGELWERK · ABITURJAHRGANG 2028</div><h1>Regeln. <span>Mit Quellen.</span></h1><p>Jahrgangsbezogene Orientierung für das allgemeinbildende Gymnasium in Baden-Württemberg.</p></div><a className="button button-quiet" href={rules.sources[0].url} target="_blank" rel="noreferrer">Amtlichen Leitfaden öffnen <ArrowRight size={14} /></a></section><div className="model-notice"><CircleHelp size={14} /><span><strong>Keine verbindliche Zulassungsentscheidung.</strong> Maßgeblich sind die für deinen Jahrgang geltende AGVO und die Auskunft deiner Schule.</span></div><section className="rules-summary"><div className="panel rules-intro"><span className="eyebrow small-eyebrow">PRÜFUNGSORDNUNG</span><h2>{rules.schoolType}</h2><p>{rules.examinationOrder}</p><div className="rules-meta"><span>Geltungsbezug</span><strong>Abitur 2028 · Kursstufe 2025–2028</strong></div><div className="rules-meta"><span>Regelstand geprüft</span><strong>21. November 2026 · {rules.rulesetVersion}</strong></div><p className="grade-scale">Einführungsphase: Orientierung und Kurswahl vor Eintritt in die Qualifikationsphase. Qualifikationsphase: vier Kurshalbjahre. Belegpflichten und Zulassung müssen schülerbezogen bestätigt werden.</p></div><div className="panel block-cards"><div><span>BLOCK I</span><strong>40 <small>Kurse</small></strong><p>12 Leistungskurs-Halbjahre doppelt + 28 weitere Kurse einfach, Faktor 40/48. Max. 600 Punkte.</p></div><div><span>BLOCK II</span><strong>5 <small>Prüfungen</small></strong><p>Drei schriftliche Prüfungsfächer; fünf Prüfungsergebnisse jeweils vierfach. Max. 300 Punkte.</p></div><div><span>GESAMTQUALIFIKATION</span><strong>900 <small>Punkte</small></strong><p>Bestehensgrenzen: Block I ≥ 200, Block II ≥ 100 und Gesamt ≥ 300.</p></div></div></section><section className="panel rules-list-panel"><div className="panel-heading"><div><h2>Verifizierte Eckpunkte</h2><p>Aus dem offiziellen Leitfaden für Abitur 2028.</p></div><span className="verified-badge"><Check size={12} /> Quellen dokumentiert</span></div><ul className="rules-facts">{rules.verifiedFacts.map((fact) => <li key={fact}><Check size={14} />{fact}</li>)}</ul></section><section className="panel rules-list-panel"><div className="panel-heading"><div><h2>Offene Prüfbereiche</h2><p>Diese Punkte erfordern individuelle Laufbahn- und Schulangaben.</p></div></div><ul className="rules-facts unresolved-facts">{rules.unresolved.map((fact) => <li key={fact}><CircleHelp size={14} />{fact}</li>)}</ul></section><section className="panel rules-list-panel"><div className="panel-heading"><div><h2>Amtliche Quellen</h2><p>Prüfungsordnung und Jahrgangsleitfaden, geprüft am 21.11.2026.</p></div></div><div className="source-list">{rules.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><span><strong>{source.label}</strong><small>{source.note}</small></span><ArrowRight size={14} /></a>)}</div></section></>;
}

function _OldOfficialCalculatorPage2b({ data, onAddCourse }: { data: GradebookData; onAddCourse: () => void }) {
  const [courses, setCourses] = useState<AbiturCourseGrade[]>(() => data.subjects.flatMap((subject) => SEMESTERS.map((semester) => { const result = calculateSubject(subject, data.performances, semester); return { subjectId: subject.id, subjectName: subject.name, semester, points: result.average === null ? null : Math.round(result.average), courseType: subject.courseType, compulsory: false, excluded: false }; })));
  const [exams, setExams] = useState<ExamSubject[]>(() => Array.from({ length: 5 }, (_, index) => ({ subjectId: data.subjects[index]?.id ?? `exam-${index + 1}`, subjectName: data.subjects[index]?.name ?? `Prüfungsfach ${index + 1}`, points: null, written: index < 3, oral: index >= 3 })));
  const [confirmedEligible, setConfirmedEligible] = useState(false);
  const [mode, setMode] = useState<"estimate" | "official">("official");
  const result = simulateAbitur({ courses, exams, confirmedEligible });
  const setCoursePoints = (key: string, points: number | null) => setCourses((current) => current.map((course) => `${course.subjectId}-${course.semester}` !== key ? course : { ...course, points }));
  const setCourseIncluded = (key: string, included: boolean) => setCourses((current) => current.map((course) => `${course.subjectId}-${course.semester}` !== key ? course : { ...course, excluded: !included }));
  const setExam = (index: number, patch: Partial<ExamSubject>) => setExams((current) => current.map((exam, item) => item === index ? { ...exam, ...patch } : exam));
  const setExamSubject = (index: number, subjectId: string) => { const subject = data.subjects.find((item) => item.id === subjectId); if (subject) setExam(index, { subjectId, subjectName: subject.name }); };
  return <><section className="page-heading"><div><div className="eyebrow"><span className="status-dot" /> BADEN-WÜRTTEMBERG · ABITUR 2028</div><h1>Abitur-<span>rechner.</span></h1><p>Block I, Prüfungen und Voraussetzungen – persönliche Prognose und offizielle Rechnung strikt getrennt.</p></div></section><div className="model-notice"><Calculator size={14} /><span><strong>Simulationsstand:</strong> {result.status === "passed" ? "Die eingegebenen Punktgrenzen sind erfüllt." : result.status === "failed" ? "Mindestens eine Bestehensgrenze ist unterschritten." : "Noch keine vollständige Gesamtqualifikation; fehlende Angaben stehen unten."}</span></div><div className="calculator-mode"><button className={mode === "estimate" ? "selected" : ""} onClick={() => setMode("estimate")}>Persönliche Prognose</button><button className={mode === "official" ? "selected" : ""} onClick={() => setMode("official")}>Offizielle Berechnung</button></div><section className="qualification-summary"><article className="panel qualification-block"><span className="eyebrow small-eyebrow">BLOCK I · KURSLEISTUNGEN</span><strong>{result.blockI === null ? "Noch offen" : `${result.blockI.toFixed(1).replace(".", ",")} / 600`}</strong><div className="qualification-track"><span style={{ width: `${result.blockI === null ? 0 : Math.min(result.blockI / 600 * 100, 100)}%` }} /></div><small>{result.counts.included} / 40 Kurse · {result.counts.advanced} / 12 LF</small></article><article className="panel qualification-block"><span className="eyebrow small-eyebrow">BLOCK II · PRÜFUNGEN</span><strong>{result.blockII === null ? "Noch offen" : `${result.blockII} / 300`}</strong><div className="qualification-track"><span style={{ width: `${result.blockII === null ? 0 : Math.min(result.blockII / 300 * 100, 100)}%` }} /></div><small>{exams.filter((exam) => exam.points !== null).length} / 5 Ergebnisse</small></article><article className="panel qualification-total"><span className="eyebrow small-eyebrow">GESAMTQUALIFIKATION</span><strong>{result.total === null ? "Noch offen" : `${result.total} / 900`}</strong><small>{result.grade ? `Abiturnote ${result.grade}` : "Note erst bei vollständigen Angaben"}</small></article></section>{mode === "estimate" ? <div className="panel scenario-card"><h2>Persönliche Prognose · Szenario</h2><p>Die Eingaben werden ausschließlich als persönliche Annahmen behandelt. Offizielle Werte werden nicht ausgewiesen, solange Pflichtbelegung und Schulzulassung fehlen.</p></div> : <div className="panel scenario-card official-mode-note"><h2>Offizielle Berechnung</h2><p>Voraussetzung ist die vollständige Laufbahn, gültige Einbringung und schulisch bestätigte Zulassung. Ungeklärte Pflichtbelegungen verhindern die amtliche Ergebnisanzeige.</p></div>}<article className="panel calculator-panel"><div className="panel-heading"><div><h2>Block I · Kursleistungen</h2><p>40 Kurse: 12 LF-Halbjahre doppelt und 28 weitere Kurse einfach (× 40/48).</p></div><button className="text-button" onClick={onAddCourse}>Fach ergänzen <Plus size={14} /></button></div><div className="table-scroll"><table className="grades-table calculator-table"><thead><tr><th>FACH</th><th>HALBJAHR</th><th>KURSART</th><th>PUNKTE</th><th>EINBRINGUNG</th></tr></thead><tbody>{courses.map((course) => <tr key={`${course.subjectId}-${course.semester}`}><td>{course.subjectName}</td><td>H{course.semester}</td><td>{course.courseType}</td><td><input aria-label={`${course.subjectName} H${course.semester} Punkte`} type="number" min="0" max="15" value={course.points ?? ""} placeholder="–" onChange={(event) => setCoursePoints(`${course.subjectId}-${course.semester}`, event.target.value === "" ? null : Math.max(0, Math.min(15, Number(event.target.value))))} /></td><td><label className="checkbox-label"><input type="checkbox" checked={!course.excluded} onChange={(event) => setCourseIncluded(`${course.subjectId}-${course.semester}`, event.target.checked)} /> Einbringen</label></td></tr>)}</tbody></table></div><div className="model-caption"><Calculator size={13} /> Keine automatische Pflichtkursprüfung – konkrete Einbringung ist mit der Schule abzugleichen.</div></article><article className="panel calculator-panel"><div className="panel-heading"><div><h2>Block II · Abiturprüfungen</h2><p>Fünf Prüfungsfächer, davon drei schriftlich; jedes Ergebnis zählt vierfach.</p></div></div><div className="table-scroll"><table className="grades-table calculator-table"><thead><tr><th>PRÜFUNGSFACH</th><th>PRÜFUNGSART</th><th>ERGEBNIS</th><th>GEWICHTUNG</th></tr></thead><tbody>{exams.map((exam, index) => <tr key={index}><td><select aria-label={`Prüfungsfach ${index + 1}`} value={data.subjects.some((item) => item.id === exam.subjectId) ? exam.subjectId : ""} onChange={(event) => setExamSubject(index, event.target.value)}><option value="">Fach auswählen</option>{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></td><td>{index < 3 ? "Schriftlich" : "Mündlich"}</td><td><input aria-label={`Prüfung ${index + 1} Punkte`} type="number" min="0" max="15" value={exam.points ?? ""} placeholder="offen" onChange={(event) => setExam(index, { points: event.target.value === "" ? null : Math.max(0, Math.min(15, Number(event.target.value))) })} /></td><td>4×</td></tr>)}</tbody></table></div></article><section className="panel requirements-panel"><div className="panel-heading"><div><h2>Voraussetzungen & offene Angaben</h2><p>Ein fehlender Pflicht-/Laufbahnnachweis verhindert ein offizielles Ergebnis.</p></div><span className="course-tag">{result.missing.length} offen</span></div><label className="eligibility-confirm"><input type="checkbox" checked={confirmedEligible} onChange={(event) => setConfirmedEligible(event.target.checked)} /> Meine Schule hat die Zulassung bestätigt.</label><ul className="requirement-list">{result.missing.map((item) => <li key={item}><CircleHelp size={14} />{item}</li>)}</ul><p className="manual-warning">Die erforderliche Pflichtbelegung und Prüfungsfachkombination werden hier nicht vollständig validiert. Eine Checkbox ersetzt keine Bestätigung der Schule.</p></section><section className="panel official-result-panel"><div><span className="eyebrow small-eyebrow">{mode === "estimate" ? "PERSÖNLICHE PROGNOSE" : "OFFIZIELLE BERECHNUNG"}</span><h2>{result.status === "passed" ? `${mode === "estimate" ? "Szenario · " : "Abiturschnitt "}${result.grade}` : result.status === "failed" ? "Bestehensgrenzen nicht erfüllt" : "Keine belastbare Abiturnote"}</h2><p>{result.total === null ? "Die Punkte werden erst bei vollständigen Kurs- und Prüfungseingaben berechnet." : `Block I ${result.blockI?.toFixed(1).replace(".", ",")} + Block II ${result.blockII} = ${result.total} Gesamtpunkte.`}</p></div><span className={`result-status ${result.status}`}>{result.status === "passed" ? "Rechenwerte erfüllt" : result.status === "failed" ? "Grenzen unterschritten" : "Angaben fehlen"}</span></section><section className="panel rules-note"><h2>Regelstand & Prüfungsordnung</h2><p>Abiturjahrgang 2028 · AGVO, ergänzt durch den KM-Leitfaden gymnasiale Oberstufe (Stand 16.12.2025). <button className="text-button" onClick={() => window.dispatchEvent(new CustomEvent("open-rules"))}>Quellen im Regelwerk ansehen.</button></p></section></>;
}


function _DashboardOld({ subjects, performances, average, performanceCount, onAddGrade, onOpenSubjects, onShowCalculation }: { subjects: SchoolSubject[]; performances: Performance[]; average: number; performanceCount: number; onAddGrade: () => void; onOpenSubjects: () => void; onShowCalculation: () => void }) {
  const termResults = SEMESTERS.map((semester) => ({ semester, ...calculateSemester({ version: 1, subjects, performances }, semester) }));
  const latest = [...termResults].reverse().find((item) => item.average !== null);
  const rank = (latest?.results ?? []).slice().sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  const current = termResults.filter((item) => item.average !== null).at(-1);
  return <><section className="page-heading"><div><div className="eyebrow"><span className="status-dot" /> DEIN SCHULJAHR · KURSSTUFE</div><h1>Dein Abi. <span>Im Überblick.</span></h1><p>Deine Leistungen, klar und auf einen Blick.</p></div><button className="button button-primary" onClick={onAddGrade}><Plus size={16} /> Leistung eintragen</button></section><div className="model-notice"><Calculator size={14} /><span><strong>Persönliche Modellrechnung</strong> · unverbindlich; keine offizielle schulische Bewertung.</span></div><section className="metric-grid grade-metrics"><article className="metric-card main-metric"><div className="metric-top"><span>Gesamtdurchschnitt</span><TrendingUp size={16} /></div><div className="metric-value">{average ? average.toFixed(2).replace(".", ",") : "–"}<span> Punkte</span></div><div className="metric-foot">Über alle belegten Fächer und Halbjahre gewichtet</div></article><article className="metric-card"><div className="metric-top"><span>Eingetragene Leistungen</span><BookOpen size={16} /></div><div className="metric-value">{performanceCount}<span> Noten</span></div><div className="metric-foot">Einzelnoten in allen Halbjahren</div></article><article className="metric-card"><div className="metric-top"><span>Bestes Fach · {latest ? semesterLabel(latest.semester) : "–"}</span><ArrowUpRight size={16} /></div><div className="metric-value small-metric-value">{rank[0]?.subject.name ?? "Noch offen"}</div><div className="metric-foot">{rank[0]?.average === null || !rank[0] ? "Kein Schnitt vorhanden" : `${rank[0].average.toFixed(2).replace(".", ",")} Punkte`}</div></article><article className="metric-card"><div className="metric-top"><span>Niedrigster Schnitt · {latest ? semesterLabel(latest.semester) : "–"}</span><ArrowDownRight size={16} /></div><div className="metric-value small-metric-value">{rank.at(-1)?.subject.name ?? "Noch offen"}</div><div className="metric-foot">{rank.at(-1)?.average === null || !rank.length ? "Kein Schnitt vorhanden" : `${rank.at(-1)?.average?.toFixed(2).replace(".", ",")} Punkte`}</div></article></section><section className="dashboard-columns grade-dashboard-columns"><article className="panel semester-overview"><div className="panel-heading"><div><h2>Durchschnitt je Halbjahr</h2><p>Erfasste Leistung nach Halbjahr.</p></div><button className="text-button" onClick={onShowCalculation}>Rechenweg</button></div><div className="semester-bars">{termResults.map(({ semester, average: value, subjectCount }) => <div className="semester-bar" key={semester}><div className="semester-bar-top"><span>{semesterLabel(semester)}</span><strong>{value === null ? "–" : value.toFixed(2).replace(".", ",")}</strong></div><div className="semester-track"><span style={{ width: `${value === null ? 0 : value / 15 * 100}%` }} /></div><small>{subjectCount} Fächer</small></div>)}</div></article><article className="panel development-panel"><div className="panel-heading"><div><h2>Leistungsentwicklung</h2><p>Halbjahresschnitt im Verlauf.</p></div></div><div className="development-list">{termResults.map(({ semester, average: value }, index) => { const previous = termResults[index - 1]?.average; const trend = value === null || previous === null || previous === undefined ? "–" : value > previous ? "↗" : value < previous ? "↘" : "→"; return <div className="development-row" key={semester}><span className="development-semester">{semesterLabel(semester)}</span><span className="development-track"><i style={{ width: `${value === null ? 0 : value / 15 * 100}%` }} /></span><strong>{value === null ? "–" : value.toFixed(2).replace(".", ",")}</strong><span className={trend === "↗" ? "trend positive" : trend === "↘" ? "trend negative" : "trend flat"}>{trend}</span></div>; })}</div></article></section><article className="panel dashboard-subject-panel"><div className="panel-heading"><div><h2>Fächerübersicht</h2><p>{current ? `Aktuelles Halbjahr · ${semesterLabel(current.semester)}` : "Fachschnitte über die Halbjahre"}</p></div><button className="text-button" onClick={onOpenSubjects}>Fächer verwalten <ArrowRight size={14} /></button></div><div className="table-scroll"><table className="grades-table"><thead><tr><th>FACH</th><th>KURSART</th><th>H1</th><th>H2</th><th>H3</th><th>H4</th><th>AKTUELL</th></tr></thead><tbody>{subjects.map((subject) => { const rows = SEMESTERS.map((semester) => calculateSubject(subject, performances, semester)); const latestResult = calculateSubject(subject, performances, latest?.semester ?? 1); return <tr key={subject.id}><td><span className={`subject-mark ${subject.color}`}>{subject.code}</span><span className="subject-name">{subject.name}</span></td><td>{subject.courseType}</td>{rows.map((row) => <td key={row.semester}><span className={row.average === null ? "history-empty" : "history-grade"}>{row.average === null ? "–" : row.average.toFixed(1).replace(".", ",")}</span></td>)}<td>{latestResult.average === null ? "–" : <ScorePill value={Math.round(latestResult.average)} compact />}</td></tr>; })}</tbody></table></div><div className="model-caption"><Calculator size={13} /> Individuelle Gewichtungen; keine offizielle Zeugnisnote.</div></article></>;
}

function _DuplicateSubjectsPage({ subjects, gradebook, semester, onSemester, onAdd, onEdit, onDelete, onGrade, onWeights, onMode, onPerformanceEdit, onPerformanceDelete }: { subjects: SchoolSubject[]; gradebook: GradebookData; semester: Semester; onSemester: (semester: Semester) => void; onAdd: () => void; onEdit: (subject: SchoolSubject) => void; onDelete: (subject: SchoolSubject) => void; onGrade: (subject: SchoolSubject, manual?: boolean) => void; onWeights: (subjectId: string, semester: Semester, written: number, oral: number) => void; onMode: (subjectId: string, semester: Semester, mode: "individual" | "manual") => void; onPerformanceEdit: (performance: Performance) => void; onPerformanceDelete: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const filtered = subjects.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(query.toLowerCase()));
  const term = calculateSemester(gradebook, semester);
  return <><section className="page-heading"><div><div className="eyebrow"><span className="status-dot" /> NOTENVERWALTUNG · BADEN-WÜRTTEMBERG</div><h1>Deine <span>Fächer.</span></h1><p>Kurse, Gewichtungen und alle Leistungen an einem Ort.</p></div><button className="button button-primary" onClick={onAdd}><Plus size={16} /> Fach hinzufügen</button></section><div className="model-notice"><Calculator size={14} /><span><strong>Persönliche Modellrechnung</strong> · ersetzt nicht die offizielle schulische Bewertung.</span></div><section className="subject-summary"><div><span>Fächer</span><strong>{subjects.length}</strong></div><div><span>Leistungen · {semesterLabel(semester)}</span><strong>{gradebook.performances.filter((item) => item.semester === semester).length}</strong></div><div><span>Halbjahresschnitt · {semesterLabel(semester)}</span><strong>{formatPoints(term.average, 2)}<small> Punkte</small></strong></div></section><article className="panel full-subjects subject-manager"><div className="panel-heading manager-heading"><div><h2>Kursübersicht</h2><p>Fach anklicken, um Noten, Gewichtung und Rechenweg zu verwalten.</p></div><label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fach suchen" /></label></div><div className="semester-selector">{SEMESTERS.map((value) => <button key={value} className={semester === value ? "selected" : ""} onClick={() => onSemester(value)}>{semesterLabel(value)}</button>)}</div><div className="subject-list">{filtered.map((subject) => { const result = calculateSubject(subject, gradebook.performances, semester); const active = expanded === subject.id; const setting = subject.settings[semester]; return <section className={`managed-subject ${active ? "expanded" : ""}`} key={subject.id}><div className="managed-subject-main"><button className="subject-expand" onClick={() => setExpanded(active ? null : subject.id)} aria-expanded={active}><ChevronRight size={15} className="expand-chevron" /><span className={`subject-mark ${subject.color}`}>{subject.code}</span><span className="managed-subject-name"><strong>{subject.name}</strong><small>{subject.courseType} · Fachgewicht {subject.weight}× · {subject.state}</small></span></button><span className={`mode-badge ${setting.mode}`}>{setting.mode === "manual" ? "Manueller Schnitt" : "Einzelnoten"}</span><span className="managed-average">{formatPoints(result.average, 2)}<small> P</small></span><div className="managed-actions"><button className="icon-button" aria-label={`${subject.name} bearbeiten`} onClick={() => onEdit(subject)}><Pencil size={14} /></button><button className="icon-button danger-hover" aria-label={`${subject.name} löschen`} onClick={() => onDelete(subject)}><Trash2 size={14} /></button></div></div>{active && <div className="subject-details"><div className="entry-mode-row"><span>Eingabemodus · {semesterLabel(semester)}</span><button className={`mode-switch ${setting.mode === "individual" ? "active" : ""}`} onClick={() => setting.mode !== "individual" && onMode(subject.id, semester, "individual")}>Einzelleistungen</button><button className={`mode-switch ${setting.mode === "manual" ? "active" : ""}`} onClick={() => setting.mode !== "manual" && onGrade(subject, true)}>Manueller Schnitt</button></div>{setting.mode === "manual" ? <div className="manual-average-panel"><div><span>Manuell eingetragener Schnitt</span><strong>{setting.manualAverage === null ? "Noch nicht gesetzt" : `${formatPoints(setting.manualAverage, 2)} Punkte`}</strong><small>Einzelnoten werden in diesem Modus nicht angerechnet.</small></div><button className="button button-quiet small-button" onClick={() => onGrade(subject, true)}><Pencil size={13} /> Bearbeiten</button></div> : <><div className="area-weight-grid"><AreaSummary title="Schriftlich" result={result.written} weight={setting.writtenWeight} onWeight={(value) => onWeights(subject.id, semester, value, setting.oralWeight)} /><AreaSummary title="Mündlich" result={result.oral} weight={setting.oralWeight} onWeight={(value) => onWeights(subject.id, semester, setting.writtenWeight, value)} /></div><div className="detail-actions"><button className="button button-primary small-button" onClick={() => onGrade(subject)}><Plus size={14} /> Leistung eintragen</button><button className="button button-quiet small-button" onClick={() => onGrade(subject, true)}>Bekannten Schnitt eintragen</button><span>Faktor 0 schließt die Note aus.</span></div>{result.performances.length ? <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>LEISTUNG</th><th>BEREICH</th><th>DATUM</th><th>PUNKTE</th><th>FAKTOR</th><th></th></tr></thead><tbody>{result.performances.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.kind}</small></td><td>{item.area === "written" ? "Schriftlich" : "Mündlich"}</td><td>{item.date ? new Date(`${item.date}T12:00:00`).toLocaleDateString("de-DE") : "–"}</td><td><ScorePill value={item.points} compact /></td><td>{item.weight}×</td><td><button className="text-button" onClick={() => onPerformanceEdit(item)}>Bearbeiten</button><button className="text-button remove-performance" aria-label={`${item.title} löschen`} onClick={() => onPerformanceDelete(item.id)}><Trash2 size={13} /></button></td></tr>)}</tbody></table></div> : <p className="empty-performances">Noch keine Einzelleistungen in {semesterLabel(semester)}.</p>}</>}<details className="calculation-details"><summary>Rechenweg ansehen</summary><div className="calculation-copy">{setting.mode === "manual" ? <p>Manueller Durchschnitt: <strong>{formatPoints(setting.manualAverage, 2)} P</strong>; Einzelnoten ausgeschlossen.</p> : <><p>Schriftlich: {result.written.count ? `(${result.performances.filter((item) => item.area === "written").map((item) => `${item.points} × ${item.weight}`).join(" + ")}) ÷ ${formatPoints(result.written.denominator, 2)} = ${formatPoints(result.written.average, 2)}` : "keine gewichteten Leistungen"}.</p><p>Mündlich: {result.oral.count ? `(${result.performances.filter((item) => item.area === "oral").map((item) => `${item.points} × ${item.weight}`).join(" + ")}) ÷ ${formatPoints(result.oral.denominator, 2)} = ${formatPoints(result.oral.average, 2)}` : "keine gewichteten Leistungen"}.</p><p>Bereichsgewicht Schriftlich {setting.writtenWeight}× · Mündlich {setting.oralWeight}×. Fachgewicht {subject.weight}× zählt im Gesamtschnitt.</p></>}<p>Persönliche Modellrechnung, keine offizielle schulische Bewertung.</p></div></details></div>}</section>; })}{filtered.length === 0 && <p className="empty-search">Keine Fächer gefunden.</p>}</div></article></>;
}

function _DuplicateAreaSummary({ title, result, weight, onWeight }: { title: string; result: { average: number | null; count: number; denominator: number }; weight: number; onWeight: (value: number) => void }) {
  return <div className="area-summary"><div className="area-summary-heading"><div><span>{title}</span><strong>{formatPoints(result.average, 2)}<small> P</small></strong></div><span className="course-tag">{result.count} Leistungen</span></div><label>Bereichsgewicht <input type="number" min="0" max="20" step="0.25" value={weight} onChange={(event) => onWeight(Math.max(0, Number(event.target.value)))} />×</label><small>Rechenfaktor {result.denominator.toFixed(2).replace(".", ",")}</small></div>;
}

function _DuplicateSubjectModal({ subject, onClose, onSave }: { subject?: SchoolSubject; onClose: () => void; onSave: (subject: SchoolSubject) => void }) {
  const [name, setName] = useState(subject?.name ?? "");
  const [code, setCode] = useState(subject?.code ?? "");
  const [state, setState] = useState(subject?.state ?? "Baden-Württemberg");
  const [courseType, setCourseType] = useState<SchoolSubject["courseType"]>(subject?.courseType ?? "Basisfach");
  const [weight, setWeight] = useState(subject?.weight ?? 1);
  const [written, setWritten] = useState(subject?.settings[1].writtenWeight ?? 1);
  const [oral, setOral] = useState(subject?.settings[1].oralWeight ?? 1);
  return <ModalFrame onClose={onClose} labelledBy="subject-modal-title"><form className="add-modal extended-modal" onSubmit={(event) => { event.preventDefault(); if (!name.trim() || !code.trim()) return; const settings = subject ? { ...subject.settings } : EMPTY_SEMESTER_SETTINGS(); SEMESTERS.forEach((semester) => { settings[semester] = { ...settings[semester], writtenWeight: written, oralWeight: oral }; }); onSave({ id: subject?.id ?? newId(), name: name.trim(), code: code.trim().toUpperCase(), state, courseType, weight: Math.max(0.1, weight), settings, color: subject?.color ?? COLORS[0] }); }}><div className="modal-heading"><div><span className="eyebrow small-eyebrow">FÄCHERVERWALTUNG</span><h2 id="subject-modal-title">{subject ? "Fach bearbeiten" : "Fach hinzufügen"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Schließen"><X size={17} /></button></div><div className="form-grid"><label className="form-label">Fachname<input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required /></label><label className="form-label">Kürzel<input value={code} onChange={(event) => setCode(event.target.value)} maxLength={5} required /></label><label className="form-label">Bundesland<select value={state} onChange={(event) => setState(event.target.value)}><option>Baden-Württemberg</option></select></label><label className="form-label">Kursart<select value={courseType} onChange={(event) => setCourseType(event.target.value as SchoolSubject["courseType"])}><option>Basisfach</option><option>Leistungsfach</option></select></label><label className="form-label">Fachgewicht<input type="number" min="0.1" max="10" step="0.1" value={weight} onChange={(event) => setWeight(Number(event.target.value))} required /></label><label className="form-label">Schriftliches Gewicht<input type="number" min="0" max="20" step="0.25" value={written} onChange={(event) => setWritten(Number(event.target.value))} required /></label><label className="form-label">Mündliches Gewicht<input type="number" min="0" max="20" step="0.25" value={oral} onChange={(event) => setOral(Number(event.target.value))} required /></label></div><p className="grade-scale">Gewichtungsverhältnis schriftlich : mündlich = {written} : {oral}; pro Halbjahr anpassbar.</p><div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Abbrechen</button><button className="button button-primary" disabled={!name.trim() || !code.trim()}><Check size={15} /> Speichern</button></div></form></ModalFrame>;
}

function _DuplicatePerformanceModal({ subjects, initial, initialSubjectId, initialSemester, manual, onClose, onSave, onSaveManual, onDelete }: { subjects: SchoolSubject[]; initial?: Performance; initialSubjectId?: string; initialSemester?: Semester; manual?: boolean; onClose: () => void; onSave: (performance: Performance) => void; onSaveManual: (subjectId: string, semester: Semester, points: number) => void; onDelete: (id: string) => void }) {
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? initialSubjectId ?? subjects[0]?.id ?? "");
  const [semester, setSemester] = useState<Semester>(initial?.semester ?? initialSemester ?? 1);
  const [points, setPoints] = useState(String(initial?.points ?? ""));
  const [kind, setKind] = useState<GradeKind>(initial?.kind ?? "Klausur");
  const [area, setArea] = useState<GradeArea>(initial?.area ?? "written");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [weight, setWeight] = useState(initial?.weight ?? 1);
  const [mode, setMode] = useState<"individual" | "manual">(manual ? "manual" : "individual");
  const selected = subjects.find((item) => item.id === subjectId);
  return <ModalFrame onClose={onClose} labelledBy="performance-modal-title"><form className="add-modal extended-modal" onSubmit={(event) => { event.preventDefault(); if (!selected || points === "") return; const value = Math.max(0, Math.min(15, Number(points))); if (mode === "manual") { onSaveManual(subjectId, semester, value); return; } onSave({ id: initial?.id ?? newId(), subjectId, semester, points: value, kind, area: kind === "GFS" ? area : kind === "Klausur" || kind === "Test / Klassenarbeit" ? "written" : "oral", date, title: title.trim() || kind, weight: Math.max(0, weight) }); }}><div className="modal-heading"><div><span className="eyebrow small-eyebrow">{mode === "manual" ? "MANUELLER MODUS · EINZELNOTEN AUS" : "LEISTUNG · INDIVIDUELL GEWICHTET"}</span><h2 id="performance-modal-title">{mode === "manual" ? "Fachschnitt eintragen" : initial ? "Leistung bearbeiten" : "Neue Leistung"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Schließen"><X size={17} /></button></div><div className="form-grid"><label className="form-label">Fach<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label className="form-label">Halbjahr<select value={semester} onChange={(event) => setSemester(Number(event.target.value) as Semester)}>{SEMESTERS.map((item) => <option key={item} value={item}>{semesterLabel(item)}</option>)}</select></label><label className="form-label full-field">Eingabemodus<select value={mode} onChange={(event) => setMode(event.target.value as "individual" | "manual")}><option value="individual">Einzelleistungen</option><option value="manual">Bekannten Fachschnitt eintragen (ersetzt Einzelnoten)</option></select></label>{mode === "manual" ? <><label className="form-label full-field">Durchschnitt · 0–15 Punkte<input type="number" min="0" max="15" step="0.01" value={points} onChange={(event) => setPoints(event.target.value)} required /></label><p className="manual-warning full-field">Der bekannte Durchschnitt ersetzt alle Einzelnoten für dieses Fach/Halbjahr.</p></> : <><label className="form-label">Punkte · 0 bis 15<input type="number" min="0" max="15" step="1" value={points} onChange={(event) => setPoints(event.target.value)} required /></label><label className="form-label">Leistungsart<select value={kind} onChange={(event) => setKind(event.target.value as GradeKind)}>{GRADE_KINDS.map((item) => <option key={item}>{item}</option>)}</select></label>{kind === "GFS" && <label className="form-label full-field">GFS-Leistungsbereich<select value={area} onChange={(event) => setArea(event.target.value as GradeArea)}><option value="written">Schriftlicher Bereich</option><option value="oral">Mündlicher Bereich</option></select></label>}<label className="form-label">Datum<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="form-label">Gewichtungsfaktor<input type="number" min="0" max="20" step="0.25" value={weight} onChange={(event) => setWeight(Number(event.target.value))} /></label><label className="form-label full-field">Bezeichnung oder Thema<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="z. B. Analysis · Integralrechnung" /></label></>}</div><div className="modal-actions">{initial && <button type="button" className="button delete-button" onClick={() => onDelete(initial.id)}><Trash2 size={14} /> Löschen</button>}<button type="button" className="button button-quiet" onClick={onClose}>Abbrechen</button><button className="button button-primary" disabled={!selected || points === ""}><Check size={15} /> Speichern</button></div></form></ModalFrame>;
}

function _DuplicateModalFrame({ children, onClose, labelledBy }: { children: React.ReactNode; onClose: () => void; labelledBy: string }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-labelledby={labelledBy}>{children}</div></div>;
}
function _DuplicateConfirmDelete({ subject, onCancel, onConfirm }: { subject: SchoolSubject; onCancel: () => void; onConfirm: () => void }) {
  return <ModalFrame onClose={onCancel} labelledBy="delete-subject-title"><div className="add-modal confirm-modal"><span className="eyebrow small-eyebrow">FACH UND LEISTUNGEN ENTFERNEN</span><h2 id="delete-subject-title">{subject.name} löschen?</h2><p>Das Fach und sämtliche zugehörigen Einzelnoten werden aus deinem Notenbuch gelöscht.</p><div className="modal-actions"><button className="button button-quiet" onClick={onCancel}>Abbrechen</button><button className="button delete-button" onClick={onConfirm}><Trash2 size={14} /> Fach und Noten löschen</button></div></div></ModalFrame>;
}
function _DuplicateCalculationModal({ result, semester, onClose }: { result: ReturnType<typeof calculateSemester>; semester: Semester; onClose: () => void }) {
  return <ModalFrame onClose={onClose} labelledBy="calculation-title"><div className="add-modal calculation-modal"><div className="modal-heading"><div><span className="eyebrow small-eyebrow">PERSÖNLICHE MODELLRECHNUNG</span><h2 id="calculation-title">Rechenweg · {semesterLabel(semester)}</h2></div><button className="icon-button" onClick={onClose} aria-label="Schließen"><X size={17} /></button></div><p className="calculation-lead">Halbjahresschnitt: <strong>{formatPoints(result.average, 2)} Punkte</strong></p><div className="calc-steps">{result.results.map((item) => <div className="calc-step" key={item.subject.id}><strong>{item.subject.name}</strong><span>{item.mode === "manual" ? `Manueller Fachschnitt ${formatPoints(item.average, 2)} P; Einzelnoten ausgeschlossen.` : `Schriftlich ${formatPoints(item.written.average, 2)} P × ${item.subject.settings[semester].writtenWeight}; mündlich ${formatPoints(item.oral.average, 2)} P × ${item.subject.settings[semester].oralWeight}; Fachgewicht ${item.subject.weight}×.`}</span></div>)}</div><p className="manual-warning">Unverbindlich; die offizielle schulische Bewertung kann abweichen.</p><div className="modal-actions"><button className="button button-primary" onClick={onClose}>Schließen</button></div></div></ModalFrame>;
}


function SettingsPage({
  theme,
  onTheme,
  preferences,
  onPreferences,
  onExport,
  onImport,
  onReset,
  saveWarning,
  accountProps,
}: {
  theme: Theme;
  onTheme: (theme: Theme) => void;
  preferences: AppPreferences;
  onPreferences: (preferences: AppPreferences) => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  saveWarning: boolean;
  accountProps: Parameters<typeof FirebaseAccountPanel>[0];
}) {
  const update = (patch: Partial<AppPreferences>) =>
    onPreferences({ ...preferences, ...patch });
  const themes: {
    id: Theme;
    label: string;
    description: string;
    icon: typeof Sun;
  }[] = [
    { id: "light", label: "Hell", description: "Klar und konzentriert", icon: Sun },
    { id: "dark", label: "Dunkel", description: "Angenehm bei wenig Licht", icon: Moon },
    { id: "sepia", label: "Sepia", description: "Warm und augenschonend", icon: Coffee },
  ];

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span className="status-dot" /> DEIN BEREICH</div>
          <h1>Deine <span>Einstellungen.</span></h1>
          <p>Schuljahr, Theme, Konto und Datensicherung.</p>
        </div>
      </section>
      <section className="settings-layout">
        <article className="panel settings-panel">
          <div className="settings-section-title">
            <div><h2>Darstellung</h2><p>Wähle dein Erscheinungsbild.</p></div>
          </div>
          <div className="theme-options">
            {themes.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                className={`theme-option ${theme === id ? "selected" : ""}`}
                onClick={() => onTheme(id)}
              >
                <span className={`theme-preview preview-${id}`}><Icon size={17} /></span>
                <span className="theme-label"><strong>{label}</strong><small>{description}</small></span>
                {theme === id && <span className="theme-check"><Check size={13} /></span>}
              </button>
            ))}
          </div>
          <div className="settings-divider" />
          <div className="settings-section-title">
            <div><h2>Schulprofil</h2><p>Diese Einstellungen steuern die Halbjahresübersicht.</p></div>
          </div>
          <label className="setting-control">
            Bundesland
            <select value={preferences.state} onChange={(event) => update({ state: event.target.value })}>
              <option>Baden-Württemberg</option>
            </select>
            <small>Weitere Bundesländer werden hinzugefügt, sobald ihre Regeln geprüft sind.</small>
          </label>
          <label className="setting-control">
            Schulart
            <select value={preferences.schoolType} onChange={(event) => update({ schoolType: event.target.value })}>
              <option>Allgemeinbildendes Gymnasium</option>
            </select>
          </label>
          <div className="form-grid settings-prefs-grid">
            <label className="setting-control">
              Schuljahr
              <input value={preferences.schoolYear} onChange={(event) => update({ schoolYear: event.target.value })} placeholder="2025/26" />
            </label>
            <label className="setting-control">
              Aktuelles Halbjahr
              <select value={preferences.currentSemester} onChange={(event) => update({ currentSemester: Number(event.target.value) as Semester })}>
                {SEMESTERS.map((item) => <option key={item} value={item}>{semesterLabel(item)}</option>)}
              </select>
            </label>
          </div>
        </article>
        <div className="settings-cloud-column">
          <FirebaseAccountPanel {...accountProps} />
          <aside className="panel data-panel">
            <div className="data-icon">{saveWarning ? <CircleHelp size={17} /> : <Check size={17} />}</div>
            <h2>Datensicherung</h2>
            <p>
              Im Gastmodus bleiben Daten auf diesem Gerät. Bei Anmeldung
              synchronisiert 15Punkte über Firebase; deine Noten sind nur mit
              deinem Konto abrufbar. Exportiere regelmäßig eine JSON-Sicherung.
            </p>
            <div className="storage-status">
              <span className={`status-dot ${saveWarning ? "warning-dot" : ""}`} />
              {saveWarning ? "Lokale Speicherung prüfen" : "JSON-Export und -Import verfügbar"}
            </div>
            <div className="backup-actions">
              <button className="button button-primary" onClick={onExport}>
                <ArrowDownRight size={14} /> JSON exportieren
              </button>
              <button className="button button-quiet" onClick={onImport}>JSON importieren</button>
            </div>
            <button className="reset-button destructive-reset" onClick={onReset}>
              Alle Daten zurücksetzen …
            </button>
          </aside>
        </div>
      </section>
      <div className="settings-footnote">
        <Command size={14} /> JSON-Dateien werden vor dem Import vollständig
        validiert. Ein vorhandener Datenstand wird erst nach deiner Bestätigung ersetzt.
      </div>
    </>
  );
}

function ConfirmAction({ title, message, confirmLabel, onCancel, onConfirm }: { title: string; message: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
 return <ModalFrame onClose={onCancel} labelledBy="confirm-action-title"><div className="add-modal confirm-modal"><span className="eyebrow small-eyebrow">DATENVERWALTUNG · BESTÄTIGUNG</span><h2 id="confirm-action-title">{title}</h2><p>{message}</p><div className="modal-actions"><button className="button button-quiet" onClick={onCancel}>Abbrechen</button><button className="button delete-button" onClick={onConfirm}>{confirmLabel}</button></div></div></ModalFrame>;
}


function StatisticsPage({ data, goals, onGoals }: { data: GradebookData; goals: UserGoal[]; onGoals: (goals: UserGoal[]) => void }) {
 const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? "");
 const [semester, setSemester] = useState<Semester>(1);
 const [area, setArea] = useState<GradeArea>("written");
 const [simPoints, setSimPoints] = useState("13");
 const [simWeight, setSimWeight] = useState("1");
 const [target, setTarget] = useState("12");
 const subject = data.subjects.find((item) => item.id === subjectId);
 const subjectRows = data.subjects.map((item) => ({ subject: item, results: SEMESTERS.map((term) => calculateSubject(item, data.performances, term)) }));
 const terms = SEMESTERS.map((term) => ({ semester: term, ...calculateSemester(data, term) }));
 const writtenTotals = SEMESTERS.map((term) => { const rows = data.subjects.map((item) => calculateSubject(item, data.performances, term).written).filter((item) => item.average !== null); const count = rows.reduce((sum, item) => sum + item.count, 0); const denom = rows.reduce((sum, item) => sum + item.denominator, 0); return { semester: term, average: denom ? rows.reduce((sum, item) => sum + item.numerator, 0) / denom : null, count }; });
 const oralTotals = SEMESTERS.map((term) => { const rows = data.subjects.map((item) => calculateSubject(item, data.performances, term).oral).filter((item) => item.average !== null); const count = rows.reduce((sum, item) => sum + item.count, 0); const denom = rows.reduce((sum, item) => sum + item.denominator, 0); return { semester: term, average: denom ? rows.reduce((sum, item) => sum + item.numerator, 0) / denom : null, count }; });
 const prediction = subject ? simulatePerformance(subject, data.performances, semester, area, Number(simPoints), Number(simWeight)) : null;
 const required = subject ? requiredPointsForAverage(subject, data.performances, semester, area, Number(target), Number(simWeight)) : null;
 const addGoal = (kind: UserGoal["kind"], id?: string) => { const title = kind === "subject" ? `${data.subjects.find((item) => item.id === id)?.name ?? "Fach"}-Ziel` : kind === "overall" ? "Gesamtdurchschnitt" : "Abiturnote"; const value = Number(window.prompt(kind === "abi" ? "Gewünschte Abiturnote als Punktewert (z. B. 12 für 1,8)" : "Zielwert in Punkten (0–15)", "12")); if (!Number.isFinite(value) || value < 0 || value > 15) return; onGoals([...goals.filter((goal) => !(goal.kind === kind && goal.subjectId === id)), { id: newId(), kind, subjectId: id, title, target: value, createdAt: new Date().toISOString() }]); };
 const goalReached = (goal: UserGoal) => { if (goal.kind === "subject") { const row = subjectRows.find((item) => item.subject.id === goal.subjectId); return row?.results.some((result) => result.average !== null && result.average >= goal.target) ?? false; } if (goal.kind === "overall") return (calculateOverall(data).average ?? -1) >= goal.target; return false; };
 return <><section className="page-heading"><div><div className="eyebrow"><span className="status-dot"/> ANALYSE · PERSÖNLICHE MODELLRECHNUNG</div><h1>Deine <span>Statistiken.</span></h1><p>Entwicklungen, Zielwerte und Was-wäre-wenn-Prognosen auf Basis deiner Gewichtungen.</p></div></section><div className="model-notice"><Calculator size={14}/><span><strong>Nur persönliche Analyse.</strong> Die folgenden Schnitte und Simulationen sind keine offizielle schulische Bewertung.</span></div><article className="panel statistics-panel"><div className="panel-heading"><div><h2>Fachschnitte im Halbjahresvergleich</h2><p>Jede Linie zeigt den modellierten Schnitt eines Fachs.</p></div></div><div className="chart-scroll"><div className="chart-grid"><div className="chart-axis">15<br/>10<br/>5<br/>0</div><div className="chart-plot"><div className="chart-lines">{subjectRows.slice(0,8).map(({subject,results})=><div className={`chart-subject-line line-${subject.color}`} key={subject.id} aria-label={subject.name}>{results.map((result,index)=><i key={index} style={{left:`${index*33.333}%`,bottom:`${((result.average ?? 0)/15)*100}%`}} title={`${subject.name} H${result.semester}: ${formatPoints(result.average,2)} Punkte`}/>)}</div>)}</div><div className="chart-xlabels">{SEMESTERS.map((item)=><span key={item}>{semesterLabel(item)}</span>)}</div></div></div></div><div className="chart-legend">{subjectRows.slice(0,8).map(({subject})=><span key={subject.id}><i className={`legend-dot dot-${subject.color}`}/>{subject.name}</span>)}</div></article><section className="stats-duo"><article className="panel statistics-panel"><div className="panel-heading"><div><h2>Schriftlich & mündlich</h2><p>Gewichtete Bereichsschnitte je Halbjahr.</p></div></div><div className="comparison-list">{SEMESTERS.map((item,index)=><div className="comparison-row" key={item}><span>H{item}</span><div><small>Schriftlich</small><div className="comparison-track"><i className="written-fill" style={{width:`${(writtenTotals[index].average ?? 0)/15*100}%`}}/></div><strong>{formatPoints(writtenTotals[index].average,2)}</strong></div><div><small>Mündlich</small><div className="comparison-track"><i className="oral-fill" style={{width:`${(oralTotals[index].average ?? 0)/15*100}%`}}/></div><strong>{formatPoints(oralTotals[index].average,2)}</strong></div></div>)}</div></article><article className="panel statistics-panel"><div className="panel-heading"><div><h2>Übersicht der Leistungspunkte</h2><p>Erfasste Einzelnoten nach Punktegruppe.</p></div></div><div className="points-distribution">{Array.from({length:16},(_,index)=>15-index).map((points)=>{const count=data.performances.filter((item)=>item.points===points).length;const max=Math.max(1,...Array.from({length:16},(_,i)=>data.performances.filter((item)=>item.points===i).length));return <div key={points} title={`${points} Punkte: ${count} Leistungen`}><span>{count || 0}</span><i style={{height:`${Math.max(3,count/max*52)}px`}}/><small>{points}</small></div>;})}</div><p className="chart-caption">{data.performances.length} Leistungen · 0 bis 15 Punkte</p></article></section><article className="panel full-subjects statistics-table"><div className="panel-heading"><div><h2>Alle Fächer</h2><p>Vergleich der gewichteten Halbjahresschnitte.</p></div></div><div className="table-scroll"><table className="grades-table"><thead><tr><th>FACH</th><th>H1</th><th>H2</th><th>H3</th><th>H4</th><th>ENTWICKLUNG</th></tr></thead><tbody>{subjectRows.map(({subject,results})=>{const values=results.map((item)=>item.average).filter((item):item is number=>item!==null);const delta=values.length>1?values.at(-1)!-values[0]!:null;return <tr key={subject.id}><td><span className={`subject-mark ${subject.color}`}>{subject.code}</span><span className="subject-name">{subject.name}</span></td>{results.map((item)=><td key={item.semester}>{formatPoints(item.average,2)}</td>)}<td className={delta===null?"":delta>=0?"positive-cell":"negative-cell"}>{delta===null?"–":`${delta>=0?"+":""}${formatPoints(delta,2)} P`}</td></tr>;})}</tbody></table></div></article><section className="stats-duo"><article className="panel goal-panel"><div className="panel-heading"><div><h2>Deine Zielnoten</h2><p>Persönliche Zielwerte – getrennt von Schulnoten.</p></div><button className="text-button" onClick={()=>addGoal("overall")}>+ Gesamtziel</button></div><div className="goal-actions"><select aria-label="Fach für Ziel auswählen" value={subjectId} onChange={(event)=>setSubjectId(event.target.value)}>{data.subjects.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="button button-quiet small-button" onClick={()=>subjectId&&addGoal("subject",subjectId)}>+ Fachziel</button><button className="button button-quiet small-button" onClick={()=>addGoal("abi")}>+ Abiturziel</button></div>{goals.length===0?<p className="empty-performances">Noch keine persönlichen Ziele gesetzt.</p>:goals.map((goal)=><div className="goal-row" key={goal.id}><span><strong>{goal.title}</strong><small>Ziel · {goal.target} Punkte{goal.kind==="abi"?" (Zielwert, keine Prognose)":""}</small></span><span className={`goal-state ${goalReached(goal)?"reached":"pending"}`}>{goal.kind==="abi"?"Prognose offen":goalReached(goal)?"Erreicht":"In Arbeit"}</span><button className="text-button remove-performance" aria-label={`${goal.title} entfernen`} onClick={()=>onGoals(goals.filter((item)=>item.id!==goal.id))}><Trash2 size={13}/></button></div>)}</article><article className="panel predictor-panel"><div className="panel-heading"><div><h2>Noten-Prognose</h2><p>Was passiert mit einer möglichen Leistung?</p></div></div><div className="predictor-fields"><label>Fach<select value={subjectId} onChange={(event)=>setSubjectId(event.target.value)}>{data.subjects.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Halbjahr<select value={semester} onChange={(event)=>setSemester(Number(event.target.value) as Semester)}>{SEMESTERS.map((item)=><option key={item} value={item}>{semesterLabel(item)}</option>)}</select></label><label>Leistungsbereich<select value={area} onChange={(event)=>setArea(event.target.value as GradeArea)}><option value="written">Schriftlich</option><option value="oral">Mündlich</option></select></label><label>Simulierte Punkte<input type="number" min="0" max="15" value={simPoints} onChange={(event)=>setSimPoints(event.target.value)}/></label><label>Gewichtungsfaktor<input type="number" min="0.01" step="0.25" value={simWeight} onChange={(event)=>setSimWeight(event.target.value)}/></label></div><div className="prediction-result"><span>Aktueller Fachschnitt<strong>{formatPoints(prediction?.currentAverage ?? null,2)}</strong></span><ArrowRight size={15}/><span>Nach Simulation<strong>{formatPoints(prediction?.projectedAverage ?? null,2)}</strong></span>{prediction?.delta!==null&&prediction?.delta!==undefined&&<small className={prediction.delta>=0?"positive-cell":"negative-cell"}>{prediction.delta>=0?"+":""}{formatPoints(prediction.delta,2)} P</small>}</div><div className="required-points"><label>Ziel-Fachschnitt<input type="number" min="0" max="15" step="0.1" value={target} onChange={(event)=>setTarget(event.target.value)}/></label><p>Benötigte Punkte für die nächste Einzelleistung: <strong>{required===null?"–":required>15?"> 15":required<0?"bereits erreicht":formatPoints(required,2)}</strong> (bei Gewicht {simWeight}×)</p></div></article></section></>;
}


function _OldOfficialCalculatorPage2c({ data, onAddCourse }: { data: GradebookData; onAddCourse: () => void }) {
 const [courses,setCourses]=useState<AbiturCourseGrade[]>(()=>data.subjects.flatMap((subject)=>SEMESTERS.map((semester)=>{const result=calculateSubject(subject,data.performances,semester);return{subjectId:subject.id,subjectName:subject.name,semester,points:result.average===null?null:Math.round(result.average),courseType:subject.courseType,compulsory:false,excluded:false};})));
 const [exams,setExams]=useState<ExamSubject[]>(()=>Array.from({length:5},(_,index)=>({subjectId:data.subjects[index]?.id??`exam-${index+1}`,subjectName:data.subjects[index]?.name??`Prüfungsfach ${index+1}`,points:null,written:index<3,oral:index>=3})));
 const [confirmedEligible,setConfirmedEligible]=useState(false);const [mode,setMode]=useState<"estimate"|"official">("official");const result=simulateAbitur({courses,exams,confirmedEligible});
 const changeCourse=(key:string,points:number|null)=>setCourses((current)=>current.map((item)=>`${item.subjectId}-${item.semester}`===key?{...item,points}:item));
 const changeExam=(index:number,patch:Partial<ExamSubject>)=>setExams((current)=>current.map((exam,i)=>i===index?{...exam,...patch}:exam));
 const passed=result.status==="passed";
 const eligible = passed && confirmedEligible && result.checks.courseCompleteness === "complete";
 const showGrade = mode === "estimate" ? passed : eligible;
 return <><section className="page-heading"><div><div className="eyebrow"><span className="status-dot"/> BADEN-WÜRTTEMBERG · ABITUR 2028</div><h1>Abitur-<span>rechner.</span></h1><p>Die offizielle Note bleibt verborgen, solange Pflichtlaufbahn und Zulassung nicht geprüft sind.</p></div></section><div className="model-notice"><Calculator size={14}/><span><strong>{result.status==="incomplete"?"Unvollständige Simulation":passed?"Punktgrenzen erfüllt":"Mindestens eine Grenze unterschritten"}</strong> · Pflichtfach-/Zulassungsprüfung durch deine Schule erforderlich.</span></div><div className="calculator-mode"><button className={mode==="estimate"?"selected":""} onClick={()=>setMode("estimate")}>Persönliche Prognose</button><button className={mode==="official"?"selected":""} onClick={()=>setMode("official")}>Offizielle Berechnung</button></div><section className="qualification-summary"><article className="panel qualification-block"><span className="eyebrow small-eyebrow">BLOCK I</span><strong>{result.blockI===null?"Noch offen":`${result.blockI.toFixed(1).replace(".",",")} / 600`}</strong><small>{result.counts.included}/40 Kurse · {result.counts.advanced}/12 LF</small></article><article className="panel qualification-block"><span className="eyebrow small-eyebrow">BLOCK II</span><strong>{result.blockII===null?"Noch offen":`${result.blockII}/300`}</strong><small>{exams.filter((exam)=>exam.points!==null).length}/5 Prüfungen bewertet</small></article><article className="panel qualification-total"><span className="eyebrow small-eyebrow">GESAMT</span><strong>{result.total===null?"–":`${result.total}/900`}</strong><small>{showGrade?`Notentabelle ${result.grade}`:"Keine belastbare Abiturnote"}</small></article></section><div className="panel scenario-card"><h2>{mode==="estimate"?"Persönliches Szenario":"Offizielle Berechnung"}</h2><p>{mode==="estimate"?"Änderungen sind persönliche Was-wäre-wenn-Annahmen und werden nicht als Ist-Leistungen in deinem Notenbuch gespeichert.":"Eine offizielle Ausweisung ist erst möglich, wenn zusätzlich die vollständige Kursbelegung und die schulische Zulassung bestätigt sind."}</p></div><article className="panel calculator-panel"><div className="panel-heading"><div><h2>Block I · Kursleistungen</h2><p>40 Kurse · 12 LF-Halbjahre doppelt und 28 weitere einfach (Faktor 40/48).</p></div><button className="text-button" onClick={onAddCourse}>Fach ergänzen <Plus size={14}/></button></div><div className="table-scroll"><table className="grades-table calculator-table"><thead><tr><th>FACH</th><th>HJ</th><th>ART</th><th>PUNKTE</th><th>EINBRINGEN</th></tr></thead><tbody>{courses.map((course)=><tr key={`${course.subjectId}-${course.semester}`}><td>{course.subjectName}</td><td>H{course.semester}</td><td>{course.courseType}</td><td><input aria-label={`${course.subjectName} H${course.semester} Punkte`} type="number" min="0" max="15" value={course.points ?? ""} onChange={(event)=>changeCourse(`${course.subjectId}-${course.semester}`,event.target.value===""?null:Number(event.target.value))}/></td><td><label className="checkbox-label"><input type="checkbox" checked={!course.excluded} onChange={(event)=>setCourses((items)=>items.map((item)=>`${item.subjectId}-${item.semester}`===`${course.subjectId}-${course.semester}`?{...item,excluded:!event.target.checked}:item))}/> Einbringen</label></td></tr>)}</tbody></table></div><div className="model-caption"><Calculator size={13}/> Kurs-Pflicht- und Aufgabenfeldregeln werden nicht automatisiert vollständig geprüft.</div></article><article className="panel calculator-panel"><div className="panel-heading"><div><h2>Block II · Prüfungen</h2><p>Fünf Fächer, drei schriftlich; Ergebnisse zählen vierfach.</p></div></div><div className="table-scroll"><table className="grades-table calculator-table"><thead><tr><th>PRÜFUNGSFACH</th><th>ART</th><th>PUNKTE</th><th>GEWICHT</th></tr></thead><tbody>{exams.map((exam,index)=><tr key={index}><td><select aria-label={`Prüfungsfach ${index+1}`} value={data.subjects.some((subject)=>subject.id===exam.subjectId)?exam.subjectId:""} onChange={(event)=>{const subject=data.subjects.find((item)=>item.id===event.target.value);if(subject)changeExam(index,{subjectId:subject.id,subjectName:subject.name});}}><option value="">Fach auswählen</option>{data.subjects.map((subject)=><option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></td><td>{index<3?"Schriftlich":"Mündlich"}</td><td><input aria-label={`Prüfung ${index+1} Punkte`} type="number" min="0" max="15" value={exam.points ?? ""} onChange={(event)=>changeExam(index,{points:event.target.value===""?null:Number(event.target.value)})}/></td><td>4×</td></tr>)}</tbody></table></div></article><section className="panel requirements-panel"><div className="panel-heading"><div><h2>Voraussetzungen & fehlende Angaben</h2><p>Unvollständige Pflichtkursprüfung blockiert jede offizielle Note.</p></div><span className="course-tag">{result.missing.length} offen</span></div><label className="eligibility-confirm"><input type="checkbox" checked={confirmedEligible} onChange={(event)=>setConfirmedEligible(event.target.checked)}/> Meine Schule hat die Zulassung bestätigt.</label><ul className="requirement-list">{result.missing.map((item)=><li key={item}><CircleHelp size={14}/>{item}</li>)}</ul><p className="manual-warning">Das Anklicken dieser Bestätigung ersetzt keine automatische Prüfung. Verbindlich ist ausschließlich die schulische Zulassungsentscheidung.</p></section><section className="panel official-result-panel"><div><span className="eyebrow small-eyebrow">{mode==="estimate"?"PERSÖNLICHE PROGNOSE":"OFFIZIELLE BERECHNUNG"}</span><h2>{result.status==="incomplete" || (mode === "official" && !eligible)?"Noch keine belastbare Abiturnote":passed?`${mode==="estimate"?"Szenario":"Abiturschnitt"} ${result.grade}`:"Bestehensgrenzen nicht erfüllt"}</h2><p>{result.total===null?"Gesamtpunkte erst nach vollständigen Kurs- und Prüfungsangaben.":`Block I ${result.blockI?.toFixed(1)} + Block II ${result.blockII} = ${result.total} Punkte.`}</p></div><span className={`result-status ${result.status}`}>{result.status==="incomplete" || (mode === "official" && !eligible)?"Angaben fehlen":passed?"Punktgrenzen erfüllt":"Grenzen unterschritten"}</span></section><div className="model-caption">Prüfungsordnung: Abitur 2028 · AGVO und KM-Leitfaden 16.12.2025. Alle Angaben bleiben lokal.</div></>;
}
