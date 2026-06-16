import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrderById, updateOrderStatus, deleteOrder, addComment, deleteComment } from "../services/orderService";
import { getImportByOrder, getPdfBlobUrl } from "../services/importService";
import { getPhotoBlobUrl } from "../services/sampleService";
import DashboardLayout from "../components/DashboardLayout";
import ConfirmModal from "../components/ConfirmModal";
import OrderFlowchart from "../components/OrderFlowchart";
import { useBasePath } from "../hooks/useBasePath";

import { statusLabels, statusColors, validTransitions } from "../constants/orderStatus";
import { formatOrderId } from "../utils/formatOrderId";

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const currentUserId = Number(localStorage.getItem("userId"));
  const isAdmin = localStorage.getItem("role") === "admin";
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showFlow, setShowFlow] = useState(false);
  const [showDeleteBtn, setShowDeleteBtn] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Status dropdown
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusComment, setStatusComment] = useState("");
  const [pendingStatus, setPendingStatus] = useState(null);
  const statusRef = useRef(null);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: null });

  // Comments
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentFilter, setCommentFilter] = useState("all"); // "all" | "comment" | "status_change"
  const [commentSort, setCommentSort] = useState("desc"); // "desc" (newest first) | "asc" (oldest first)

  // Linked PDF import (RF07.8 — Documento original)
  const [linkedImport, setLinkedImport] = useState(null);

  // Sample origin thumbnail (RF9.13)
  const [sampleThumb, setSampleThumb] = useState(null);

  const load = () => {
    getOrderById(id).then(setOrder).catch((e) => setError(e.message));
    getImportByOrder(id).then(setLinkedImport).catch(() => setLinkedImport(null));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (order?.sample_first_photo_id && !sampleThumb) {
      getPhotoBlobUrl(order.sample_first_photo_id).then(setSampleThumb).catch(() => setSampleThumb(null));
    }
  }, [order?.sample_first_photo_id]);

  const handleOpenOriginalPdf = async () => {
    if (!linkedImport) return;
    try {
      const url = await getPdfBlobUrl(linkedImport.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e.message);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isReopen = (newStatus) => newStatus === "novo" && ["cancelado", "entregue", "entregue_divergencia", "recusado_pcp"].includes(order?.status);

  const handleStatusSelect = (newStatus) => {
    setStatusOpen(false);
    if (newStatus === "cancelado" || isReopen(newStatus)) {
      setPendingStatus(newStatus);
      setStatusComment("");
      return;
    }
    doTransition(newStatus, "");
  };

  const confirmTransition = () => {
    if (!pendingStatus) return;
    doTransition(pendingStatus, statusComment);
    setPendingStatus(null);
    setStatusComment("");
  };

  const doTransition = async (newStatus, comment) => {
    setUpdating(true);
    setError("");
    try {
      await updateOrderStatus(id, newStatus, comment);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await deleteOrder(id);
      navigate(`${basePath}/orders`);
    } catch (e) {
      setError(e.message);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    setError("");
    try {
      await addComment(id, commentText);
      setCommentText("");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    setConfirmModal({
      show: true,
      title: "Excluir comentário",
      message: "Excluir este comentário?",
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, show: false }));
        setError("");
        try {
          await deleteComment(id, commentId);
          load();
        } catch (e) {
          setError(e.message);
        }
      },
    });
  };

  if (!order && !error) return <DashboardLayout><div className="text-center text-secondary py-5">Carregando...</div></DashboardLayout>;

  const transitions = order ? (validTransitions[order.status] || []) : [];
  const orderId = order ? formatOrderId(order.client_code, order.id) : "";

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        {order && (
          <>
            {/* Bloco Origem (RF9.13) */}
            {order.sample_id && (
              <div className="card bg-dark border-warning mb-3">
                <div className="card-body py-3">
                  <div className="d-flex align-items-center gap-3">
                    {sampleThumb ? (
                      <img src={sampleThumb} alt="amostra"
                        role="button" onClick={() => navigate(`${basePath}/samples/${order.sample_id}`)}
                        style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} />
                    ) : (
                      <i className="bi bi-box-seam text-warning fs-3"></i>
                    )}
                    <div className="flex-grow-1">
                      <div className="text-warning small">Origem</div>
                      <div className="text-light">
                        Originado da amostra <strong>{order.sample_code || `AM-${order.sample_id}`}</strong>
                      </div>
                      {order.sample_acceptance_at && (
                        <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                          Aceite recebido em {new Date(order.sample_acceptance_at).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </div>
                    <button className="btn btn-sm btn-outline-warning"
                      onClick={() => navigate(`${basePath}/samples/${order.sample_id}`)}>
                      Ver amostra →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start mb-4 gap-3">
              <div className="d-flex align-items-center gap-3">
                <button
                  className="btn btn-outline-secondary d-flex align-items-center gap-2"
                  onClick={() => navigate(`${basePath}/orders`)}
                >
                  <span>&larr;</span> Voltar
                </button>
                <div>
                  <h4 className="text-white mb-0">Pedido {orderId}</h4>
                  <p className="text-secondary mb-0 small">
                    Criado em {new Date(order.created_at).toLocaleString("pt-BR")} por {order.created_by}
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-start gap-2">
                {/* Status dropdown - Jira style */}
                <div ref={statusRef} style={{ position: "relative", minWidth: 240 }}>
                  <button
                    className={`btn bg-${statusColors[order.status]} text-white w-100 d-flex justify-content-between align-items-center`}
                    style={{ fontWeight: 600, padding: "10px 16px" }}
                    onClick={() => transitions.length > 0 && setStatusOpen(!statusOpen)}
                    disabled={updating}
                  >
                    <span>{statusLabels[order.status]}</span>
                    {transitions.length > 0 && (
                      <span style={{ fontSize: "0.7rem", marginLeft: 8 }}>{statusOpen ? "\u25B2" : "\u25BC"}</span>
                    )}
                  </button>
                  {statusOpen && (
                    <div
                      className="position-absolute w-100 mt-1 rounded shadow"
                      style={{ backgroundColor: "var(--dropdown-bg)", border: "1px solid var(--dropdown-border)", zIndex: 1050 }}
                    >
                      {transitions.map((s) => (
                        <button
                          key={s}
                          className="btn btn-link text-start w-100 text-decoration-none px-3 py-2 d-flex align-items-center gap-2"
                          style={{ color: "var(--dropdown-text)", fontSize: "0.85rem" }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = "var(--dropdown-hover)"}
                          onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                          onClick={() => handleStatusSelect(s)}
                        >
                          <span className={`badge bg-${statusColors[s]}`} style={{ width: 10, height: 10, padding: 0, borderRadius: "50%" }} />
                          {statusLabels[s]}
                          {s === "novo" && isReopen(s) && <span className="text-secondary ms-auto" style={{ fontSize: "0.7rem" }}>reabrir</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Flowchart toggle button */}
                <button
                  className="btn btn-outline-secondary d-flex align-items-center gap-1"
                  style={{ padding: "10px 16px" }}
                  onClick={() => setShowFlow(true)}
                >
                  Ver fluxo
                </button>
              </div>
            </div>

            {/* Delete */}
            <div className="d-flex align-items-center gap-2 mb-4">
              {!showDeleteBtn ? (
                <button
                  className="btn btn-sm text-secondary"
                  style={{ fontSize: "0.75rem", textDecoration: "underline", background: "none", border: "none" }}
                  onClick={() => setShowDeleteBtn(true)}
                >
                  Excluir pedido
                </button>
              ) : (
                <>
                  <span className="text-danger small">Tem certeza?</span>
                  <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteModal(true)}>Sim, excluir</button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowDeleteBtn(false)}>Não</button>
                </>
              )}
            </div>

            {/* Order info */}
            <div className="border-bottom border-secondary pb-4 mb-4">
              <div className="row g-3">
                <div className="col-sm-4">
                  <div className="text-secondary small">Cliente</div>
                  <div className="text-white">{order.client_name}</div>
                </div>
                <div className="col-sm-4">
                  <div className="text-secondary small">Total</div>
                  <div className="text-white fw-bold fs-5">R$ {parseFloat(order.total).toFixed(2)}</div>
                </div>
                {order.purchase_order && (
                  <div className="col-sm-4">
                    <div className="text-secondary small">Ordem de Compra</div>
                    <div className="text-white">{order.purchase_order}</div>
                  </div>
                )}
                {order.notes && (
                  <div className="col-sm-12 mt-2">
                    <div className="text-secondary small">Observações</div>
                    <div className="text-white">{order.notes}</div>
                  </div>
                )}
                {linkedImport && (
                  <div className="col-sm-12 mt-2">
                    <div className="text-secondary small">Documento original</div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-info"
                      onClick={handleOpenOriginalPdf}
                      title={linkedImport.filename}
                    >
                      <i className="bi bi-file-earmark-pdf me-2"></i>
                      {linkedImport.filename}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <h6 className="text-light mb-3">Itens</h6>
              <div className="table-responsive">
                <table className="table table-dark table-sm align-middle mb-0">
                  <thead>
                    <tr className="text-secondary small">
                      <th>Descrição</th>
                      <th>Qtd</th>
                      <th>Unid.</th>
                      <th>Preço unit.</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit || "m²"}</td>
                        <td>R$ {parseFloat(item.unit_price).toFixed(2)}</td>
                        <td>R$ {parseFloat(item.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity / Comments */}
            <div className="border-top border-secondary pt-4 mb-4">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 gap-2">
                <h6 className="text-light mb-0">Atividade</h6>
                <div className="d-flex align-items-center gap-2">
                  {/* Filter buttons */}
                  <div className="btn-group btn-group-sm">
                    <button
                      className={`btn ${commentFilter === "all" ? "btn-secondary" : "btn-outline-secondary"}`}
                      onClick={() => setCommentFilter("all")}
                    >
                      Todos
                    </button>
                    <button
                      className={`btn ${commentFilter === "comment" ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setCommentFilter("comment")}
                    >
                      Comentários
                    </button>
                    <button
                      className={`btn ${commentFilter === "status_change" ? "btn-info" : "btn-outline-secondary"}`}
                      onClick={() => setCommentFilter("status_change")}
                    >
                      Sistema
                    </button>
                  </div>
                  {/* Sort button */}
                  <button
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                    onClick={() => setCommentSort((s) => s === "desc" ? "asc" : "desc")}
                    title={commentSort === "desc" ? "Mais recentes primeiro" : "Mais antigos primeiro"}
                  >
                    Data {commentSort === "desc" ? "\u25BC" : "\u25B2"}
                  </button>
                </div>
              </div>

              {/* Comment form */}
              <form onSubmit={handleAddComment} className="mb-4">
                <textarea
                  className="form-control bg-dark text-light border-secondary mb-2"
                  rows="4"
                  placeholder="Adicionar comentário..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingComment || !commentText.trim()}>
                  {submittingComment ? "Enviando..." : "Comentar"}
                </button>
              </form>

              {/* Comments list */}
              <div>
                {(() => {
                  const comments = order.comments || [];
                  const filtered = commentFilter === "all" ? comments : comments.filter((c) => c.type === commentFilter);
                  const sorted = [...filtered].sort((a, b) => {
                    const da = new Date(a.created_at).getTime();
                    const db = new Date(b.created_at).getTime();
                    return commentSort === "desc" ? db - da : da - db;
                  });

                  if (sorted.length === 0) {
                    return <p className="text-secondary small">Nenhuma atividade {commentFilter !== "all" ? "nesta categoria" : "ainda"}.</p>;
                  }

                  return sorted.map((c) => (
                    <div key={c.id} className="mb-3 pb-3 border-bottom border-secondary">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span className="text-white small fw-semibold">{c.user_name}</span>
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
                          <span className={`badge bg-${statusColors[c.old_status]} me-1`} style={{ fontSize: "0.65rem" }}>
                            {statusLabels[c.old_status]}
                          </span>
                          <span className="text-secondary small">&rarr;</span>
                          <span className={`badge bg-${statusColors[c.new_status]} ms-1`} style={{ fontSize: "0.65rem" }}>
                            {statusLabels[c.new_status]}
                          </span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between align-items-start">
                        <p className="text-light small mb-0" style={{ whiteSpace: "pre-wrap" }}>{c.content}</p>
                        {c.type === "comment" && (c.user_id === currentUserId || isAdmin) && (
                          <button
                            className="btn btn-link btn-sm text-secondary p-0 ms-2"
                            style={{ fontSize: "0.7rem", textDecoration: "none", whiteSpace: "nowrap" }}
                            onClick={() => handleDeleteComment(c.id)}
                            title="Excluir comentário"
                          >
                            excluir
                          </button>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </>
        )}
      </div>

      {/* Status change confirmation modal (for reopen / cancel) */}
      {pendingStatus && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={() => setPendingStatus(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content bg-dark border-secondary">
              <div className="modal-header border-secondary">
                <h6 className="modal-title text-white">
                  {isReopen(pendingStatus) ? "Reabrir pedido" : `Mover para ${statusLabels[pendingStatus]}`}
                </h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setPendingStatus(null)} />
              </div>
              <div className="modal-body">
                <p className="text-secondary small mb-3">
                  {isReopen(pendingStatus)
                    ? `O pedido será reaberto (status "${statusLabels[order.status]}" voltará para "Novo"). Deseja continuar?`
                    : `O pedido será movido para "${statusLabels[pendingStatus]}". Deseja continuar?`
                  }
                </p>
                <label className="form-label text-light small">Comentário (opcional)</label>
                <textarea
                  className="form-control bg-dark text-light border-secondary"
                  rows="3"
                  placeholder="Motivo da mudança..."
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                />
              </div>
              <div className="modal-footer border-secondary">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setPendingStatus(null)} disabled={updating}>
                  Cancelar
                </button>
                <button
                  className={`btn btn-sm ${isReopen(pendingStatus) ? "btn-primary" : "btn-danger"}`}
                  onClick={confirmTransition}
                  disabled={updating}
                >
                  {updating ? "Atualizando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flowchart popup modal */}
      {showFlow && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={() => setShowFlow(false)}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div
              className="modal-content border-secondary"
              style={{
                background: "var(--bg)",
                backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            >
              <div className="modal-header border-secondary" style={{ background: "var(--header-bg)" }}>
                <h6 className="modal-title text-white">Fluxo do pedido</h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowFlow(false)} />
              </div>
              <div className="modal-body d-flex justify-content-center py-4" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                <OrderFlowchart currentStatus={order.status} />
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel="Excluir"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((m) => ({ ...m, show: false }))}
      />

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog modal-dialog-centered modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content bg-dark border-danger">
              <div className="modal-header border-secondary">
                <h6 className="modal-title text-danger">Confirmar exclusão</h6>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)} />
              </div>
              <div className="modal-body">
                <p className="text-white small mb-2">
                  Mover o pedido <strong>{orderId}</strong> para a lixeira?
                </p>
                <p className="text-secondary small mb-0">
                  O pedido poderá ser restaurado posteriormente pela lixeira.
                </p>
              </div>
              <div className="modal-footer border-secondary">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                  Cancelar
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Movendo..." : "Mover para lixeira"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
