import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUserById, createUser, updateUser } from "../services/adminService";
import DashboardLayout from "../components/DashboardLayout";
import { useBasePath } from "../hooks/useBasePath";

export default function AdminUserForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const basePath = useBasePath();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      getUserById(id)
        .then((data) => {
          setName(data.name || "");
          setEmail(data.email || "");
          setRole(data.role || "user");
        })
        .catch((err) => setError(err.message));
    }
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = { name, email, role };
      if (password) payload.password = password;

      if (isEditing) {
        await updateUser(id, payload);
      } else {
        if (!password) {
          setError("Senha é obrigatória para novos usuários");
          setLoading(false);
          return;
        }
        await createUser(payload);
      }

      navigate(basePath);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container-fluid px-4 py-4 flex-grow-1 page-form-centered">
                <div className="module-header">
                  <h3 className="module-title">{isEditing ? "Editar Usuário" : "Novo Usuário"}</h3>
                  <p className="module-subtitle">{isEditing ? "Atualização de dados do usuário" : "Cadastro de novo usuário"}</p>
                </div>

                {error && (
                  <div className="alert alert-danger py-2 small">{error}</div>
                )}

                <form onSubmit={handleSubmit} style={{ maxWidth: 500 }}>
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

                  <div className="mb-3">
                    <label className="form-label text-light small">
                      {isEditing ? "Nova senha " : "Senha "}
                      {isEditing && (
                        <span className="text-secondary">
                          (deixe em branco para manter)
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      className="form-control bg-dark text-light border-secondary"
                      placeholder={isEditing ? "Nova senha" : "Senha"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      {...(!isEditing && { required: true })}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label text-light small">Role</label>
                    <select
                      className="form-select bg-dark text-light border-secondary"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading
                        ? "Salvando..."
                        : isEditing
                        ? "Salvar"
                        : "Criar"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => navigate(basePath)}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
      </div>
    </DashboardLayout>
  );
}
