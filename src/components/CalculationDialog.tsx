import { Calculator, X } from "lucide-react";
import { courseWeight, formatPoints, type Semester } from "../lib/gradebook";
import { calculateSemester } from "../lib/gradebook";

export function CalculationDialog({ result, semester, onClose }: { result: ReturnType<typeof calculateSemester>; semester: Semester; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="calculation-title">
      <div className="add-modal calculation-modal">
        <div className="modal-heading"><div><h2 id="calculation-title">Rechenweg · H{semester}</h2></div><button className="icon-button" onClick={onClose} aria-label="Schließen"><X size={17} /></button></div>
        <p className="calculation-lead"><Calculator size={14} /> Halbjahresschnitt: <strong>{formatPoints(result.average, 2)} Punkte</strong></p>
        <div className="calc-steps">{result.results.map((item) => {
          const settings = item.subject.settings[semester];
          const areas = [
            { label: "Schriftlich", result: item.written, weight: settings.writtenWeight },
            { label: "Mündlich", result: item.oral, weight: settings.oralWeight },
            { label: "Praktisch", result: item.practical, weight: settings.practicalWeight ?? 1 },
          ];
          const breakdown = item.mode === "manual"
            ? `Manueller Schnitt: ${formatPoints(item.average, 2)} Punkte.`
            : areas.filter((area) => area.result.count > 0).map((area) => `${area.label}: ${formatPoints(area.result.average, 2)} P × ${area.weight}`).join(" | ");
          return <div className="calc-step" key={item.subject.id}><strong>{item.subject.name} <span className={`course-type-pill ${item.subject.courseType === "Leistungsfach" ? "lk" : "gk"}`}>{item.subject.courseType === "Leistungsfach" ? "LK" : "GK"}</span></strong><span>{breakdown || "Keine gewichteten Leistungen"}; Fachgewicht {courseWeight(item.subject)}×.</span></div>;
        })}</div>
        <div className="modal-actions"><button className="button button-primary" onClick={onClose}>Schließen</button></div>
      </div>
    </div>
  </div>;
}
