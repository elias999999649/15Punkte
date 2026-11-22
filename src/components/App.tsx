import { useEffect, useMemo, useRef, useState } from "react";
import type { Auth, User } from "firebase/auth";
import type { Firestore, Unsubscribe } from "firebase/firestore";
import {
  ArrowDownRight,
  ArrowRight,
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
  Sun,
  Moon,
  Coffee,
  X,
  Pencil,
} from "lucide-react";
import { Dashboard } from "./Dashboard";
import { GradeEntryModal } from "./GradeEntryModal";
import { CalculationDialog } from "./CalculationDialog";
import { FirebaseAccountPanel, type CloudStatus } from "./FirebaseAccountPanel";
import { WelcomeSignInModal } from "./WelcomeSignInModal";
import {
  calculateOverall,
  calculateSemester,
  calculateSubject,
  defaultPreferences,
  emptyGoals,
  createDocument,
  exportGradebook,
  validateGradebookDocument,
  type AppPreferences,
  type UserGoal,
  COLORS,
  emptyGradebook,
  EMPTY_SEMESTER_SETTINGS,
  formatPoints,
  loadGradebook,
  newId,
  SEMESTERS,
  semesterLabel,
  type GradebookData,
  type Performance,
  type SchoolSubject,
  type Semester,
  GRADE_KINDS,
} from "../lib/gradebook";
import {
  BW_ABITUR_2028_RULES,
  simulateAbitur,
  type AbiturCourseGrade,
  type ExamSubject,
} from "../lib/states/baden-wuerttemberg";

type Section = "Dashboard" | "Fächer" | "Rechner" | "Regeln" | "Einstellungen";
type Theme = "light" | "dark" | "sepia";
const navItems: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Fächer", icon: BookOpen },
  { label: "Rechner", icon: Calculator },
  { label: "Einstellungen", icon: Settings2 },
];

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
  if (code === "permission-denied" || code === "firestore/permission-denied") {
    return "Firebase Firestore hat den Zugriff verweigert. Veröffentliche die aktuellen Regeln aus firestore.rules im Projekt punkte-342dd (Firebase Console → Firestore Database → Regeln) und prüfe, ob du das richtige Firebase-Projekt verwendest.";
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
  const [showFirstSignInPrompt, setShowFirstSignInPrompt] = useState(false);
  useEffect(() => {
    const requestedSection = new URLSearchParams(window.location.search).get("bereich");
    const sectionFromUrl = requestedSection === "Regeln"
      ? "Regeln"
      : navItems.find(({ label }) => label === requestedSection)?.label;
    if (sectionFromUrl) setSection(sectionFromUrl);
    const openRules = () => setSection("Regeln");
    const openCalculator = () => setSection("Rechner");
    window.addEventListener("open-rules", openRules);
    window.addEventListener("open-calculator", openCalculator);
    return () => { window.removeEventListener("open-rules", openRules); window.removeEventListener("open-calculator", openCalculator); };
  }, []);
  const subjects = gradebook.subjects;

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
                setAccountError(`Cloud-Daten konnten nicht geladen werden: ${errorMessage(error)}`);
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
    if (authUser) {
      localStorage.setItem("15punkte-auth-prompt-dismissed", "true");
      setShowFirstSignInPrompt(false);
      return;
    }
    if (!authReady || !guestReady) return;
    if (localStorage.getItem("15punkte-auth-prompt-dismissed") !== "true") {
      setShowFirstSignInPrompt(true);
    }
  }, [authReady, guestReady, authUser]);

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
  const continueAsGuest = () => {
    localStorage.setItem("15punkte-auth-prompt-dismissed", "true");
    setShowFirstSignInPrompt(false);
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
  const savePerformance = (performance: Performance, next = false) => {
    setGradebook((current) => ({ ...current, performances: [...current.performances.filter((item) => item.id !== performance.id), performance] }));
    if (!next) setGradeTarget(null);
    notify("Leistung gespeichert. Dein Schnitt wurde neu berechnet.");
  };
  const addCustomGradeKind = (value: string): string | null => {
    const kind = value.trim().replace(/\s+/g, " ");
    const normalized = kind.toLocaleLowerCase("de");
    if (!kind) return "Bitte gib eine Bezeichnung ein.";
    if (kind.length > 40) return "Die Bezeichnung darf höchstens 40 Zeichen enthalten.";
    if ((preferences.customGradeKinds ?? []).length >= 30) return "Es sind höchstens 30 eigene Notenarten möglich.";
    if ([...GRADE_KINDS, ...(preferences.customGradeKinds ?? [])].some((item) => item.toLocaleLowerCase("de") === normalized)) return "Diese Notenart gibt es bereits.";
    setPreferences((current) => ({ ...current, customGradeKinds: [...(current.customGradeKinds ?? []), kind] }));
    return null;
  };
  const deletePerformance = (id: string) => {
    setGradebook((current) => ({ ...current, performances: current.performances.filter((item) => item.id !== id) }));
    setGradeTarget(null);
    notify("Leistung gelöscht.");
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
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(event) => void importBackup(event.target.files?.[0])} />
          {section === "Fächer" && <SubjectsPage subjects={subjects} gradebook={gradebook} semester={selectedSemester} onSemester={setSelectedSemester} onAdd={() => setShowSubject(true)} onEdit={(subject) => { setEditingSubject(subject.id); setShowSubject(true); }} onDelete={setDeleteTarget} onGrade={(subject, manual = false) => setGradeTarget({ subjectId: subject.id, semester: selectedSemester, manual })} onWeights={saveWeights} onMode={setEntryMode} onPerformanceEdit={(performance) => setGradeTarget({ performance, subjectId: performance.subjectId, semester: performance.semester })} onPerformanceDelete={deletePerformance} />}
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
      {gradeTarget && <GradeEntryModal subjects={subjects} initial={gradeTarget.performance} initialSubjectId={gradeTarget.subjectId} initialSemester={gradeTarget.semester} kinds={[...GRADE_KINDS, ...(preferences.customGradeKinds ?? [])]} onAddKind={addCustomGradeKind} onClose={() => setGradeTarget(null)} onSave={savePerformance} onDelete={deletePerformance} />}
      {deleteTarget && <ConfirmDelete subject={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteSubject(deleteTarget)} />}
      {showCalculation && <CalculationDialog result={semesterResult} semester={selectedSemester} onClose={() => setShowCalculation(false)} />}
      {pendingImport && <ConfirmAction title="Backup importieren?" message="Deine aktuell gespeicherten Daten werden durch den validierten Inhalt der JSON-Datei ersetzt. Dieser Vorgang kann nicht automatisch rückgängig gemacht werden." confirmLabel="Importieren und ersetzen" onCancel={() => setPendingImport(null)} onConfirm={confirmImport} />}
      {pendingReset && <ConfirmAction title="Alle persönlichen Daten löschen?" message="Alle Fächer, Leistungen, Ziele und Einstellungen werden unwiderruflich aus diesem Browser entfernt. Exportiere vorher ein Backup, falls du die Daten behalten möchtest." confirmLabel="Alle Daten löschen" onCancel={() => setPendingReset(false)} onConfirm={confirmReset} />}
      {pendingCloudImport && <ConfirmAction title={cloudDataExists ? "Cloud-Daten ersetzen?" : "Lokale Sicherung übernehmen?"} message={cloudDataExists ? "Die vorhandenen Cloud-Daten werden durch die lokale Sicherung ersetzt. Vorher wird die aktuelle Cloud-Sicherung als JSON heruntergeladen. Fahre nur fort, wenn du diese Änderung möchtest." : "Deine lokale Sicherung wird in dein Google-Konto kopiert. Sie bleibt zusätzlich als Gastdaten auf diesem Gerät erhalten."} confirmLabel="Lokale Daten übernehmen" onCancel={() => setPendingCloudImport(false)} onConfirm={() => void confirmLocalCloudImport()} />}
      {pendingAccountDelete && <ConfirmAction title="Google-Konto und Cloud-Daten löschen?" message="Das Notenbuch in Firestore und dein Firebase-Anmeldekonto werden dauerhaft gelöscht. Deine getrennt gespeicherten Gastdaten auf diesem Gerät bleiben erhalten. Zur Bestätigung wirst du möglicherweise erneut bei Google angemeldet." confirmLabel="Konto endgültig löschen" onCancel={() => setPendingAccountDelete(false)} onConfirm={() => void confirmAccountDelete()} />}
      {showFirstSignInPrompt && !authUser && <WelcomeSignInModal busy={accountBusy} authAvailable={authReady && Boolean(firebaseApi.current)} error={accountError} onSignIn={() => void handleGoogleSignIn()} onContinueAsGuest={continueAsGuest} />}
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

function SubjectsPage({ subjects, gradebook, semester, onSemester, onAdd, onEdit, onDelete, onGrade, onWeights, onMode, onPerformanceEdit, onPerformanceDelete }: { subjects: SchoolSubject[]; gradebook: GradebookData; semester: Semester; onSemester: (semester: Semester) => void; onAdd: () => void; onEdit: (subject: SchoolSubject) => void; onDelete: (subject: SchoolSubject) => void; onGrade: (subject: SchoolSubject, manual?: boolean) => void; onWeights: (subjectId: string, semester: Semester, written: number, oral: number) => void; onMode: (subjectId: string, semester: Semester, mode: "individual" | "manual") => void; onPerformanceEdit: (performance: Performance) => void; onPerformanceDelete: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const filtered = subjects.filter((subject) => `${subject.name} ${subject.code}`.toLowerCase().includes(query.toLowerCase())).slice().sort((a,b)=>Number(b.courseType==="Leistungsfach")-Number(a.courseType==="Leistungsfach"));
  const semesterResult = calculateSemester(gradebook, semester);
  return <>
    <section className="page-heading"><div><div className="eyebrow"><span className="status-dot" /> NOTENVERWALTUNG · BADEN-WÜRTTEMBERG</div><h1>Deine <span>Fächer.</span></h1><p>Kurse, Gewichtungen und alle Leistungen an einem Ort.</p></div><button className="button button-primary" onClick={onAdd}><Plus size={16} /> Fach hinzufügen</button></section>
    <div className="model-notice"><Calculator size={14} /><span><strong>Persönliche Modellrechnung</strong> · ersetzt nicht die offizielle schulische Bewertung.</span></div>
    <section className="subject-summary"><div><span>Fächer</span><strong>{subjects.length}</strong></div><div><span>Leistungen · {semesterLabel(semester)}</span><strong>{gradebook.performances.filter((item) => item.semester === semester).length}</strong></div><div><span>Halbjahresschnitt · {semesterLabel(semester)}</span><strong>{semesterResult.average === null ? "–" : semesterResult.average.toFixed(2).replace(".", ",")}<small> Punkte</small></strong></div></section>
    <article className="panel full-subjects subject-manager"><div className="panel-heading manager-heading"><div><h2>Kursübersicht</h2><p>Fach anklicken, um Noten, Gewichtung und Rechenweg zu verwalten.</p></div><label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fach suchen" /></label></div><div className="semester-selector" aria-label="Halbjahr auswählen">{SEMESTERS.map((item) => <button key={item} className={semester === item ? "selected" : ""} onClick={() => onSemester(item)}>{semesterLabel(item)}</button>)}</div>
      <div className="subject-list">{filtered.map((subject) => { const result = calculateSubject(subject, gradebook.performances, semester); const isExpanded = expanded === subject.id; const settings = subject.settings[semester]; return <section className={`managed-subject ${isExpanded ? "expanded" : ""}`} key={subject.id}><div className="managed-subject-main"><button className="subject-expand" onClick={() => setExpanded(isExpanded ? null : subject.id)} aria-expanded={isExpanded}><ChevronRight size={15} className="expand-chevron" /><span className={`subject-mark ${subject.color}`}>{subject.code}</span><span className="managed-subject-name"><strong>{subject.name}</strong><small>{subject.courseType} · Fachgewicht {subject.weight}× · {subject.state}</small></span></button><span className={`mode-badge ${settings.mode}`}>{settings.mode === "manual" ? "Manueller Schnitt" : "Einzelnoten"}</span><span className="managed-average">{result.average === null ? "–" : result.average.toFixed(2).replace(".", ",")}<small> P</small></span><div className="managed-actions"><button className="icon-button" aria-label={`${subject.name} bearbeiten`} onClick={() => onEdit(subject)}><Pencil size={14} /></button><button className="icon-button danger-hover" aria-label={`${subject.name} löschen`} onClick={() => onDelete(subject)}><X size={14} /></button></div></div>
        {isExpanded && <div className="subject-details">{settings.mode === "manual" ? <div className="manual-average-panel"><div><span>Übernommener manueller Schnitt · {semesterLabel(semester)}</span><strong>{settings.manualAverage === null ? "Noch nicht gesetzt" : `${settings.manualAverage.toFixed(2).replace(".", ",")} Punkte`}</strong><small>Dieser Altbestand bleibt erhalten. Für automatische Berechnung bitte auf Einzelleistungen umstellen.</small></div><button className="button button-quiet small-button" onClick={() => onMode(subject.id, semester, "individual")}>Einzelleistungen verwenden</button></div> : <>
            <div className="area-weight-grid"><AreaSummary title="Schriftlich" result={result.written} weight={settings.writtenWeight} onWeight={(value) => onWeights(subject.id, semester, value, settings.oralWeight)} /><AreaSummary title="Mündlich" result={result.oral} weight={settings.oralWeight} onWeight={(value) => onWeights(subject.id, semester, settings.writtenWeight, value)} /></div>
            <div className="detail-actions"><button className="button button-primary small-button" onClick={() => onGrade(subject)}><Plus size={14} /> Leistung eintragen</button><span>Noten mit Faktor 0 werden ignoriert.</span></div>
            {gradebook.performances.filter((item) => item.subjectId === subject.id).length ? <div className="performance-table-wrap"><table className="performance-table"><thead><tr><th>HALBJAHR</th><th>LEISTUNG / ART</th><th>BEREICH</th><th>DATUM</th><th>PUNKTE</th><th>FAKTOR</th><th></th></tr></thead><tbody>{gradebook.performances.filter((item) => item.subjectId === subject.id).slice().sort((a,b)=>a.semester-b.semester).map((item) => <tr key={item.id}><td>{semesterLabel(item.semester)}</td><td><strong>{item.title || item.kind}</strong><small>{item.kind}</small></td><td>{item.area === "written" ? "Schriftlich" : "Mündlich"}</td><td>{item.date ? new Date(`${item.date}T12:00:00`).toLocaleDateString("de-DE") : "–"}</td><td><ScorePill value={item.points} compact /></td><td>{item.weight}×</td><td><button className="text-button" onClick={() => onPerformanceEdit(item)}>Bearbeiten</button><button className="text-button remove-performance" onClick={() => onPerformanceDelete(item.id)} aria-label={`${item.title || item.kind} löschen`}><X size={14} /></button></td></tr>)}</tbody></table></div> : <p className="empty-performances">Noch keine Einzelleistungen erfasst.</p>}
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

function ModalFrame({ children, onClose, labelledBy }: { children: React.ReactNode; onClose: () => void; labelledBy: string }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-labelledby={labelledBy}>{children}</div></div>;
}

function ConfirmDelete({ subject, onCancel, onConfirm }: { subject: SchoolSubject; onCancel: () => void; onConfirm: () => void }) {
  return <ModalFrame onClose={onCancel} labelledBy="delete-subject-title"><div className="add-modal confirm-modal"><span className="eyebrow small-eyebrow">FACH UND LEISTUNGEN ENTFERNEN</span><h2 id="delete-subject-title">{subject.name} löschen?</h2><p>Das Fach und alle zugehörigen Einzelnoten werden dauerhaft aus diesem Browser entfernt.</p><div className="modal-actions"><button className="button button-quiet" onClick={onCancel}>Abbrechen</button><button className="button delete-button" onClick={onConfirm}><X size={14} /> Fach und Noten löschen</button></div></div></ModalFrame>;
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


function RulesPage() {
  const rules = BW_ABITUR_2028_RULES;
  return <><section className="page-heading"><div><div className="eyebrow"><span className="status-dot" /> REGELWERK · ABITURJAHRGANG 2028</div><h1>Regeln. <span>Mit Quellen.</span></h1><p>Jahrgangsbezogene Orientierung für das allgemeinbildende Gymnasium in Baden-Württemberg.</p></div><a className="button button-quiet" href={rules.sources[0].url} target="_blank" rel="noreferrer">Amtlichen Leitfaden öffnen <ArrowRight size={14} /></a></section><div className="model-notice"><CircleHelp size={14} /><span><strong>Keine verbindliche Zulassungsentscheidung.</strong> Maßgeblich sind die für deinen Jahrgang geltende AGVO und die Auskunft deiner Schule.</span></div><section className="rules-summary"><div className="panel rules-intro"><span className="eyebrow small-eyebrow">PRÜFUNGSORDNUNG</span><h2>{rules.schoolType}</h2><p>{rules.examinationOrder}</p><div className="rules-meta"><span>Geltungsbezug</span><strong>Abitur 2028 · Kursstufe 2025–2028</strong></div><div className="rules-meta"><span>Regelstand geprüft</span><strong>21. November 2026 · {rules.rulesetVersion}</strong></div><p className="grade-scale">Einführungsphase: Orientierung und Kurswahl vor Eintritt in die Qualifikationsphase. Qualifikationsphase: vier Kurshalbjahre. Belegpflichten und Zulassung müssen schülerbezogen bestätigt werden.</p></div><div className="panel block-cards"><div><span>BLOCK I</span><strong>40 <small>Kurse</small></strong><p>12 Leistungskurs-Halbjahre doppelt + 28 weitere Kurse einfach, Faktor 40/48. Max. 600 Punkte.</p></div><div><span>BLOCK II</span><strong>5 <small>Prüfungen</small></strong><p>Drei schriftliche Prüfungsfächer; fünf Prüfungsergebnisse jeweils vierfach. Max. 300 Punkte.</p></div><div><span>GESAMTQUALIFIKATION</span><strong>900 <small>Punkte</small></strong><p>Bestehensgrenzen: Block I ≥ 200, Block II ≥ 100 und Gesamt ≥ 300.</p></div></div></section><section className="panel rules-list-panel"><div className="panel-heading"><div><h2>Verifizierte Eckpunkte</h2><p>Aus dem offiziellen Leitfaden für Abitur 2028.</p></div><span className="verified-badge"><Check size={12} /> Quellen dokumentiert</span></div><ul className="rules-facts">{rules.verifiedFacts.map((fact) => <li key={fact}><Check size={14} />{fact}</li>)}</ul></section><section className="panel rules-list-panel"><div className="panel-heading"><div><h2>Offene Prüfbereiche</h2><p>Diese Punkte erfordern individuelle Laufbahn- und Schulangaben.</p></div></div><ul className="rules-facts unresolved-facts">{rules.unresolved.map((fact) => <li key={fact}><CircleHelp size={14} />{fact}</li>)}</ul></section><section className="panel rules-list-panel"><div className="panel-heading"><div><h2>Amtliche Quellen</h2><p>Prüfungsordnung und Jahrgangsleitfaden, geprüft am 21.11.2026.</p></div></div><div className="source-list">{rules.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}><span><strong>{source.label}</strong><small>{source.note}</small></span><ArrowRight size={14} /></a>)}</div></section></>;
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
