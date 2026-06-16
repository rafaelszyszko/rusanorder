-- ============================================================
-- Entrega 2 — IA / Importação de Pedidos (RF07)
-- Migração incremental — aplicar sobre o schema da Entrega 1.
-- Uso: USE rusanorder; SOURCE migrations/002_entrega_2_imports.sql;
-- ============================================================

CREATE TABLE IF NOT EXISTS import_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_files INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pdf_imports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  size_bytes INT NOT NULL,
  status ENUM('em_processamento', 'aguardando_revisao', 'concluida', 'erro', 'cancelada')
    NOT NULL DEFAULT 'em_processamento',
  order_id INT NULL,
  error_message TEXT NULL,
  confidence_score DECIMAL(3,2) NULL,
  extracted_data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES import_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);
