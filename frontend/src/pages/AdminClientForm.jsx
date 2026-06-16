import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getClientById, createClient, updateClient } from "../services/clientService";
import DashboardLayout from "../components/DashboardLayout";
import { useBasePath } from "../hooks/useBasePath";

export default function AdminClientForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const basePath = useBasePath();

  const [form, setForm] = useState({ name: "", code: "", cnpj: "", phone: "", address: "", city: "", state: "" });
  const [emails, setEmails] = useState([""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      getClientById(id)
        .then((data) => {
          setForm({
            name: data.name || "",
            code: data.code || "",
            cnpj: data.cnpj || "",
            phone: data.phone || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
          });
          setEmails(data.emails_list && data.emails_list.length > 0 ? data.emails_list : [""]);
        })
        .catch((e) => setError(e.message));
    }
  }, [id, isEditing]);

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
      if (isEditing) await updateClient(id, payload);
      else await createClient(payload);
      navigate(`${basePath}/clients`);
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
                  <h3 className="module-title">{isEditing ? "Editar Cliente" : "Novo Cliente"}</h3>
                  <p className="module-subtitle">{isEditing ? "Atualização de dados do cliente" : "Cadastro de novo cliente"}</p>
                </div>
                {error && <div className="alert alert-danger py-2 small">{error}</div>}

                <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
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
                  <div className="row mb-4">
                    <div className="col-8">
                      <label className="form-label text-light small">Cidade</label>
                      <input name="city" type="text" className="form-control bg-dark text-light border-secondary" value={form.city} onChange={handleChange} />
                    </div>
                    <div className="col-4">
                      <label className="form-label text-light small">UF</label>
                      <input name="state" type="text" className="form-control bg-dark text-light border-secondary" maxLength="2" value={form.state} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(`${basePath}/clients`)}>Cancelar</button>
                  </div>
                </form>
      </div>
    </DashboardLayout>
  );
}
