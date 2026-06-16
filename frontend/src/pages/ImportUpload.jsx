import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useBasePath } from "../hooks/useBasePath";
import { createSession, uploadPdf } from "../services/importService";

const MAX_FILES = 20;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const STATUS_LABEL = {
  aguardando: { label: "Aguardando", className: "bg-secondary" },
  processando: { label: "Processando…", className: "bg-info text-dark" },
  concluido: { label: "Concluído", className: "bg-success" },
  erro: { label: "Erro", className: "bg-danger" },
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ImportUpload() {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const dropRef = useRef(null);
  const inputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [globalError, setGlobalError] = useState("");

  const addFiles = (incoming) => {
    setGlobalError("");
    const accepted = [];
    const rejected = [];

    for (const f of incoming) {
      if (f.type !== "application/pdf") {
        rejected.push(`"${f.name}" não é PDF`);
        continue;
      }
      if (f.size > MAX_SIZE_BYTES) {
        rejected.push(`"${f.name}" excede o limite de 10MB`);
        continue;
      }
      accepted.push({ file: f, status: "aguardando" });
    }

    setFiles((prev) => {
      const combined = [...prev, ...accepted];
      if (combined.length > MAX_FILES) {
        rejected.push(`Limite de ${MAX_FILES} arquivos por sessão`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });

    if (rejected.length > 0) setGlobalError(rejected.join(" • "));
  };

  const handleSelect = (e) => addFiles(Array.from(e.target.files || []));
  const handleDrop = (e) => {
    e.preventDefault();
    dropRef.current?.classList.remove("dropzone-dragover");
    addFiles(Array.from(e.dataTransfer.files || []));
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    dropRef.current?.classList.add("dropzone-dragover");
  };
  const handleDragLeave = () => dropRef.current?.classList.remove("dropzone-dragover");

  const removeFile = (idx) => {
    if (processing) return;
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress({ current: 0, total: files.length });
    setGlobalError("");

    let sessionId;
    try {
      const session = await createSession();
      sessionId = session.id;
    } catch (e) {
      setGlobalError(`Falha ao criar sessão: ${e.message}`);
      setProcessing(false);
      return;
    }

    const firstSuccessId = { id: null };

    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length });
      setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "processando" } : f)));

      try {
        const result = await uploadPdf(sessionId, files[i].file);
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "concluido", importId: result.id } : f))
        );
        if (!firstSuccessId.id) firstSuccessId.id = result.id;
      } catch (e) {
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "erro", error: e.message } : f))
        );
      }
    }

    setProcessing(false);
    if (firstSuccessId.id) {
      navigate(`${basePath}/imports/${firstSuccessId.id}/review`);
    }
  };

  const allDone = files.length > 0 && files.every((f) => f.status === "concluido" || f.status === "erro");
  const canProcess = files.length > 0 && !processing && !allDone;

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        <nav aria-label="breadcrumb" className="mb-2">
          <ol className="breadcrumb small mb-0">
            <li className="breadcrumb-item">
              <a href={`${basePath}/orders`} className="text-secondary text-decoration-none">Pedidos</a>
            </li>
            <li className="breadcrumb-item active text-light" aria-current="page">Importar via IA</li>
          </ol>
        </nav>

        <div className="module-header">
          <h3 className="module-title">Importar Pedidos via IA</h3>
          <p className="module-subtitle">Envie PDFs de ordens de compra para extração automática dos dados</p>
        </div>

        <div className="d-flex justify-content-end mb-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(`${basePath}/imports`)}>
            <i className="bi bi-clock-history me-1"></i>
            Ver histórico
          </button>
        </div>

        {globalError && <div className="alert alert-warning py-2 small">{globalError}</div>}

        <div
          ref={dropRef}
          className="card bg-dark border-secondary text-center p-5 mb-3 dropzone"
          style={{ cursor: processing ? "not-allowed" : "pointer", borderStyle: "dashed", borderWidth: "2px" }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !processing && inputRef.current?.click()}
        >
          <i className="bi bi-cloud-arrow-up display-4 mb-2" style={{ color: "var(--accent)" }}></i>
          <h5 className="text-light">Arraste arquivos PDF aqui</h5>
          <p className="text-secondary small mb-3">ou clique para selecionar</p>
          <div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={processing}
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            >
              <i className="bi bi-folder2-open me-2"></i>
              Selecionar arquivos
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            hidden
            onChange={handleSelect}
          />
          <div className="text-secondary small mt-3">
            Aceita apenas PDFs. Máximo 10MB por arquivo. Até {MAX_FILES} arquivos por sessão.
          </div>
        </div>

        {files.length > 0 && (
          <div className="card bg-dark border-secondary mb-3">
            <div className="card-header bg-transparent border-secondary d-flex justify-content-between align-items-center">
              <span className="text-light">
                <i className="bi bi-files me-2"></i>
                {files.length} arquivo{files.length === 1 ? "" : "s"} selecionado{files.length === 1 ? "" : "s"}
              </span>
              {processing && (
                <span className="text-secondary small">
                  Processando arquivo {progress.current} de {progress.total}
                </span>
              )}
            </div>
            <ul className="list-group list-group-flush">
              {files.map((f, i) => {
                const statusInfo = STATUS_LABEL[f.status];
                return (
                  <li
                    key={i}
                    className="list-group-item bg-dark text-light border-secondary d-flex align-items-center gap-3"
                  >
                    <i className="bi bi-file-earmark-pdf text-danger fs-4"></i>
                    <div className="flex-grow-1 min-w-0">
                      <div className="text-light text-truncate">{f.file.name}</div>
                      <div className="text-secondary small">{formatSize(f.file.size)}</div>
                      {f.error && <div className="text-danger small">{f.error}</div>}
                    </div>
                    <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>
                    {!processing && f.status === "aguardando" && (
                      <button className="btn btn-link btn-sm text-danger p-0" onClick={() => removeFile(i)}>
                        <i className="bi bi-x-lg"></i>
                      </button>
                    )}
                    {f.status === "concluido" && f.importId && (
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => navigate(`${basePath}/imports/${f.importId}/review`)}
                      >
                        Revisar <i className="bi bi-arrow-right ms-1"></i>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn-outline-secondary" onClick={() => navigate(`${basePath}/orders`)} disabled={processing}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleProcess} disabled={!canProcess}>
            {processing ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Processando…
              </>
            ) : (
              <>
                <i className="bi bi-robot me-2"></i>
                Processar Arquivos
              </>
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
