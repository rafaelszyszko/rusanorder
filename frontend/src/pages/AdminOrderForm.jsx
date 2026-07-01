import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createOrder, updateOrder, getOrderById } from "../services/orderService";
import { listClients, createClient } from "../services/clientService";
import { getSamplePrefill } from "../services/sampleService";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { useBasePath } from "../hooks/useBasePath";

const UNIT_OPTIONS = ["m²", "un", "kg", "m", "pc"];

function NewClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", code: "", cnpj: "", phone: "", address: "", city: "", state: "" });
  const [emails, setEmails] = useState([""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleEmailChange = (index, value) => {
    const updated = [...emails];
    updated[index] = value;
    setEmails(updated);
  };

  const addEmail = () => setEmails([...emails, ""]);
  const removeEmail = (index) => setEmails(emails.filter((_, i) => i !== index));

  const formatCnpj = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  const handleCnpjChange = (e) => {
    setForm({ ...form, cnpj: formatCnpj(e.target.value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { ...form, emails: emails.filter((e) => e.trim()) };
      const result = await createClient(payload);
      onCreated(result.id, form.name);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content bg-dark border-secondary">
          <div className="modal-header border-secondary" style={{ background: "var(--header-bg)" }}>
            <h6 className="modal-title text-white">Novo Cliente</h6>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>
          <div className="modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="row mb-3">
                <div className="col-md-8">
                  <label className="form-label text-light small">Nome *</label>
                  <input name="name" type="text" className="form-control bg-dark text-light border-secondary" value={form.name} onChange={handleChange} required />
                </div>
                <div className="col-md-4 mt-3 mt-md-0">
                  <label className="form-label text-light small">Código *</label>
                  <input name="code" type="text" className="form-control bg-dark text-light border-secondary text-uppercase" placeholder="Ex: WIRTH" value={form.code} onChange={handleChange} required maxLength="20" />
                  <div className="form-text text-secondary" style={{ fontSize: "0.7rem" }}>Prefixo dos pedidos</div>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label text-light small">CNPJ</label>
                <input name="cnpj" type="text" className="form-control bg-dark text-light border-secondary" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={handleCnpjChange} maxLength="18" />
              </div>
              <div className="mb-3">
                <label className="form-label text-light small">Emails</label>
                {emails.map((email, i) => (
                  <div key={i} className="d-flex gap-2 mb-2">
                    <input
                      type="email"
                      className="form-control bg-dark text-light border-secondary"
                      placeholder="email@exemplo.com"
                      value={email}
                      onChange={(e) => handleEmailChange(i, e.target.value)}
                    />
                    {emails.length > 1 && (
                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeEmail(i)}>X</button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={addEmail}>+ Adicionar email</button>
              </div>
              <div className="mb-3">
                <label className="form-label text-light small">Telefone</label>
                <input name="phone" type="text" className="form-control bg-dark text-light border-secondary" value={form.phone} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <label className="form-label text-light small">Endereço</label>
                <input name="address" type="text" className="form-control bg-dark text-light border-secondary" value={form.address} onChange={handleChange} />
              </div>
              <div className="row mb-3">
                <div className="col-8">
                  <label className="form-label text-light small">Cidade</label>
                  <input name="city" type="text" className="form-control bg-dark text-light border-secondary" value={form.city} onChange={handleChange} />
                </div>
                <div className="col-4">
                  <label className="form-label text-light small">UF</label>
                  <input name="state" type="text" className="form-control bg-dark text-light border-secondary" maxLength="2" value={form.state} onChange={handleChange} />
                </div>
              </div>
              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Salvando..." : "Criar cliente"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrderForm() {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const fromSampleId = searchParams.get("from_sample");

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ description: "", unit: "m²", quantity: 1, unit_price: 0 }]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [sampleInfo, setSampleInfo] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(isEdit);
  const [editingOrderStatus, setEditingOrderStatus] = useState(null);

  const loadClients = () => {
    listClients().then(setClients).catch(() => {});
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Modo edição: carregar pedido existente
  useEffect(() => {
    if (!isEdit) return;
    setLoadingOrder(true);
    getOrderById(id)
      .then((o) => {
        setClientId(String(o.client_id));
        setPurchaseOrder(o.purchase_order || "");
        setNotes(o.notes || "");
        setItems(
          (o.items || []).map((it) => ({
            description: it.description,
            unit: it.unit || "m²",
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
          }))
        );
        setEditingOrderStatus(o.status);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingOrder(false));
  }, [id, isEdit]);

  // Pré-preenchimento via amostra (RF9.12)
  useEffect(() => {
    if (isEdit || !fromSampleId) return;
    getSamplePrefill(fromSampleId)
      .then((data) => {
        setSampleInfo(data);
        setClientId(String(data.client_id));
        setNotes(data.notes || "");
        setItems([
          { description: data.first_item_description || "", unit: data.first_item_unit || "m²", quantity: 1, unit_price: 0 },
        ]);
      })
      .catch((e) => setError(e.message));
  }, [fromSampleId, isEdit]);

  const handleClientCreated = (newClientId, newClientName) => {
    setShowNewClient(false);
    loadClients();
    setClientId(String(newClientId));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItem = () => setItems([...items, { description: "", unit: "m²", quantity: 1, unit_price: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!clientId) return setError("Selecione um cliente");
    const validItems = items.filter((i) => i.description.trim() && i.quantity > 0);
    if (validItems.length === 0) return setError("Adicione pelo menos um item");

    setLoading(true);
    try {
      const payload = {
        purchase_order: purchaseOrder.trim() || null,
        notes,
        items: validItems.map((i) => ({
          description: i.description.trim(),
          unit: i.unit,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
      };

      if (isEdit) {
        await updateOrder(id, payload);
        navigate(`${basePath}/orders/${id}`);
      } else {
        payload.client_id = Number(clientId);
        if (sampleInfo?.sample_id) payload.sample_id = sampleInfo.sample_id;
        const created = await createOrder(payload);
        if (sampleInfo?.sample_id && created.id) {
          navigate(`${basePath}/orders/${created.id}`);
        } else {
          navigate(`${basePath}/orders`);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1 page-form-centered">
                <div className="module-header">
                  <h3 className="module-title">{isEdit ? "Editar pedido" : "Novo Pedido"}</h3>
                  <p className="module-subtitle">{isEdit ? "Edição dos dados do pedido" : "Cadastro de novo pedido"}</p>
                </div>
                {isEdit && editingOrderStatus && !["novo", "ajuste_necessario"].includes(editingOrderStatus) && (
                  <div className="alert alert-warning py-2 small mb-3">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Este pedido já está em <strong>{editingOrderStatus.replace(/_/g, " ")}</strong>. Edite com cautela — alterações em itens podem divergir do que foi enviado ou produzido.
                  </div>
                )}
                {sampleInfo && !isEdit && (
                  <div className="alert alert-info py-2 small mb-3">
                    <i className="bi bi-box-seam me-2"></i>
                    Gerando pedido a partir da amostra. Cliente e primeiro item já foram pré-preenchidos.
                    Ajuste quantidade e preço antes de salvar.
                  </div>
                )}
                {error && <div className="alert alert-danger py-2 small">{error}</div>}
                {isEdit && loadingOrder && <LoadingSpinner label="Carregando pedido..." />}

                <form onSubmit={handleSubmit} style={{ maxWidth: 700 }}>
                  <div className="row mb-3">
                    <div className="col-md-7">
                      <label className="form-label text-light small">Cliente *</label>
                      <div className="d-flex gap-2">
                        <select
                          className="form-select bg-dark text-light border-secondary"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          required
                          disabled={isEdit}
                          title={isEdit ? "Cliente não pode ser alterado na edição" : ""}
                        >
                          <option value="">Selecione...</option>
                          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {!isEdit && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary text-nowrap"
                            onClick={() => setShowNewClient(true)}
                            title="Cadastrar novo cliente"
                          >
                            + Novo
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="col-md-5 mt-3 mt-md-0">
                      <label className="form-label text-light small">Ordem de Compra do Cliente</label>
                      <input type="text" className="form-control bg-dark text-light border-secondary" placeholder="Ex: OC-2026-001" value={purchaseOrder} onChange={(e) => setPurchaseOrder(e.target.value)} />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-light small">Observações</label>
                    <textarea className="form-control bg-dark text-light border-secondary" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>

                  <label className="form-label text-light small">Itens *</label>
                  {items.map((item, i) => (
                    <div key={i} className="row g-2 mb-2 align-items-end">
                      <div className="col-12 col-md-4">
                        <input
                          type="text"
                          className="form-control form-control-sm bg-dark text-light border-secondary"
                          placeholder="Descrição do produto..."
                          value={item.description}
                          onChange={(e) => handleItemChange(i, "description", e.target.value)}
                        />
                      </div>
                      <div className="col-3 col-md-1">
                        <select
                          className="form-select form-select-sm bg-dark text-light border-secondary"
                          value={item.unit}
                          onChange={(e) => handleItemChange(i, "unit", e.target.value)}
                        >
                          {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="col-3 col-md-2">
                        <input type="number" min="0.01" step="0.01" className="form-control form-control-sm bg-dark text-light border-secondary" placeholder="Qtd" value={item.quantity} onChange={(e) => handleItemChange(i, "quantity", Number(e.target.value))} />
                      </div>
                      <div className="col-3 col-md-2">
                        <input type="number" min="0" step="0.01" className="form-control form-control-sm bg-dark text-light border-secondary" placeholder="Preço" value={item.unit_price} onChange={(e) => handleItemChange(i, "unit_price", Number(e.target.value))} />
                      </div>
                      <div className="col-2 col-md-1 text-end">
                        <span className="text-secondary small">R$ {(item.quantity * item.unit_price).toFixed(2)}</span>
                      </div>
                      <div className="col-1 col-md-2">
                        {items.length > 1 && (
                          <button type="button" className="btn btn-outline-danger btn-sm w-100" onClick={() => removeItem(i)}>X</button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button type="button" className="btn btn-outline-secondary btn-sm mb-3" onClick={addItem}>+ Adicionar item</button>

                  <div className="border-top border-secondary pt-3 mb-4">
                    <div className="d-flex justify-content-between text-white">
                      <span className="fw-semibold">Total:</span>
                      <span className="fw-bold fs-5">R$ {total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={loading || loadingOrder}>
                      {loading ? (isEdit ? "Salvando..." : "Criando...") : (isEdit ? "Salvar alterações" : "Criar pedido")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => navigate(isEdit ? `${basePath}/orders/${id}` : `${basePath}/orders`)}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
      </div>

      {showNewClient && (
        <NewClientModal
          onClose={() => setShowNewClient(false)}
          onCreated={handleClientCreated}
        />
      )}
    </DashboardLayout>
  );
}
