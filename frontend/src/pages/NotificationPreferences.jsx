import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useBasePath } from "../hooks/useBasePath";
import {
  getPreferences,
  updatePreference,
  resetPreferences,
} from "../services/notificationService";
import { notificationTypeIcons, notificationTypeColors } from "../constants/notificationTypes";

const GROUPS = [
  {
    label: "Pedidos",
    items: [
      { type: "new_order", label: "Novo pedido criado", description: "Para administradores", adminOnly: true },
      { type: "status_change", label: "Status de pedido alterado" },
      { type: "comment_received", label: "Comentário recebido em pedido" },
      { type: "production_delay", label: "Pedido com atraso de produção" },
    ],
  },
  {
    label: "Amostras",
    items: [
      { type: "sample_return", label: "Cliente registrou retorno em amostra" },
      { type: "sample_no_return", label: "Amostra sem retorno após o prazo" },
      { type: "sample_acceptance", label: "Aceite registrado em amostra", adminOnly: true },
    ],
  },
];

export default function NotificationPreferences() {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const isAdmin = localStorage.getItem("role") === "admin";
  const [prefs, setPrefs] = useState({});
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const load = () => {
    getPreferences().then(setPrefs).catch((e) => setError(e.message));
  };
  useEffect(() => { load(); }, []);

  const flashSaved = () => {
    setSavedMsg("Preferência salva");
    setTimeout(() => setSavedMsg(""), 1500);
  };

  const handleToggle = async (type, enabled) => {
    const prev = prefs[type];
    setPrefs((p) => ({ ...p, [type]: enabled }));
    try {
      await updatePreference(type, enabled);
      flashSaved();
    } catch (e) {
      setError(e.message);
      setPrefs((p) => ({ ...p, [type]: prev }));
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Restaurar todas as preferências aos valores padrão?")) return;
    try {
      await resetPreferences();
      load();
      flashSaved();
    } catch (e) { setError(e.message); }
  };

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1" style={{ maxWidth: 720 }}>
        <div className="d-flex align-items-center gap-3 mb-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(`${basePath}/notifications`)}>
            &larr; Voltar
          </button>
          <div>
            <h3 className="text-white mb-0">Preferências de Notificação</h3>
            <p className="text-secondary small mb-0">Escolha quais eventos devem gerar notificações para você</p>
          </div>
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        {savedMsg && <div className="alert alert-success py-2 small">{savedMsg}</div>}

        {GROUPS.map((g) => (
          <div key={g.label} className="card bg-dark border-secondary mb-3">
            <div className="card-body">
              <h6 className="text-light mb-3">{g.label}</h6>
              {g.items.map((item) => {
                const disabled = item.adminOnly && !isAdmin;
                return (
                  <div key={item.type} className="d-flex align-items-center justify-content-between py-2 border-bottom border-secondary">
                    <div className="d-flex gap-2 align-items-center">
                      <i className={`bi ${notificationTypeIcons[item.type]}`} style={{ color: notificationTypeColors[item.type] }} />
                      <div>
                        <div className="text-light small">{item.label}</div>
                        {item.description && <div className="text-secondary" style={{ fontSize: "0.7rem" }}>{item.description}</div>}
                      </div>
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox"
                        disabled={disabled}
                        checked={prefs[item.type] !== false}
                        onChange={(e) => handleToggle(item.type, e.target.checked)}
                        title={disabled ? "Disponível apenas para administradores" : ""} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="d-flex justify-content-end">
          <button className="btn btn-outline-secondary btn-sm" onClick={handleReset}>
            Restaurar padrão
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
