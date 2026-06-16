-- ============================================================
-- RusanOrder — Script de inicialização de PRODUÇÃO
--
-- ⚠ Antes de aplicar:
--   1. Gere um hash bcrypt da senha do admin:
--      docker run --rm -e P="suaSenhaForte" alpine:3 sh -c \
--        'apk add --no-cache nodejs npm >/dev/null && \
--         npm i bcryptjs >/dev/null 2>&1 && \
--         node -e "console.log(require(\"bcryptjs\").hashSync(process.env.P, 10))"'
--   2. Edite a seção `INSERT INTO users` abaixo:
--      - troque ADMIN_NAME, ADMIN_EMAIL e o BCRYPT_HASH
--
-- Aplicação:
--   • TiDB Serverless: cole no SQL Editor do dashboard.
--   • MySQL local:     USE rusanorder; SOURCE production-init.sql;
-- ============================================================

-- ── usuários ─────────────────────────────────────────────────
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- ── clientes ─────────────────────────────────────────────────
CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  cnpj VARCHAR(18) NULL,
  code VARCHAR(20) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(30) NULL,
  address VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE client_emails (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- ── pedidos ──────────────────────────────────────────────────
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  user_id INT NOT NULL,
  purchase_order VARCHAR(100) NULL,
  status ENUM(
    'novo','aguardando_pcp','aguardando_cliente','ajuste_necessario',
    'recusado_pcp','aprovado','em_producao','atraso_producao',
    'enviado','entregue','entregue_divergencia','cancelado'
  ) NOT NULL DEFAULT 'novo',
  notes TEXT NULL,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  sample_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'm²',
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE order_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  user_id INT NOT NULL,
  type ENUM('comment', 'status_change') NOT NULL DEFAULT 'comment',
  content TEXT NOT NULL,
  old_status VARCHAR(30) NULL,
  new_status VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── importação de PDFs por IA (RF07) ────────────────────────
CREATE TABLE import_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_files INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE pdf_imports (
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

-- ── amostras de couro (RF9) ─────────────────────────────────
CREATE TABLE samples (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  client_id INT NOT NULL,
  user_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  leather_type ENUM('bovino','ovino','caprino','suino','outros') NOT NULL DEFAULT 'bovino',
  thickness_mm DECIMAL(4,2) NULL,
  color VARCHAR(50) NULL,
  finish VARCHAR(100) NULL,
  carrier VARCHAR(100) NULL,
  tracking_code VARCHAR(100) NULL,
  sent_at DATE NOT NULL,
  returned_at DATE NULL,
  acceptance_at DATE NULL,
  acceptance_notes TEXT NULL,
  status ENUM(
    'enviada','recebida_pelo_cliente','em_analise','aprovada',
    'aceite_recebido','rejeitada','pedido_gerado','arquivada'
  ) NOT NULL DEFAULT 'enviada',
  notes TEXT NULL,
  order_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

ALTER TABLE orders
  ADD CONSTRAINT fk_orders_sample FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE SET NULL;

CREATE TABLE sample_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sample_id INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE
);

CREATE TABLE sample_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sample_id INT NOT NULL,
  user_id INT NOT NULL,
  type ENUM('comment','status_change') NOT NULL DEFAULT 'comment',
  content TEXT NOT NULL,
  old_status VARCHAR(30) NULL,
  new_status VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── notificações (RF10) ─────────────────────────────────────
CREATE TABLE notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM(
    'new_order','status_change','comment_received','production_delay',
    'sample_return','sample_no_return','sample_acceptance'
  ) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(500) NULL,
  resource_type VARCHAR(30) NOT NULL,
  resource_id INT NOT NULL,
  read_at TIMESTAMP NULL,
  archived_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_notif_user_unread (user_id, read_at, archived_at),
  INDEX idx_notif_created (created_at)
);

CREATE TABLE notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_type ENUM(
    'new_order','status_change','comment_received','production_delay',
    'sample_return','sample_no_return','sample_acceptance'
  ) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_event (user_id, event_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- ADMIN INICIAL — substitua os 3 placeholders abaixo
-- ============================================================
-- INSERT INTO users (name, email, password, role) VALUES (
--   'REPLACE_ADMIN_NAME',
--   'REPLACE_ADMIN_EMAIL@example.com',
--   'REPLACE_BCRYPT_HASH',
--   'admin'
-- );
