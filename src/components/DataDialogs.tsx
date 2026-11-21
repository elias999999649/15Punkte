import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import type { SchoolSubject } from "../lib/gradebook";
function Modal({
  children,
  onCancel,
  titleId,
}: {
  children: ReactNode;
  onCancel: () => void;
  titleId: string;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}>
        {children}
      </div>
    </div>
  );
}
export function ConfirmDelete({
  subject,
  onCancel,
  onConfirm,
}: {
  subject: SchoolSubject;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal onCancel={onCancel} titleId="delete-subject-title">
      <div className="add-modal confirm-modal">
        <h2 id="delete-subject-title">{subject.name} löschen?</h2>
        <p>
          Das Fach und zugehörige Leistungen werden aus diesem Browser entfernt.
        </p>
        <div className="modal-actions">
          <button className="button button-quiet" onClick={onCancel}>
            Abbrechen
          </button>
          <button className="button delete-button" onClick={onConfirm}>
            <Trash2 size={14} /> Fach und Noten löschen
          </button>
        </div>
      </div>
    </Modal>
  );
}
export function ConfirmAction({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal onCancel={onCancel} titleId="confirm-action-title">
      <div className="add-modal confirm-modal">
        <span className="eyebrow small-eyebrow">
          DATENVERWALTUNG · BESTÄTIGUNG
        </span>
        <h2 id="confirm-action-title">{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="button button-quiet" onClick={onCancel}>
            Abbrechen
          </button>
          <button className="button delete-button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
