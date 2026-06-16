import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listClients, deleteClient } from "../services/clientService";
import DashboardLayout from "../components/DashboardLayout";
import ConfirmModal from "../components/ConfirmModal";
import LoadingSpinner from "../components/LoadingSpinner";
import { useBasePath } from "../hooks/useBasePath";

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: null });
  const navigate = useNavigate();
  const basePath = useBasePath();
  const isAdmin = localStorage.getItem("role") === "admin";

  const loadClients = () => {
    setLoading(true);
    listClients()
      .then(setClients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadClients(); }, []);

  const handleDelete = (id, name) => {
    setConfirmModal({
      show: true,
      title: "Excluir cliente",
      message: `Deseja realmente excluir "${name}"?`,
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, show: false }));
        try {
          await deleteClient(id);
          loadClients();
        } catch (e) {
          setError(e.message);
        }
      },
    });
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.emails && c.emails.toLowerCase().includes(search.toLowerCase())) ||
      (c.cnpj && c.cnpj.includes(search))
  );

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        <div className="module-header">
          <h3 className="module-title">Módulo de Clientes</h3>
          <p className="module-subtitle">Gerenciamento de clientes</p>
        </div>
        <div className="d-flex justify-content-end mb-3">
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`${basePath}/clients/new`)}>
            + Novo cliente
          </button>
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <input
          type="text"
          className="form-control bg-dark text-light border-secondary mb-3"
          placeholder="Buscar por nome, email ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr className="text-secondary small">
                <th>Nome</th>
                <th>Código</th>
                <th className="d-none d-md-table-cell">CNPJ</th>
                <th className="d-none d-md-table-cell">Email(s)</th>
                <th className="d-none d-md-table-cell">Telefone</th>
                <th className="d-none d-lg-table-cell">Cidade/UF</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="7"><LoadingSpinner label="Carregando clientes..." /></td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan="7" className="text-center text-secondary py-4">Nenhum cliente encontrado</td></tr>
              )}
              {!loading && filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td><span className="badge bg-secondary">{c.code || "—"}</span></td>
                  <td className="d-none d-md-table-cell">{c.cnpj || "—"}</td>
                  <td className="d-none d-md-table-cell">{c.emails || "—"}</td>
                  <td className="d-none d-md-table-cell">{c.phone || "—"}</td>
                  <td className="d-none d-lg-table-cell">{c.city && c.state ? `${c.city}/${c.state}` : "—"}</td>
                  <td className="text-end text-nowrap">
                    <button className="btn btn-outline-info btn-sm me-1" onClick={() => navigate(`${basePath}/clients/${c.id}/history`)}>
                      Histórico
                    </button>
                    <button className="btn btn-outline-light btn-sm me-1" onClick={() => navigate(`${basePath}/clients/${c.id}/edit`)}>
                      Editar
                    </button>
                    {isAdmin && (
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(c.id, c.name)}>
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel="Excluir"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((m) => ({ ...m, show: false }))}
      />
    </DashboardLayout>
  );
}
