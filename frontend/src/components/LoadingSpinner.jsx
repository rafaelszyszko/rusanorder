export default function LoadingSpinner({ label = "Carregando...", padding = "py-5", small = false }) {
  return (
    <div className={`d-flex flex-column align-items-center justify-content-center ${padding}`}>
      <div className={`spinner-border ${small ? "spinner-border-sm" : ""} text-info`} role="status">
        <span className="visually-hidden">{label}</span>
      </div>
      {label && (
        <div className="text-secondary small mt-2">{label}</div>
      )}
    </div>
  );
}
