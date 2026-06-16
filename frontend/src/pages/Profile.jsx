import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, updateProfile } from "../services/userService";
import DashboardLayout from "../components/DashboardLayout";

export default function Profile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getProfile()
      .then((data) => {
        setName(data.name || "");
        setEmail(data.email || "");
      })
      .catch(() => navigate("/"));
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await updateProfile({ name, email, password });
      localStorage.setItem("name", name);
      setMessage("Perfil atualizado com sucesso!");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const role = localStorage.getItem("role");

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1 page-form-centered">
                <div className="module-header">
                  <h3 className="module-title">Editar Perfil</h3>
                  <p className="module-subtitle">Atualização dos seus dados</p>
                </div>

                {message && (
                  <div className="alert alert-success py-2 small">{message}</div>
                )}
                {error && (
                  <div className="alert alert-danger py-2 small">{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label text-light small">Nome</label>
                    <input
                      type="text"
                      className="form-control bg-dark text-light border-secondary"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-light small">Email</label>
                    <input
                      type="email"
                      className="form-control bg-dark text-light border-secondary"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label text-light small">
                      Nova senha <span className="text-secondary">(deixe em branco para manter)</span>
                    </label>
                    <input
                      type="password"
                      className="form-control bg-dark text-light border-secondary"
                      placeholder="Nova senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        navigate(role === "admin" ? "/admin" : "/user")
                      }
                    >
                      Voltar
                    </button>
                  </div>
                </form>
      </div>
    </DashboardLayout>
  );
}
