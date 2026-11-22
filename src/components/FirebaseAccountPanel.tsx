import { Check, Cloud, LogIn, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import type { User } from "firebase/auth";

export type CloudStatus =
  | "guest"
  | "loading"
  | "syncing"
  | "saved"
  | "migration"
  | "error";

export function FirebaseAccountPanel({
  user,
  authReady,
  busy,
  status,
  error,
  migrationAvailable,
  cloudDataExists,
  onSignIn,
  onSignOut,
  onDeleteAccount,
  onImportLocal,
  onKeepCurrent,
  onRetrySync,
}: {
  user: User | null;
  authReady: boolean;
  busy: boolean;
  status: CloudStatus;
  error: string;
  migrationAvailable: boolean;
  cloudDataExists: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  onImportLocal: () => void;
  onKeepCurrent: () => void;
  onRetrySync: () => void;
}) {
  const statusText: Record<CloudStatus, string> = {
    guest: "Gastmodus · lokal gespeichert",
    loading: "Cloud-Daten werden geladen …",
    syncing: "Synchronisierung läuft …",
    saved: "Mit Google-Konto synchronisiert",
    migration: "Übernahme lokaler Daten nötig",
    error: "Cloud-Synchronisierung prüfen",
  };

  return (
    <article className="panel data-panel firebase-account-panel">
      <div className="data-icon">
        {user ? <Cloud size={17} /> : <ShieldCheck size={17} />}
      </div>
      <h2>{user ? "Dein Google-Konto" : "Cloud-Synchronisierung"}</h2>
      <p>
        {user
          ? `Angemeldet als ${user.email ?? user.displayName ?? "Google-Konto"}. Deine Noten werden diesem Konto zugeordnet.`
          : "Ohne Anmeldung bleibt alles lokal auf diesem Gerät. Mit Google kannst du deine Daten geräteübergreifend synchronisieren."}
      </p>
      <div className="storage-status">
        <span
          className={`status-dot ${status === "error" ? "warning-dot" : ""}`}
        />
        {statusText[status]}
      </div>
      {error && (
        <p className="firebase-error" role="alert">
          {error}
        </p>
      )}
      {user && status === "error" && (
        <button className="button button-quiet firebase-retry" onClick={onRetrySync}>
          Erneut synchronisieren
        </button>
      )}
      {!user && (
        <div className="backup-actions">
          <button
            className="button button-primary"
            disabled={!authReady || busy}
            onClick={onSignIn}
          >
            <LogIn size={14} />
            {busy ? "Bitte warten …" : "Mit Google anmelden"}
          </button>
          <small className="firebase-hint">
            Google-Anmeldung erstellt bei Bedarf automatisch dein Konto.
          </small>
        </div>
      )}
      {user && migrationAvailable && (
        <div className="migration-notice">
          <strong>
            {cloudDataExists
              ? "Lokale Sicherung gefunden"
              : "Lokale Daten gefunden"}
          </strong>
          <p>
            {cloudDataExists
              ? "Die vorhandenen Cloud-Daten bleiben unverändert, bis du die lokale Sicherung ausdrücklich übernimmst."
              : "Deine lokale Sicherung wird erst nach deiner Bestätigung in dieses Konto kopiert."}
          </p>
          <div className="backup-actions">
            <button className="button button-primary" onClick={onImportLocal}>
              Lokale Daten übernehmen
            </button>
            <button className="button button-quiet" onClick={onKeepCurrent}>
              {cloudDataExists
                ? "Cloud-Daten beibehalten"
                : "Ohne lokale Daten starten"}
            </button>
          </div>
        </div>
      )}
      {user && (
        <div className="backup-actions account-actions">
          <button
            className="button button-quiet"
            disabled={busy}
            onClick={onSignOut}
          >
            <LogOut size={14} /> Abmelden
          </button>
          <button
            className="reset-button destructive-reset"
            disabled={busy}
            onClick={onDeleteAccount}
          >
            <Trash2 size={13} /> Konto und Cloud-Daten löschen
          </button>
        </div>
      )}
      {user && status === "saved" && (
        <span className="firebase-saved-label">
          <Check size={12} /> Synchronisierung aktiv
        </span>
      )}
    </article>
  );
}
