import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import NotificationBell from "./NotificationBell";
import SearchTool from "./SearchTool";
import ApiStatus from "./ApiStatus";
import "./DashboardLayout.css";

const ADMIN_NAV = [
  { label: "Dashboard", icon: "bi-grid-fill", path: "/admin" },
  { label: "Clientes", icon: "bi-people-fill", path: "/admin/clients" },
  { label: "Pedidos", icon: "bi-clipboard-data-fill", path: "/admin/orders" },
  { label: "Amostras", icon: "bi-box-seam", path: "/admin/samples" },
  { label: "Importar IA", icon: "bi-robot", path: "/admin/imports" },
  { label: "Lixeira", icon: "bi-trash3-fill", path: "/admin/orders/trash" },
  { label: "Usuários", icon: "bi-person-gear", path: "/admin/users" },
];

const USER_NAV = [
  { label: "Dashboard", icon: "bi-grid-fill", path: "/user" },
  { label: "Clientes", icon: "bi-people-fill", path: "/user/clients" },
  { label: "Pedidos", icon: "bi-clipboard-data-fill", path: "/user/orders" },
  { label: "Amostras", icon: "bi-box-seam", path: "/user/samples" },
  { label: "Importar IA", icon: "bi-robot", path: "/user/imports" },
];

export default function DashboardLayout({ children }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const name = localStorage.getItem("name") || "Usuário";
  const role = localStorage.getItem("role") || "";
  const isAdmin = role === "admin";
  const basePath = isAdmin ? "/admin" : "/user";
  const navItems = isAdmin ? ADMIN_NAV : USER_NAV;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    navigate("/");
  };

  const isActive = (path) => {
    if (path === basePath) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="d-flex flex-column min-vh-100" style={{ background: "var(--bg)" }}>
      <nav className={`navbar header-bar px-3 px-md-4 ${isAdmin ? "header-admin" : "header-user"} ${scrolled ? "header-scrolled" : ""}`}>
        <div className="d-flex align-items-center gap-2 header-left">
          <span
            className="navbar-brand header-brand fw-bold mb-0"
            style={{ color: "var(--menu-text-hover)" }}
            role="button"
            onClick={() => navigate(basePath)}
          >
            RusanOrder
          </span>

          <div className="header-nav-links d-none d-md-flex align-items-center">
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`header-nav-item ${isActive(item.path) ? "active" : ""}`}
                onClick={() => navigate(item.path)}
              >
                <i className={`bi ${item.icon}`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="header-role-badge">
            {isAdmin ? "Admin" : "Usuário"}
          </span>

          <SearchTool />
          <NotificationBell />

          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
          </button>

          <div className="position-relative" ref={profileRef}>
            <button
              className="avatar-btn d-flex align-items-center gap-2 border-0 bg-transparent p-0"
              onClick={() => setProfileOpen(!profileOpen)}
            >
              <div className="avatar-circle">{initials}</div>
            </button>

            {profileOpen && (
              <div className="dropdown-card shadow-lg">
                <div className="d-flex align-items-center gap-3 p-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="avatar-circle avatar-lg">{initials}</div>
                  <div>
                    <div className="fw-semibold" style={{ color: "var(--text-h)" }}>{name}</div>
                    <div className="small" style={{ color: "var(--text)" }}>{role}</div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    className="dropdown-item-custom"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/profile");
                    }}
                  >
                    Editar perfil
                  </button>
                  <button className="dropdown-item-custom" style={{ color: "#c0392b" }} onClick={handleLogout}>
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-grow-1 d-flex">
        {children}
      </div>

      <footer className="app-footer">
        <div className="container-fluid px-4 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-3">
            <span>RusanOrder v1.0 &mdash; Sistema de Gerenciamento de Pedidos</span>
            <ApiStatus />
          </div>
          <span>Curtume Rusan &copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
