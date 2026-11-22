import { Cloud, LogIn } from "lucide-react";

export function WelcomeSignInModal({
  busy,
  authAvailable,
  error,
  onSignIn,
  onContinueAsGuest,
}: {
  busy: boolean;
  authAvailable: boolean;
  error: string;
  onSignIn: () => void;
  onContinueAsGuest: () => void;
}) {
  return (
    <div className="modal-backdrop welcome-backdrop">
      <section
        className="add-modal welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-sign-in-title"
      >
        <div className="welcome-icon">
          <Cloud size={21} />
        </div>
        <span className="eyebrow small-eyebrow">WILLKOMMEN BEI 15PUNKTE</span>
        <h2 id="welcome-sign-in-title">Deine Noten. Überall dabei.</h2>
        <p>
          Melde dich mit Google an, um deine Noten sicher zu synchronisieren.
          Du kannst 15Punkte auch ohne Konto auf diesem Gerät nutzen.
        </p>
        {error && (
          <p className="firebase-error" role="alert">
            {error}
          </p>
        )}
        <div className="welcome-actions">
          <button
            className="button button-primary"
            disabled={!authAvailable || busy}
            onClick={onSignIn}
          >
            <LogIn size={15} />
            {busy ? "Bitte warten …" : "Mit Google anmelden"}
          </button>
          <button
            className="button button-quiet"
            disabled={busy}
            onClick={onContinueAsGuest}
          >
            Ohne Konto fortfahren
          </button>
        </div>
        <small>
          Deine Anmeldung ist freiwillig. Gastdaten bleiben lokal in deinem
          Browser.
        </small>
      </section>
    </div>
  );
}
