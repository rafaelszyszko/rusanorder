import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useBasePath } from "../hooks/useBasePath";
import { createSample, uploadSamplePhoto } from "../services/sampleService";
import { listClients } from "../services/clientService";
import { leatherTypeLabels } from "../constants/sampleStatus";

const todayIso = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 10);
};

export default function SampleForm() {
  const navigate = useNavigate();
  const basePath = useBasePath();

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [leatherType, setLeatherType] = useState("bovino");
  const [thicknessMm, setThicknessMm] = useState("");
  const [color, setColor] = useState("");
  const [finish, setFinish] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [sentAt, setSentAt] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
  }, []);

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    const limited = [...photos, ...files].slice(0, 5);
    setPhotos(limited);
  };

  const removePhoto = (idx) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!clientId) return setError("Selecione um cliente");
    if (!description.trim()) return setError("Descrição é obrigatória");
    if (!sentAt) return setError("Data de envio é obrigatória");
    if (new Date(sentAt) > new Date()) return setError("Data de envio não pode ser futura");

    setLoading(true);
    try {
      const payload = {
        client_id: Number(clientId),
        description: description.trim(),
        leather_type: leatherType,
        thickness_mm: thicknessMm || null,
        color: color || null,
        finish: finish || null,
        carrier: carrier || null,
        tracking_code: trackingCode || null,
        sent_at: sentAt,
        notes: notes || null,
      };
      const created = await createSample(payload);
      for (const file of photos) {
        try { await uploadSamplePhoto(created.id, file); } catch { /* falha em foto não bloqueia */ }
      }
      navigate(`${basePath}/samples/${created.id}`);
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
          <h3 className="module-title">Nova Amostra</h3>
          <p className="module-subtitle">Cadastro de envio de amostra de couro</p>
        </div>
        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <form onSubmit={handleSubmit} style={{ maxWidth: 700 }}>
          <div className="mb-3">
            <label className="form-label text-light small">Cliente *</label>
            <select
              className="form-select bg-dark text-light border-secondary"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label text-light small">Descrição do material *</label>
            <input
              type="text"
              className="form-control bg-dark text-light border-secondary"
              placeholder="Ex: Couro Acabado Preto 1.2mm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label text-light small">Tipo de couro</label>
              <select
                className="form-select bg-dark text-light border-secondary"
                value={leatherType}
                onChange={(e) => setLeatherType(e.target.value)}
              >
                {Object.entries(leatherTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4 mt-3 mt-md-0">
              <label className="form-label text-light small">Espessura (mm)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control bg-dark text-light border-secondary"
                placeholder="Ex: 1.20"
                value={thicknessMm}
                onChange={(e) => setThicknessMm(e.target.value)}
              />
            </div>
            <div className="col-md-4 mt-3 mt-md-0">
              <label className="form-label text-light small">Cor</label>
              <input
                type="text"
                className="form-control bg-dark text-light border-secondary"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-light small">Acabamento</label>
            <input
              type="text"
              className="form-control bg-dark text-light border-secondary"
              placeholder="Ex: Napa, Floater, Crust..."
              value={finish}
              onChange={(e) => setFinish(e.target.value)}
            />
          </div>

          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label text-light small">Data do envio *</label>
              <input
                type="date"
                className="form-control bg-dark text-light border-secondary"
                max={todayIso()}
                value={sentAt}
                onChange={(e) => setSentAt(e.target.value)}
                required
              />
            </div>
            <div className="col-md-4 mt-3 mt-md-0">
              <label className="form-label text-light small">Transportadora</label>
              <input
                type="text"
                className="form-control bg-dark text-light border-secondary"
                placeholder="Ex: Correios, Sedex"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
            </div>
            <div className="col-md-4 mt-3 mt-md-0">
              <label className="form-label text-light small">Código de rastreio</label>
              <input
                type="text"
                className="form-control bg-dark text-light border-secondary"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-light small">Observações</label>
            <textarea
              className="form-control bg-dark text-light border-secondary"
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="form-label text-light small">Fotos da amostra ({photos.length}/5)</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="form-control bg-dark text-light border-secondary"
              onChange={handlePhotoChange}
              disabled={photos.length >= 5}
            />
            <div className="form-text text-secondary" style={{ fontSize: "0.7rem" }}>
              JPG/PNG até 5MB cada, até 5 fotos
            </div>
            {photos.length > 0 && (
              <div className="d-flex gap-2 flex-wrap mt-2">
                {photos.map((file, i) => (
                  <div key={i} className="position-relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`prévia ${i + 1}`}
                      style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm position-absolute top-0 end-0"
                      style={{ padding: "0 6px", fontSize: 12 }}
                      onClick={() => removePhoto(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate(`${basePath}/samples`)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
