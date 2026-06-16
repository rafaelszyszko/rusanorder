import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getClientById, getClientHistory } from "../services/clientService";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { useBasePath } from "../hooks/useBasePath";

import { statusLabels, statusColors } from "../constants/orderStatus";
import { formatOrderId } from "../utils/formatOrderId";

export default function AdminClientHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getClientById(id).then(setClient),
      getClientHistory(id).then(setOrders),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const totalSpent = orders.filter((o) => o.status !== "cancelado").reduce((s, o) => s + parseFloat(o.total), 0);

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        <div className="module-header">
          <h3 className="module-title">Módulo de Histórico</h3>
          {client && <p className="module-subtitle">{client.name}</p>}
        </div>
        <div className="d-flex justify-content-end mb-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(`${basePath}/clients`)}>
            Voltar
          </button>
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <div className="row mb-4 g-3">
          <div className="col-6 col-md-3">
            <div className="card bg-dark border-secondary text-center p-3">
              <div className="text-secondary small">Total de pedidos</div>
              <div className="text-white fs-4 fw-bold">{orders.length}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card bg-dark border-secondary text-center p-3">
              <div className="text-secondary small">Total gasto</div>
              <div className="text-white fs-4 fw-bold">R$ {totalSpent.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle mb-0">
            <thead>
              <tr className="text-secondary small">
                <th>Pedido</th>
                <th>Status</th>
                <th>Total</th>
                <th className="d-none d-md-table-cell">Criado por</th>
                <th>Data</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="6"><LoadingSpinner label="Carregando histórico..." /></td></tr>
              )}
              {!loading && orders.length === 0 && (
                <tr><td colSpan="6" className="text-center text-secondary py-4">Nenhum pedido encontrado</td></tr>
              )}
              {!loading && orders.map((o) => (
                <tr key={o.id}>
                  <td>{formatOrderId(o.client_code, o.id)}</td>
                  <td><span className={`badge bg-${statusColors[o.status]}`}>{statusLabels[o.status]}</span></td>
                  <td>R$ {parseFloat(o.total).toFixed(2)}</td>
                  <td className="d-none d-md-table-cell">{o.created_by}</td>
                  <td>{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="text-end">
                    <button className="btn btn-outline-light btn-sm" onClick={() => navigate(`${basePath}/orders/${o.id}`)}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
