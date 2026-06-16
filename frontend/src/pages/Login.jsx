import { useState } from "react";
import { login } from "../services/authService";
import { useTheme } from "../contexts/ThemeContext";
import "../components/DashboardLayout.css";
import "./Login.css";

export default function Login() {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(email, password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("name", data.name);
      localStorage.setItem("userId", String(data.userId));

      if (data.role === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/user";
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split">
      <aside className="login-hero">
        <div className="login-hero-overlay" />
        <div className="login-hero-pattern" />
        <div className="login-hero-content">
          <div className="login-hero-brand">
            <div className="login-hero-logo">
              <i className="bi bi-bag-check-fill" />
            </div>
            <span className="login-hero-brand-name">RusanOrder</span>
          </div>

          <div className="login-hero-text">
            <h1 className="login-hero-title">
              Cada pedido é uma <br /> história de couro.
            </h1>
            <p className="login-hero-subtitle">
              Gestão completa para o escritório de representação do curtume Rusan
              em Novo Hamburgo &mdash; do contato ao embarque, na palma da mão.
            </p>
          </div>

          <div className="login-hero-footer">
            <span className="login-hero-dot" />
            <span>Sistema interno protegido &middot; uso autorizado</span>
          </div>
        </div>
      </aside>

      <section className="login-blade">
        <div className="login-blade-topbar">
          <span className="login-blade-brand-mobile">RusanOrder</span>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        <div className="login-blade-body">
          <div className="login-blade-card">
            <div className="login-blade-header">
              <h2 className="login-blade-title">Bem-vindo de volta</h2>
              <p className="login-blade-subtitle">
                Acesse sua conta para gerenciar pedidos, clientes e relatórios.
              </p>
            </div>

            {error && (
              <div
                className="alert alert-danger d-flex align-items-center py-2 px-3 login-shake"
                role="alert"
              >
                <i className="bi bi-exclamation-circle-fill me-2"></i>
                <span className="small">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label small login-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-control login-input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="form-label small login-label">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-control login-input"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 login-btn py-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    />
                    Entrando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right me-2" />
                    Entrar
                  </>
                )}
              </button>
            </form>

            <div className="login-blade-footer">
              <span>&copy; {new Date().getFullYear()} RusanOrder</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
