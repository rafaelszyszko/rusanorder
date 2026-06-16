import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listUsers, listDeletedUsers, deleteUser, restoreUser, getUserOrders } from "../services/adminService";
import DashboardLayout from "../components/DashboardLayout";
import ConfirmModal from "../components/ConfirmModal";
import LoadingSpinner from "../components/LoadingSpinner";
import { statusLabels, statusColors } from "../constants/orderStatus";
import { formatOrderId } from "../utils/formatOrderId";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", variant: "danger", confirmLabel: "Confirmar", onConfirm: null });
  const navigate = useNavigate();

  const loadUsers = () => {
    setLoading(true);
    listUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const loadInactive = () => {
    listDeletedUsers().then(setInactiveUsers).catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadUsers();
    loadInactive();
  }, []);

  const handleDelete = (id, name) => {
    setConfirmModal({
      show: true,
      title: "Desativar usuário",
      message: `Deseja realmente desativar "${name}"?\n\nO usuário será marcado como inativo e poderá ser restaurado depois.`,
      variant: "danger",
      confirmLabel: "Desativar",
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, show: false }));
        try {
          await deleteUser(id);
          loadUsers();
          loadInactive();
        } catch (err) {
          setError(err.message);
        }
      },
    });
  };

  const handleRestore = (id, name) => {
    setConfirmModal({
      show: true,
      title: "Restaurar usuário",
      message: `Restaurar "${name}"?`,
      variant: "success",
      confirmLabel: "Restaurar",
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, show: false }));
        try {
          await restoreUser(id);
          loadUsers();
          loadInactive();
        } catch (err) {
          setError(err.message);
        }
      },
    });
  };

  const toggleOrders = async (userId) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      setUserOrders([]);
      return;
    }
    setExpandedUser(userId);
    setLoadingOrders(true);
    try {
      const orders = await getUserOrders(userId);
      setUserOrders(orders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  const displayList = showInactive ? inactiveUsers : users;

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        <div className="module-header">
          <h3 className="module-title">Módulo de Usuários</h3>
          <p className="module-subtitle">Gerenciamento de usuários</p>
        </div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <button
              className={`btn btn-sm ${!showInactive ? "btn-secondary" : "btn-outline-secondary"}`}
              onClick={() => setShowInactive(false)}
            >
              Ativos ({users.length})
            </button>
            <button
              className={`btn btn-sm ${showInactive ? "btn-secondary" : "btn-outline-secondary"}`}
              onClick={() => setShowInactive(true)}
            >
              Inativos ({inactiveUsers.length})
            </button>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate("/admin/users/new")}
          >
            + Novo usuário
          </button>
        </div>

        {error && (
          <div className="alert alert-danger py-2 small">{error}</div>
        )}

        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr className="text-secondary small">
                <th>ID</th>
                <th>Nome</th>
                <th>Email</th>
                <th>Role</th>
                <th className="text-center">Pedidos</th>
                <th className="text-center">Comentários</th>
                {showInactive && <th>Desativado em</th>}
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && !showInactive && (
                <tr>
                  <td colSpan={7}>
                    <LoadingSpinner label="Carregando usuários..." />
                  </td>
                </tr>
              )}
              {(!loading || showInactive) && displayList.length === 0 && (
                <tr>
                  <td colSpan={showInactive ? 8 : 7} className="text-center text-secondary py-4">
                    {showInactive ? "Nenhum usuário inativo" : "Nenhum usuário encontrado"}
                  </td>
                </tr>
              )}
              {(!loading || showInactive) && displayList.map((u) => (
                <>
                  <tr key={u.id} style={showInactive ? { opacity: 0.7 } : {}}>
                    <td>{u.id}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {u.name}
                        {showInactive && (
                          <span className="badge bg-danger" style={{ fontSize: "0.6rem" }}>inativo</span>
                        )}
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === "admin" ? "bg-primary" : "bg-secondary"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="text-center">
                      {u.order_count > 0 ? (
                        <button
                          className="btn btn-link btn-sm p-0 text-decoration-none"
                          style={{ color: "var(--accent)", fontSize: "0.85rem" }}
                          onClick={() => toggleOrders(u.id)}
                          title="Ver pedidos deste usuário"
                        >
                          {u.order_count} {expandedUser === u.id ? "\u25B2" : "\u25BC"}
                        </button>
                      ) : (
                        <span className="text-secondary small">0</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className="text-secondary small">{u.comment_count}</span>
                    </td>
                    {showInactive && (
                      <td className="small">
                        {u.deleted_at ? new Date(u.deleted_at).toLocaleString("pt-BR") : "-"}
                      </td>
                    )}
                    <td className="text-end text-nowrap">
                      {showInactive ? (
                        <button
                          className="btn btn-outline-success btn-sm"
                          onClick={() => handleRestore(u.id, u.name)}
                        >
                          Restaurar
                        </button>
                      ) : (
                        <>
                          <button
                            className="btn btn-outline-light btn-sm me-2"
                            onClick={() => navigate(`/admin/users/${u.id}/edit`)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDelete(u.id, u.name)}
                          >
                            Desativar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {expandedUser === u.id && (
                    <tr key={`orders-${u.id}`}>
                      <td colSpan={showInactive ? 8 : 7} style={{ background: "var(--bg-elevated)", padding: 0 }}>
                        <div className="p-3">
                          <h6 className="text-light small mb-2">
                            Pedidos de {u.name}
                          </h6>
                          {loadingOrders ? (
                            <LoadingSpinner label="Carregando pedidos..." padding="py-3" small />
                          ) : userOrders.length === 0 ? (
                            <p className="text-secondary small mb-0">Nenhum pedido encontrado.</p>
                          ) : (
                            <table className="table table-dark table-sm align-middle mb-0" style={{ fontSize: "0.82rem" }}>
                              <thead>
                                <tr className="text-secondary">
                                  <th>Pedido</th>
                                  <th>Cliente</th>
                                  <th>Status</th>
                                  <th>Total</th>
                                  <th>Data</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {userOrders.map((o) => (
                                  <tr key={o.id} style={o.deleted_at ? { opacity: 0.5 } : {}}>
                                    <td>
                                      {formatOrderId(o.client_code, o.id)}
                                      {o.deleted_at && <span className="badge bg-danger ms-1" style={{ fontSize: "0.55rem" }}>lixeira</span>}
                                    </td>
                                    <td>{o.client_name}</td>
                                    <td>
                                      <span className={`badge bg-${statusColors[o.status]}`} style={{ fontSize: "0.7rem" }}>
                                        {statusLabels[o.status]}
                                      </span>
                                    </td>
                                    <td>R$ {parseFloat(o.total).toFixed(2)}</td>
                                    <td>{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                                    <td>
                                      {!o.deleted_at && (
                                        <button
                                          className="btn btn-outline-light btn-sm"
                                          style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                                          onClick={() => navigate(`/admin/orders/${o.id}`)}
                                        >
                                          Ver
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmLabel={confirmModal.confirmLabel}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((m) => ({ ...m, show: false }))}
      />
    </DashboardLayout>
  );
}
