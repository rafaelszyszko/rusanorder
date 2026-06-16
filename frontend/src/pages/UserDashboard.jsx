import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardStats } from "../services/reportService";
import DashboardLayout from "../components/DashboardLayout";
import { statusLabels, statusColors } from "../constants/orderStatus";
import { formatOrderId } from "../utils/formatOrderId";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

const bootstrapColor = {
  secondary: "#6c757d", info: "#0dcaf0", warning: "#ffc107", danger: "#dc3545",
  primary: "#0d6efd", success: "#198754",
};

const TABS = [
  { key: "overview", label: "Visão Geral" },
  { key: "orders", label: "Pedidos" },
  { key: "clients", label: "Clientes" },
];

export default function UserDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  const statusChartData = useMemo(() => {
    if (!stats) return null;
    const data = stats.ordersByStatus || [];
    return {
      labels: data.map((s) => statusLabels[s.status] || s.status),
      datasets: [{
        data: data.map((s) => s.count),
        backgroundColor: data.map((s) => bootstrapColor[statusColors[s.status]] || "#6c757d"),
        borderWidth: 0,
        hoverOffset: 6,
      }],
    };
  }, [stats]);

  const monthlyData = useMemo(() => {
    if (!stats) return null;
    const months = [...(stats.ordersByMonth || [])].reverse();
    const labels = months.map((m) => {
      const [y, mo] = m.month.split("-");
      return `${mo}/${y.slice(2)}`;
    });
    return {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Pedidos",
          data: months.map((m) => m.count),
          backgroundColor: "rgba(196, 149, 106, 0.5)",
          borderColor: "rgba(196, 149, 106, 1)",
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Faturamento (R$)",
          data: months.map((m) => parseFloat(m.revenue)),
          borderColor: "#198754",
          backgroundColor: "rgba(25, 135, 84, 0.1)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          yAxisID: "y1",
        },
      ],
    };
  }, [stats]);

  const deliveryChartData = useMemo(() => {
    if (!stats?.deliveredRate) return null;
    const r = stats.deliveredRate;
    const inProgress = r.total - r.delivered - r.cancelled;
    return {
      labels: ["Entregues", "Cancelados", "Em andamento"],
      datasets: [{
        data: [r.delivered, r.cancelled, inProgress],
        backgroundColor: ["#198754", "#dc3545", "#0dcaf0"],
        borderWidth: 0,
        hoverOffset: 6,
      }],
    };
  }, [stats]);

  const topClientsData = useMemo(() => {
    if (!stats) return null;
    const clients = stats.topClients || [];
    return {
      labels: clients.map((c) => c.name.length > 20 ? c.name.slice(0, 20) + "..." : c.name),
      datasets: [{
        label: "Faturamento (R$)",
        data: clients.map((c) => parseFloat(c.revenue)),
        backgroundColor: "rgba(196, 149, 106, 0.6)",
        borderColor: "rgba(196, 149, 106, 1)",
        borderWidth: 1,
        borderRadius: 4,
      }],
    };
  }, [stats]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "rgba(30,24,18,0.95)", titleColor: "#e8ddd0", bodyColor: "#b5a898", borderColor: "rgba(196,149,106,0.3)", borderWidth: 1, padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { ticks: { color: "#6b5d50", font: { size: 11 } }, grid: { color: "rgba(61,50,41,0.3)" } },
      y: { ticks: { color: "#6b5d50", font: { size: 11 } }, grid: { color: "rgba(61,50,41,0.3)" } },
    },
  };

  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: "65%",
    plugins: {
      legend: { position: "bottom", labels: { color: "#b5a898", padding: 12, font: { size: 11 }, boxWidth: 12 } },
      tooltip: { backgroundColor: "rgba(30,24,18,0.95)", titleColor: "#e8ddd0", bodyColor: "#b5a898", borderColor: "rgba(196,149,106,0.3)", borderWidth: 1, padding: 10, cornerRadius: 8 },
    },
  };

  const monthlyOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: { display: true, position: "top", labels: { color: "#b5a898", padding: 12, font: { size: 11 }, boxWidth: 12 } },
    },
    scales: {
      x: chartOptions.scales.x,
      y: { ...chartOptions.scales.y, position: "left", title: { display: true, text: "Pedidos", color: "#6b5d50", font: { size: 11 } } },
      y1: { ...chartOptions.scales.y, position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "R$", color: "#6b5d50", font: { size: 11 } } },
    },
  };

  const horizontalBarOptions = {
    ...chartOptions, indexAxis: "y",
    scales: {
      x: { ...chartOptions.scales.x, ticks: { ...chartOptions.scales.x.ticks, callback: (v) => `R$ ${(v / 1000).toFixed(0)}k` } },
      y: { ...chartOptions.scales.y, ticks: { ...chartOptions.scales.y.ticks, font: { size: 10 } } },
    },
  };

  if (!stats && !error) return <DashboardLayout><div className="text-center text-secondary py-5">Carregando...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1">
        <div className="module-header">
          <h3 className="module-title">Painel de Operações</h3>
          <p className="module-subtitle">Visão geral dos seus pedidos</p>
        </div>
        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {stats && (
          <>
            {/* KPI Cards */}
            <div className="row g-3 mb-4">
              {[
                { label: "Total de pedidos", value: stats.totalOrders, icon: "bi-clipboard-data-fill", iconBg: "rgba(13,110,253,0.15)", iconColor: "#0d6efd" },
                { label: "Pedidos em andamento", value: stats.pendingOrders, icon: "bi-hourglass-split", iconBg: "rgba(255,193,7,0.15)", iconColor: "#ffc107" },
                { label: "Clientes", value: stats.totalClients, icon: "bi-building", iconBg: "rgba(111,66,193,0.15)", iconColor: "#6f42c1" },
                { label: "Faturamento", value: `R$ ${Number(stats.totalRevenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: "bi-currency-dollar", iconBg: "rgba(25,135,84,0.15)", iconColor: "#198754" },
              ].map((kpi, i) => (
                <div key={i} className="col-6 col-lg-3">
                  <div className="kpi-card">
                    <div className="kpi-card-content">
                      <div className="kpi-card-label">{kpi.label}</div>
                      <div className="kpi-card-value">{kpi.value}</div>
                    </div>
                    <div className="kpi-card-icon" style={{ background: kpi.iconBg, color: kpi.iconColor }}>
                      <i className={`bi ${kpi.icon}`}></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tab navigation */}
            <div className="dashboard-tabs">
              {TABS.map((t) => (
                <button key={t.key} className={`dashboard-tab-btn ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {tab === "overview" && (
              <div className="row g-3">
                <div className="col-12 col-lg-7">
                  <div className="chart-card">
                    <div className="chart-card-header">Meus Pedidos e Faturamento por Mês</div>
                    <div className="chart-card-body">
                      <div style={{ height: 320 }}>
                        {monthlyData && <Bar data={monthlyData} options={monthlyOptions} />}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-5">
                  <div className="chart-card">
                    <div className="chart-card-header">Distribuição por Status</div>
                    <div className="chart-card-body">
                      <div style={{ height: 300 }}>
                        {statusChartData && <Doughnut data={statusChartData} options={doughnutOptions} />}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-5">
                  <div className="chart-card">
                    <div className="chart-card-header">Taxa de Entrega</div>
                    <div className="chart-card-body">
                      <div style={{ height: 260 }}>
                        {deliveryChartData && <Doughnut data={deliveryChartData} options={doughnutOptions} />}
                      </div>
                      {stats.deliveredRate && (
                        <div className="text-center mt-2">
                          <span className="text-secondary small">
                            {stats.deliveredRate.total > 0
                              ? `${((stats.deliveredRate.delivered / stats.deliveredRate.total) * 100).toFixed(1)}% entregues`
                              : "Sem dados"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-7">
                  <div className="chart-card">
                    <div className="chart-card-header">Meus Top 5 Clientes por Faturamento</div>
                    <div className="chart-card-body">
                      <div style={{ height: 280 }}>
                        {topClientsData && <Bar data={topClientsData} options={horizontalBarOptions} />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Orders */}
            {tab === "orders" && (
              <div className="row g-3">
                <div className="col-12 col-lg-7">
                  <div className="chart-card">
                    <div className="chart-card-header d-flex justify-content-between align-items-center">
                      <span>Últimos Pedidos</span>
                      <button className="btn btn-outline-secondary btn-sm" style={{ fontSize: "0.72rem" }} onClick={() => navigate("/user/orders")}>Ver todos</button>
                    </div>
                    <div className="chart-card-body">
                      <div className="table-responsive">
                        <table className="table table-dark table-sm align-middle mb-0">
                          <thead>
                            <tr className="text-secondary small">
                              <th>#</th>
                              <th>Cliente</th>
                              <th>Status</th>
                              <th>Total</th>
                              <th>Data</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(stats.recentOrders || []).map((o) => (
                              <tr key={o.id} role="button" onClick={() => navigate(`/user/orders/${o.id}`)}>
                                <td className="small fw-semibold">{formatOrderId(o.client_code, o.id)}</td>
                                <td className="small">{o.client_name}</td>
                                <td><span className={`badge bg-${statusColors[o.status]}`} style={{ fontSize: "0.65rem" }}>{statusLabels[o.status]}</span></td>
                                <td className="small">R$ {parseFloat(o.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                <td className="small text-secondary">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-5">
                  <div className="chart-card">
                    <div className="chart-card-header">Status dos Pedidos</div>
                    <div className="chart-card-body">
                      <div className="table-responsive">
                        <table className="table table-dark table-sm align-middle mb-0">
                          <thead>
                            <tr className="text-secondary small">
                              <th>Status</th>
                              <th>Qtd</th>
                              <th style={{ width: "55%" }}>Proporção</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(stats.ordersByStatus || [])
                              .sort((a, b) => b.count - a.count)
                              .map((s) => {
                                const pct = stats.totalOrders > 0 ? ((s.count / stats.totalOrders) * 100) : 0;
                                return (
                                  <tr key={s.status}>
                                    <td><span className={`badge bg-${statusColors[s.status]}`} style={{ fontSize: "0.63rem" }}>{statusLabels[s.status]}</span></td>
                                    <td className="text-white fw-semibold small">{s.count}</td>
                                    <td>
                                      <div className="d-flex align-items-center gap-2">
                                        <div className="flex-grow-1" style={{ height: 7, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                                          <div style={{ width: `${pct}%`, height: "100%", background: bootstrapColor[statusColors[s.status]] || "#6c757d", borderRadius: 4, transition: "width 0.5s ease" }} />
                                        </div>
                                        <span className="text-secondary" style={{ fontSize: "0.68rem", minWidth: 38 }}>{pct.toFixed(1)}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Clients */}
            {tab === "clients" && (
              <div className="row g-3">
                <div className="col-12 col-lg-6">
                  <div className="chart-card">
                    <div className="chart-card-header">Top 5 Clientes por Faturamento</div>
                    <div className="chart-card-body">
                      <div style={{ height: 280 }}>
                        {topClientsData && <Bar data={topClientsData} options={horizontalBarOptions} />}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-6">
                  <div className="chart-card">
                    <div className="chart-card-header">Top Clientes</div>
                    <div className="chart-card-body">
                      <div className="table-responsive">
                        <table className="table table-dark table-sm align-middle mb-0">
                          <thead>
                            <tr className="text-secondary small">
                              <th>Cliente</th>
                              <th className="text-center">Pedidos</th>
                              <th className="text-end">Faturamento</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(stats.topClients || []).map((c, i) => (
                              <tr key={i}>
                                <td className="small">{c.name}</td>
                                <td className="text-center small">{c.order_count}</td>
                                <td className="text-end fw-semibold small" style={{ color: "#198754" }}>R$ {parseFloat(c.revenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
