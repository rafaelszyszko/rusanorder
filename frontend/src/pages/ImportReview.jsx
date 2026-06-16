import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useBasePath } from "../hooks/useBasePath";
import { getImport, getPdfBlobUrl, confirmImport, skipImport } from "../services/importService";
import { listClients } from "../services/clientService";

const UNIT_OPTIONS = ["m²", "un", "kg", "m", "pc"];

const CONF_STYLES = {
  alta: { className: "bg-success", label: "Alta", icon: "bi-check-circle-fill" },
  media: { className: "bg-warning text-dark", label: "Média", icon: "bi-exclamation-circle-fill" },
  baixa: { className: "bg-danger", label: "Baixa", icon: "bi-x-circle-fill" },
};

function ConfidenceBadge({ level }) {
  const style = CONF_STYLES[level] || CONF_STYLES.baixa;
  return (
    <span className={`badge ms-2 small ${style.className}`} title={`Confiança ${style.label}`}>
      <i className={`bi ${style.icon} me-1`}></i>
      {style.label}
    </span>
  );
}

function brl(n) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);
}

export default function ImportReview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const basePath = useBasePath();

  const [importData, setImportData] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    client_id: "",
    purchase_order: "",
    notes: "",
    items: [],
  });
  const [confidence, setConfidence] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let pdfBlobUrl;
    (async () => {
      try {
        const [imp, clientList, blobUrl] = await Promise.all([
          getImport(id),
          listClients(),
          getPdfBlobUrl(id),
        ]);
        pdfBlobUrl = blobUrl;
        setImportData(imp);
        setClients(clientList);
        setPdfUrl(blobUrl);

        const ext = imp.extracted_data || {};
        setForm({
          client_id: ext.client_match?.suggested_client_id || "",
          purchase_order: ext.purchase_order?.value || "",
          notes: ext.notes?.value || "",
          items: (ext.items || []).map((it) => ({
            description: it.description || "",
            unit: it.unit || "m²",
            quantity: it.quantity || 0,
            unit_price: it.unit_price || 0,
          })),
        });
        setConfidence({
          client: ext.client_match?.confidence,
          purchase_order: ext.purchase_order?.confidence,
          items: (ext.items || []).map((it) => it.confidence),
          extracted_total: ext.extracted_total,
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [id]);

  const total = form.items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const divergesFromExtracted =
    confidence.extracted_total !== null &&
    confidence.extracted_total !== undefined &&
    Math.abs(total - Number(confidence.extracted_total)) > 0.01;

  const updateItem = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    }));
    setConfidence((prev) => ({
      ...prev,
      items: prev.items.map((c, i) => (i === idx ? "alta" : c)),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", unit: "m²", quantity: 0, unit_price: 0 }],
    }));
    setConfidence((prev) => ({ ...prev, items: [...prev.items, "alta"] }));
  };

  const removeItem = (idx) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
    setConfidence((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const handleConfirm = async () => {
    setError("");
    if (!form.client_id) return setError("Selecione um cliente");
    if (form.items.length === 0) return setError("Adicione pelo menos um item");
    for (const [i, it] of form.items.entries()) {
      if (!it.description?.trim()) return setError(`Item ${i + 1}: descrição obrigatória`);
      if (!(Number(it.quantity) > 0)) return setError(`Item ${i + 1}: quantidade deve ser > 0`);
      if (!(Number(it.unit_price) > 0)) return setError(`Item ${i + 1}: preço deve ser > 0`);
    }

    setSubmitting(true);
    try {
      const result = await confirmImport(id, form);
      navigate(`${basePath}/orders/${result.order_id}`);
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!confirm("Pular este arquivo? A importação ficará marcada como cancelada.")) return;
    try {
      await skipImport(id);
      navigate(`${basePath}/imports`);
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container-fluid px-4 py-4 text-center flex-grow-1">
          <div className="spinner-border" role="status"></div>
          <div className="mt-3 text-secondary">Carregando importação…</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !importData) {
    return (
      <DashboardLayout>
        <div className="container-fluid px-4 py-4 flex-grow-1">
          <div className="alert alert-danger">{error}</div>
          <button className="btn btn-outline-secondary" onClick={() => navigate(`${basePath}/imports`)}>
            Voltar ao histórico
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        <nav aria-label="breadcrumb" className="mb-2">
          <ol className="breadcrumb small mb-0">
            <li className="breadcrumb-item">
              <a href={`${basePath}/orders`} className="text-secondary text-decoration-none">Pedidos</a>
            </li>
            <li className="breadcrumb-item">
              <a href={`${basePath}/imports/new`} className="text-secondary text-decoration-none">Importar via IA</a>
            </li>
            <li className="breadcrumb-item active text-light" aria-current="page">Revisão</li>
          </ol>
        </nav>

        <div className="module-header">
          <h3 className="module-title">Revisão dos Dados Extraídos</h3>
          <p className="module-subtitle">
            <i className="bi bi-file-earmark-pdf text-danger me-1"></i>
            {importData.filename}
            <span className="mx-2">·</span>
            Confiança geral: <strong>{Math.round((importData.confidence_score || 0) * 100)}%</strong>
          </p>
        </div>

        {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

        <div className="row g-3">
          {/* PDF preview */}
          <div className="col-md-6">
            <div className="card bg-dark border-secondary">
              <div className="card-header bg-transparent border-secondary d-flex justify-content-between align-items-center">
                <span className="text-light">
                  <i className="bi bi-file-earmark-pdf me-2"></i>
                  PDF Original
                </span>
                <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary">
                  <i className="bi bi-box-arrow-up-right me-1"></i>
                  Abrir em nova aba
                </a>
              </div>
              <div className="card-body p-0">
                {pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    title="PDF Preview"
                    style={{ width: "100%", height: "calc(100vh - 320px)", minHeight: 500, border: 0 }}
                  />
                ) : (
                  <div className="p-4 text-center text-secondary">PDF indisponível</div>
                )}
              </div>
            </div>
          </div>

          {/* Review form */}
          <div className="col-md-6">
            <div className="card bg-dark border-secondary">
              <div className="card-header bg-transparent border-secondary text-light">
                <i className="bi bi-stars me-2" style={{ color: "var(--accent)" }}></i>
                Dados Extraídos pela IA
              </div>
              <div className="card-body" style={{ maxHeight: "calc(100vh - 320px)", overflowY: "auto" }}>
                {/* Client */}
                <div className="mb-3">
                  <label className="form-label small text-light d-flex align-items-center">
                    Cliente *
                    {confidence.client && <ConfidenceBadge level={confidence.client} />}
                  </label>
                  <select
                    className="form-select bg-dark text-light border-secondary"
                    value={form.client_id}
                    onChange={(e) => setForm({ ...form, client_id: Number(e.target.value) })}
                  >
                    <option value="">Selecione…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.cnpj ? `(${c.cnpj})` : ""}
                      </option>
                    ))}
                  </select>
                  {importData.extracted_data?.client_match?.reasoning && (
                    <div className="text-secondary small mt-1">
                      <i className="bi bi-info-circle me-1"></i>
                      {importData.extracted_data.client_match.reasoning}
                    </div>
                  )}
                </div>

                {/* Purchase order */}
                <div className="mb-3">
                  <label className="form-label small text-light d-flex align-items-center">
                    Ordem de Compra
                    {confidence.purchase_order && <ConfidenceBadge level={confidence.purchase_order} />}
                  </label>
                  <input
                    type="text"
                    className="form-control bg-dark text-light border-secondary"
                    value={form.purchase_order}
                    onChange={(e) => setForm({ ...form, purchase_order: e.target.value })}
                  />
                </div>

                {/* Notes */}
                <div className="mb-3">
                  <label className="form-label small text-light">Observações</label>
                  <textarea
                    rows={2}
                    className="form-control bg-dark text-light border-secondary"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                {/* Items */}
                <div className="mb-2 d-flex justify-content-between align-items-center">
                  <label className="form-label small text-light mb-0">Itens do Pedido</label>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={addItem}>
                    <i className="bi bi-plus-lg me-1"></i> Adicionar item
                  </button>
                </div>

                {form.items.length === 0 && (
                  <div className="alert alert-warning py-2 small">
                    A IA não identificou itens. Adicione manualmente.
                  </div>
                )}

                {form.items.map((it, idx) => (
                  <div key={idx} className="border border-secondary rounded p-2 mb-2" style={{ background: "var(--bg-elevated)" }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-light">
                        Item {idx + 1}
                        {confidence.items[idx] && <ConfidenceBadge level={confidence.items[idx]} />}
                      </small>
                      <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => removeItem(idx)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                    <input
                      type="text"
                      className="form-control form-control-sm bg-dark text-light border-secondary mb-2"
                      placeholder="Descrição"
                      value={it.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                    />
                    <div className="row g-2">
                      <div className="col-3">
                        <select
                          className="form-select form-select-sm bg-dark text-light border-secondary"
                          value={it.unit}
                          onChange={(e) => updateItem(idx, "unit", e.target.value)}
                        >
                          {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="col-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control form-control-sm bg-dark text-light border-secondary"
                          placeholder="Qtd."
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        />
                      </div>
                      <div className="col-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control form-control-sm bg-dark text-light border-secondary"
                          placeholder="Preço un."
                          value={it.unit_price}
                          onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
                        />
                      </div>
                      <div className="col-3 text-end small d-flex align-items-center justify-content-end text-light">
                        {brl(Number(it.quantity || 0) * Number(it.unit_price || 0))}
                      </div>
                    </div>
                  </div>
                ))}

                <hr className="border-secondary" />

                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong className="text-light">Total Geral</strong>
                  <strong className="text-light fs-5">{brl(total)}</strong>
                </div>

                {divergesFromExtracted && (
                  <div className="alert alert-warning py-2 small mb-0">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Total extraído pela IA ({brl(confidence.extracted_total)}) diverge da soma dos itens ({brl(total)}). Verifique.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 d-flex gap-2 justify-content-end">
              <button className="btn btn-outline-secondary" onClick={() => navigate(`${basePath}/imports`)} disabled={submitting}>
                Voltar
              </button>
              <button className="btn btn-outline-warning" onClick={handleSkip} disabled={submitting}>
                Pular Arquivo
              </button>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={submitting}>
                {submitting ? (
                  <><span className="spinner-border spinner-border-sm me-2" /> Criando…</>
                ) : (
                  <><i className="bi bi-check2-circle me-2"></i> Criar Pedido</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
