import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useBasePath } from "../hooks/useBasePath";
import {
  getSampleById,
  updateSampleStatus,
  confirmAcceptance,
  addSampleComment,
  deleteSampleComment,
  uploadSamplePhoto,
  getPhotoBlobUrl,
} from "../services/sampleService";
import {
  sampleStatusLabels,
  sampleStatusColors,
  validSampleTransitions,
  leatherTypeLabels,
} from "../constants/sampleStatus";

const todayIso = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
};

export default function SampleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const currentUserId = Number(localStorage.getItem("userId"));
  const isAdmin = localStorage.getItem("role") === "admin";

  const [sample, setSample] = useState(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  // Aceite modal
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptDate, setAcceptDate] = useState(todayIso());
  const [acceptNotes, setAcceptNotes] = useState("");

  // Status transition modal (para retorno de cliente)
  const [pendingStatus, setPendingStatus] = useState(null);
  const [statusComment, setStatusComment] = useState("");
  const [returnDate, setReturnDate] = useState(todayIso());

  // Comment
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Photo upload
  const [photoUrls, setPhotoUrls] = useState({});
  const [lightbox, setLightbox] = useState(null);

  const load = () => {
    getSampleById(id).then(setSample).catch((e) => setError(e.message));
  };
  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!sample?.photos) return;
    sample.photos.forEach(async (p) => {
      if (!photoUrls[p.id]) {
        try {
          const url = await getPhotoBlobUrl(p.id);
          setPhotoUrls((prev) => ({ ...prev, [p.id]: url }));
        } catch { /* ignore */ }
      }
    });
  }, [sample?.photos]);

  const handleStatusClick = (newStatus) => {
    if (["aprovada", "rejeitada", "em_analise"].includes(newStatus)) {
      setPendingStatus(newStatus);
      setStatusComment("");
      setReturnDate(todayIso());
      return;
    }
    doTransition(newStatus, "");
  };

  const doTransition = async (newStatus, comment, retDate) => {
    setUpdating(true);
    setError("");
    try {
      await updateSampleStatus(id, newStatus, comment, retDate || null);
      setPendingStatus(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const confirmReturnTransition = () => {
    if (!pendingStatus) return;
    if (["rejeitada"].includes(pendingStatus) && !statusComment.trim()) {
      setError("Observação é obrigatória para rejeição");
      return;
    }
    doTransition(pendingStatus, statusComment, returnDate);
  };

  const handleConfirmAcceptance = async () => {
    setUpdating(true);
    setError("");
    try {
      await confirmAcceptance(id, acceptDate, acceptNotes);
      setShowAcceptModal(false);
      setAcceptNotes("");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateOrder = () => {
    navigate(`${basePath}/orders/new?from_sample=${id}`);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    setError("");
    try {
      await addSampleComment(id, commentText);
      setCommentText("");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Excluir este comentário?")) return;
    try {
      await deleteSampleComment(id, commentId);
      load();
    } catch (e) { setError(e.message); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpdating(true);
    setError("");
    try {
      await uploadSamplePhoto(id, file);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
      e.target.value = "";
    }
  };

  if (!sample && !error) {
    return <DashboardLayout><div className="text-center text-secondary py-5">Carregando...</div></DashboardLayout>;
  }

  if (!sample) {
    return (
      <DashboardLayout>
        <div className="container-fluid px-4 py-4 flex-grow-1">
          <div className="alert alert-danger py-2 small">{error}</div>
        </div>
      </DashboardLayout>
    );
  }

  const transitions = validSampleTransitions[sample.status] || [];
  const acceptanceFormatted = sample.acceptance_at ? new Date(sample.acceptance_at).toLocaleDateString("pt-BR") : "";

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {/* Cabeçalho */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start mb-3 gap-3">
          <div className="d-flex align-items-center gap-3">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(`${basePath}/samples`)}>
              &larr; Voltar
            </button>
            <div>
              <h3 className="text-white mb-0">{sample.code}</h3>
              <p className="text-secondary mb-0 small">{sample.client_name}</p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className={`badge bg-${sampleStatusColors[sample.status]} fs-6 px-3 py-2`}>
              {sampleStatusLabels[sample.status]}
            </span>
          </div>
        </div>

        {/* Banner de aceite */}
        {sample.status === "aceite_recebido" && (
          <div className="alert alert-success py-3 mb-3 d-flex align-items-center gap-2">
            <i className="bi bi-check2-circle fs-4"></i>
            <div>
              <strong>Aceite recebido em {acceptanceFormatted}</strong>
              {sample.acceptance_notes && <div className="small">{sample.acceptance_notes}</div>}
            </div>
          </div>
        )}

        {/* Pedido gerado */}
        {sample.status === "pedido_gerado" && sample.linked_order_id && (
          <div className="card bg-dark border-info mb-3">
            <div className="card-body">
              <h6 className="text-info mb-1">Pedido gerado a partir desta amostra</h6>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                <div>
                  <div className="text-light">
                    <strong>{sample.linked_order_client_code}-{sample.linked_order_id}</strong>
                    <span className={`badge bg-secondary ms-2`}>{sample.linked_order_status}</span>
                  </div>
                  <div className="small text-secondary">
                    Criado em {new Date(sample.linked_order_created_at).toLocaleString("pt-BR")} — R$ {Number(sample.linked_order_total).toFixed(2)}
                  </div>
                </div>
                <button className="btn btn-outline-info" onClick={() => navigate(`${basePath}/orders/${sample.linked_order_id}`)}>
                  Abrir pedido →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CTA - confirmar aceite */}
        {sample.status === "aprovada" && (
          <div className="mb-3">
            <button className="btn btn-info" onClick={() => setShowAcceptModal(true)}>
              <i className="bi bi-check2-circle me-2"></i> Confirmar aceite do cliente
            </button>
          </div>
        )}

        {/* CTA - gerar pedido */}
        {sample.status === "aceite_recebido" && (
          <div className="mb-3">
            <button className="btn btn-success" onClick={handleGenerateOrder}>
              <i className="bi bi-clipboard-plus me-2"></i> Criar pedido com base no aceite
            </button>
          </div>
        )}

        {/* Transições disponíveis */}
        {transitions.length > 0 && (
          <div className="card bg-dark border-secondary mb-3">
            <div className="card-body">
              <h6 className="text-light mb-3">Próximas transições</h6>
              <div className="d-flex flex-wrap gap-2">
                {transitions.map((s) => (
                  <button key={s} className={`btn btn-sm btn-outline-${sampleStatusColors[s]}`}
                    disabled={updating} onClick={() => handleStatusClick(s)}>
                    → {sampleStatusLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Informações */}
        <div className="card bg-dark border-secondary mb-3">
          <div className="card-body">
            <h6 className="text-light mb-3">Informações</h6>
            <div className="row g-3 small">
              <div className="col-md-4">
                <div className="text-secondary">Cliente</div>
                <div className="text-light">{sample.client_name}{sample.client_cnpj && ` (${sample.client_cnpj})`}</div>
              </div>
              <div className="col-md-4">
                <div className="text-secondary">Data do envio</div>
                <div className="text-light">{new Date(sample.sent_at).toLocaleDateString("pt-BR")}</div>
              </div>
              <div className="col-md-4">
                <div className="text-secondary">Transportadora</div>
                <div className="text-light">{sample.carrier || "—"}</div>
              </div>
              <div className="col-md-4">
                <div className="text-secondary">Código de rastreio</div>
                <div className="text-light">{sample.tracking_code || "—"}</div>
              </div>
              <div className="col-md-4">
                <div className="text-secondary">Registrado por</div>
                <div className="text-light">{sample.created_by}</div>
              </div>
              <div className="col-md-4">
                <div className="text-secondary">Tipo</div>
                <div className="text-light">{leatherTypeLabels[sample.leather_type]}</div>
              </div>
              <div className="col-md-4">
                <div className="text-secondary">Espessura</div>
                <div className="text-light">{sample.thickness_mm ? `${sample.thickness_mm} mm` : "—"}</div>
              </div>
              <div className="col-md-4">
                <div className="text-secondary">Cor</div>
                <div className="text-light">{sample.color || "—"}</div>
              </div>
              <div className="col-md-4">
                <div className="text-secondary">Acabamento</div>
                <div className="text-light">{sample.finish || "—"}</div>
              </div>
              {sample.notes && (
                <div className="col-12">
                  <div className="text-secondary">Observações</div>
                  <div className="text-light" style={{ whiteSpace: "pre-wrap" }}>{sample.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fotos */}
        <div className="card bg-dark border-secondary mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="text-light mb-0">Fotos ({sample.photos?.length || 0}/5)</h6>
              {(sample.photos?.length || 0) < 5 && (
                <label className="btn btn-sm btn-outline-secondary mb-0">
                  + Adicionar foto
                  <input type="file" accept="image/jpeg,image/png" hidden onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
            {(!sample.photos || sample.photos.length === 0) ? (
              <p className="text-secondary small mb-0">Nenhuma foto enviada.</p>
            ) : (
              <div className="d-flex flex-wrap gap-2">
                {sample.photos.map((p) => (
                  <div key={p.id} role="button" onClick={() => setLightbox(photoUrls[p.id])}>
                    {photoUrls[p.id] ? (
                      <img src={photoUrls[p.id]} alt="foto" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                    ) : (
                      <div style={{ width: 120, height: 120, background: "#222", borderRadius: 6 }} className="d-flex align-items-center justify-content-center text-secondary small">...</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Atividade */}
        <div className="card bg-dark border-secondary mb-3">
          <div className="card-body">
            <h6 className="text-light mb-3">Atividade</h6>
            <form onSubmit={handleAddComment} className="mb-3">
              <textarea className="form-control bg-dark text-light border-secondary mb-2" rows="3"
                placeholder="Adicionar comentário..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
              <button type="submit" className="btn btn-primary btn-sm"
                disabled={submittingComment || !commentText.trim()}>
                {submittingComment ? "Enviando..." : "Comentar"}
              </button>
            </form>

            {(sample.comments || []).slice().reverse().map((c) => (
              <div key={c.id} className="mb-3 pb-3 border-bottom border-secondary">
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-light small fw-semibold">{c.user_name}</span>
                    {c.type === "status_change" ? (
                      <span className="badge bg-info" style={{ fontSize: "0.6rem" }}>sistema</span>
                    ) : (
                      <span className="badge bg-primary" style={{ fontSize: "0.6rem" }}>comentário</span>
                    )}
                  </div>
                  <span className="text-secondary" style={{ fontSize: "0.7rem" }}>
                    {new Date(c.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                {c.type === "status_change" && c.old_status && c.new_status && (
                  <div className="mb-1">
                    <span className={`badge bg-${sampleStatusColors[c.old_status] || "secondary"} me-1`} style={{ fontSize: "0.65rem" }}>
                      {sampleStatusLabels[c.old_status] || c.old_status}
                    </span>
                    <span className="text-secondary small">→</span>
                    <span className={`badge bg-${sampleStatusColors[c.new_status] || "secondary"} ms-1`} style={{ fontSize: "0.65rem" }}>
                      {sampleStatusLabels[c.new_status] || c.new_status}
                    </span>
                  </div>
                )}
                <div className="d-flex justify-content-between align-items-start">
                  <p className="text-light small mb-0" style={{ whiteSpace: "pre-wrap" }}>{c.content}</p>
                  {c.type === "comment" && (c.user_id === currentUserId || isAdmin) && (
                    <button className="btn btn-link btn-sm text-secondary p-0 ms-2"
                      style={{ fontSize: "0.7rem", textDecoration: "none" }}
                      onClick={() => handleDeleteComment(c.id)}>
                      excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal aceite */}
      {showAcceptModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={() => setShowAcceptModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content bg-dark border-secondary">
              <div className="modal-header border-secondary">
                <h6 className="modal-title text-white">Registrar Aceite do Cliente</h6>
                <button className="btn-close btn-close-white" onClick={() => setShowAcceptModal(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label text-light small">Data do aceite *</label>
                  <input type="date" className="form-control bg-dark text-light border-secondary" required
                    max={todayIso()} value={acceptDate} onChange={(e) => setAcceptDate(e.target.value)} />
                </div>
                <div className="mb-2">
                  <label className="form-label text-light small">Observação (opcional)</label>
                  <textarea className="form-control bg-dark text-light border-secondary" rows="3"
                    value={acceptNotes} onChange={(e) => setAcceptNotes(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer border-secondary">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowAcceptModal(false)} disabled={updating}>
                  Cancelar
                </button>
                <button className="btn btn-success btn-sm" onClick={handleConfirmAcceptance} disabled={updating}>
                  {updating ? "Registrando..." : "Confirmar aceite"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal retorno do cliente */}
      {pendingStatus && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={() => setPendingStatus(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content bg-dark border-secondary">
              <div className="modal-header border-secondary">
                <h6 className="modal-title text-white">Registrar Retorno do Cliente</h6>
                <button className="btn-close btn-close-white" onClick={() => setPendingStatus(null)} />
              </div>
              <div className="modal-body">
                <p className="text-secondary small mb-3">
                  A amostra será movida para "{sampleStatusLabels[pendingStatus]}".
                </p>
                <div className="mb-3">
                  <label className="form-label text-light small">Data do retorno</label>
                  <input type="date" className="form-control bg-dark text-light border-secondary"
                    max={todayIso()} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                </div>
                <div className="mb-2">
                  <label className="form-label text-light small">
                    Observação {pendingStatus === "rejeitada" ? "*" : "(opcional)"}
                  </label>
                  <textarea className="form-control bg-dark text-light border-secondary" rows="3"
                    placeholder={pendingStatus === "rejeitada" ? "Motivo da rejeição (obrigatório)" : "Observações"}
                    value={statusComment} onChange={(e) => setStatusComment(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer border-secondary">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setPendingStatus(null)} disabled={updating}>
                  Cancelar
                </button>
                <button className={`btn btn-sm btn-${sampleStatusColors[pendingStatus]}`}
                  onClick={confirmReturnTransition} disabled={updating}>
                  {updating ? "Atualizando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.85)" }} onClick={() => setLightbox(null)}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <img src={lightbox} alt="" style={{ width: "100%", maxHeight: "80vh", objectFit: "contain" }} />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
