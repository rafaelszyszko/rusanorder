import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getUnreadCount,
  listNotifications,
  markAsRead,
  markAllAsRead,
} from "../services/notificationService";
import {
  notificationTypeIcons,
  notificationTypeColors,
  resourcePath,
  timeAgo,
} from "../constants/notificationTypes";
import { useBasePath } from "../hooks/useBasePath";

const POLL_MS = 60000;

export default function NotificationBell() {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const refreshCount = async () => {
    try {
      const { count } = await getUnreadCount();
      setCount(count);
    } catch { /* silencioso para evitar poluir UI */ }
  };

  useEffect(() => {
    let mounted = true;
    const tick = () => { if (mounted) refreshCount(); };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const openDropdown = async () => {
    setOpen((v) => !v);
    if (open) return;
    setLoading(true);
    try {
      const data = await listNotifications({ limit: 5 });
      setItems(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleClickItem = async (n) => {
    if (!n.read_at) {
      try { await markAsRead(n.id); } catch { /* ignore */ }
    }
    setOpen(false);
    refreshCount();
    navigate(resourcePath(n, basePath));
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      refreshCount();
    } catch { /* ignore */ }
  };

  const displayCount = count > 9 ? "9+" : String(count);

  return (
    <div className="position-relative" ref={ref}>
      <button className="theme-toggle-btn" onClick={openDropdown} title="Notificações" style={{ position: "relative" }}>
        <i className="bi bi-bell"></i>
        {count > 0 && (
          <span className="badge bg-danger position-absolute"
            style={{ top: -4, right: -4, fontSize: "0.6rem", padding: "2px 5px", borderRadius: 10 }}>
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown-card shadow-lg"
          style={{ position: "absolute", right: 0, top: "110%", width: 380, zIndex: 1050 }}>
          <div className="d-flex justify-content-between align-items-center p-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <strong style={{ color: "var(--text-h)" }}>Notificações</strong>
            <div className="d-flex gap-2 align-items-center">
              {count > 0 && (
                <button className="btn btn-link btn-sm p-0 small" onClick={handleMarkAll} style={{ textDecoration: "none" }}>
                  Marcar todas como lidas
                </button>
              )}
              <button
                className="btn btn-link btn-sm p-0"
                onClick={() => { setOpen(false); navigate(`${basePath}/notifications/preferences`); }}
                title="Preferências"
                style={{ textDecoration: "none" }}>
                <i className="bi bi-gear"></i>
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {loading && <div className="p-4 text-center text-secondary small">Carregando...</div>}
            {!loading && items.length === 0 && (
              <div className="p-4 text-center text-secondary small">
                <i className="bi bi-bell-slash fs-2 d-block mb-2"></i>
                Você está em dia. Sem notificações.
              </div>
            )}
            {items.map((n) => (
              <div key={n.id} role="button" onClick={() => handleClickItem(n)}
                className="d-flex gap-2 p-3"
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: n.read_at ? "transparent" : "rgba(13,110,253,0.07)",
                }}>
                <div style={{ width: 28, textAlign: "center" }}>
                  <i className={`bi ${notificationTypeIcons[n.type] || "bi-bell"}`}
                     style={{ color: notificationTypeColors[n.type], fontSize: "1.1rem" }} />
                </div>
                <div className="flex-grow-1 small">
                  <div style={{ color: "var(--text-h)", fontWeight: n.read_at ? 400 : 600 }}>{n.title}</div>
                  {n.description && (
                    <div className="text-secondary text-truncate" style={{ maxWidth: 290 }}>
                      {n.description}
                    </div>
                  )}
                  <div className="text-secondary" style={{ fontSize: "0.7rem" }}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.read_at && <span className="rounded-circle bg-primary" style={{ width: 8, height: 8, marginTop: 6 }}></span>}
              </div>
            ))}
          </div>

          <div className="p-2 text-center" style={{ borderTop: "1px solid var(--border)" }}>
            <button className="btn btn-link btn-sm small w-100" style={{ textDecoration: "none" }}
              onClick={() => { setOpen(false); navigate(`${basePath}/notifications`); }}>
              Ver todas as notificações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
