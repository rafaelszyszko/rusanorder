export default function ConfirmModal({ show, title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar", variant = "danger", onConfirm, onCancel }) {
  if (!show) return null;

  return (
    <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={onCancel}>
      <div className="modal-dialog modal-dialog-centered modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-content bg-dark border-${variant}`}>
          <div className="modal-header border-secondary">
            <h6 className={`modal-title text-${variant}`}>{title}</h6>
            <button type="button" className="btn-close btn-close-white" onClick={onCancel} />
          </div>
          <div className="modal-body">
            <p className="text-white small mb-0" style={{ whiteSpace: "pre-line" }}>{message}</p>
          </div>
          <div className="modal-footer border-secondary">
            <button className="btn btn-outline-secondary btn-sm" onClick={onCancel}>{cancelLabel}</button>
            <button className={`btn btn-${variant} btn-sm`} onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
