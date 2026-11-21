import { Calculator, X } from "lucide-react";
import { formatPoints, type Semester } from "../lib/gradebook";
import { calculateSemester } from "../lib/gradebook";
export function CalculationDialog({
  result,
  semester,
  onClose,
}: {
  result: ReturnType<typeof calculateSemester>;
  semester: Semester;
  onClose: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="calculation-title">
        <div className="add-modal calculation-modal">
          <div className="modal-heading">
            <div>
              <span className="eyebrow small-eyebrow">
                PERSÖNLICHE MODELLRECHNUNG
              </span>
              <h2 id="calculation-title">Rechenweg · H{semester}</h2>
            </div>
            <button
              className="icon-button"
              onClick={onClose}
              aria-label="Schließen"
            >
              <X size={17} />
            </button>
          </div>
          <p className="calculation-lead">
            <Calculator size={14} /> Halbjahresschnitt:{" "}
            <strong>{formatPoints(result.average, 2)} Punkte</strong>
          </p>
          <div className="calc-steps">
            {result.results.map((item) => (
              <div className="calc-step" key={item.subject.id}>
                <strong>{item.subject.name}</strong>
                <span>
                  {item.mode === "manual"
                    ? `Manueller Schnitt ${formatPoints(item.average, 2)} Punkte; Einzelnoten ausgeschlossen.`
                    : `Schriftlich ${formatPoints(item.written.average, 2)} P × ${item.subject.settings[semester].writtenWeight}; mündlich ${formatPoints(item.oral.average, 2)} P × ${item.subject.settings[semester].oralWeight}; Fachgewicht ${item.subject.weight}×.`}
                </span>
              </div>
            ))}
          </div>
          <p className="manual-warning">
            Unverbindliche Modellrechnung; keine offizielle schulische
            Bewertung.
          </p>
          <div className="modal-actions">
            <button className="button button-primary" onClick={onClose}>
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
