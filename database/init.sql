-- ============================================================
-- RusanOrder - Script completo de inicialização
-- Uso: DROP DATABASE rusanorder; CREATE DATABASE rusanorder; USE rusanorder; SOURCE init.sql;
-- ============================================================

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

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

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  user_id INT NOT NULL,
  purchase_order VARCHAR(100) NULL,
  status ENUM(
    'novo',
    'aguardando_pcp',
    'aguardando_cliente',
    'ajuste_necessario',
    'recusado_pcp',
    'aprovado',
    'em_producao',
    'atraso_producao',
    'enviado',
    'entregue',
    'entregue_divergencia',
    'cancelado'
  ) NOT NULL DEFAULT 'novo',
  notes TEXT NULL,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
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

-- ============================================================
-- ENTREGA 2 — IA / IMPORTAÇÃO DE PEDIDOS (RF07)
-- ============================================================

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

-- ============================================================
-- ENTREGA 3 — AMOSTRAS E NOTIFICAÇÕES (RF9, RF10)
-- ============================================================

CREATE TABLE samples (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
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
    'enviada',
    'recebida_pelo_cliente',
    'em_analise',
    'aprovada',
    'aceite_recebido',
    'rejeitada',
    'pedido_gerado',
    'arquivada'
  ) NOT NULL DEFAULT 'enviada',
  notes TEXT NULL,
  order_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

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

ALTER TABLE orders
  ADD COLUMN sample_id INT NULL,
  ADD CONSTRAINT fk_orders_sample FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE SET NULL;

CREATE TABLE notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM(
    'new_order',
    'status_change',
    'comment_received',
    'production_delay',
    'sample_return',
    'sample_no_return',
    'sample_acceptance'
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
    'new_order',
    'status_change',
    'comment_received',
    'production_delay',
    'sample_return',
    'sample_no_return',
    'sample_acceptance'
  ) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_event (user_id, event_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- (Seed de amostras é inserido no final, depois dos clientes)

-- ============================================================
-- USUÁRIO ADMIN (senha: admin123)
-- ============================================================
INSERT INTO users (name, email, password, role) VALUES
('Administrador', 'admin@rusan.com', '$2b$10$r2/2D7BTA7AkPe0eLQ6PDuFbLqP6zLwHNt94PRnwZnFKDYBSYGQ/S', 'admin'),
('Usuário Teste', 'user@rusan.com', '$2b$10$r2/2D7BTA7AkPe0eLQ6PDuFbLqP6zLwHNt94PRnwZnFKDYBSYGQ/S', 'user');

-- ============================================================
-- 5 CLIENTES FICTÍCIOS
-- ============================================================
INSERT INTO clients (name, cnpj, code, phone, address, city, state) VALUES
('Calçados Bela Vista Ltda',     '12.345.678/0001-01', 'BVISTA',  '(51) 3333-1001', 'Rua das Hortênsias, 120',    'Novo Hamburgo',  'RS'),
('Indústria de Couros Pampa',    '23.456.789/0001-02', 'PAMPA',   '(51) 3333-1002', 'Av. Brasil, 850',            'Estância Velha', 'RS'),
('Artefatos Gaúcho SA',          '34.567.890/0001-03', 'GAUCHO',  '(54) 3333-1003', 'Rod. RS-122 Km 45',          'Caxias do Sul',  'RS'),
('Estofados Premium',            '45.678.901/0001-04', 'PREMIUM', '(11) 4444-2001', 'Rua Mooca, 2300',            'São Paulo',      'SP'),
('Selaria Campeira',             '56.789.012/0001-05', 'CAMPEIRA','(55) 3333-1006', 'Estrada do Campo, 45',       'Santa Maria',    'RS');

-- Emails dos clientes (múltiplos)
INSERT INTO client_emails (client_id, email) VALUES
(1, 'contato@belavista.com.br'),
(1, 'financeiro@belavista.com.br'),
(1, 'compras@belavista.com.br'),
(2, 'vendas@courospampa.com.br'),
(2, 'pcp@courospampa.com.br'),
(3, 'compras@gauchosa.com.br'),
(3, 'financeiro@gauchosa.com.br'),
(4, 'pedidos@estofadosp.com.br'),
(4, 'comercial@estofadosp.com.br'),
(5, 'selaria@campeira.com.br');

-- ============================================================
-- 25 PEDIDOS (5 por cliente, status variados)
-- ============================================================

-- ========== CLIENTE 1: Calçados Bela Vista ==========

-- Pedido 1.1: Entregue
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(1, 1, 'OC-BV-2026-001', 'entregue', 'Pedido entregue conforme prazo.', 15000.00, '2026-01-15 09:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro bovino semi-acabado WET BLUE 1.2mm', 'm²', 100, 80.00, 8000.00),
(@oid, 'Couro acabado napa preta', 'm²', 50, 140.00, 7000.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "entregue"', 'novo', 'entregue');

-- Pedido 1.2: Em produção
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(1, 1, 'OC-BV-2026-002', 'em_producao', 'Produção iniciada, previsão 10/04.', 11200.00, '2026-02-20 10:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro napa branca soft 1.0mm', 'm²', 80, 140.00, 11200.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "em_producao"', 'novo', 'em_producao');

-- Pedido 1.3: Novo
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(1, 1, 'OC-BV-2026-003', 'novo', 'OC recebida por email hoje.', 6400.00, '2026-03-24 14:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro camurça marrom', 'm²', 80, 80.00, 6400.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo');

-- Pedido 1.4: Aguardando cliente
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(1, 1, 'OC-BV-2026-004', 'aguardando_cliente', 'PCP estimou entrega 20/04. Aguardando aceite.', 9800.00, '2026-03-10 08:30:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro floater caramelo', 'm²', 70, 140.00, 9800.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "aguardando_pcp"', 'novo', 'aguardando_pcp'),
(@oid, 1, 'status_change', 'Status alterado de "aguardando_pcp" para "aguardando_cliente"', 'aguardando_pcp', 'aguardando_cliente');

-- Pedido 1.5: Cancelado
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(1, 1, 'OC-BV-2026-005', 'cancelado', 'Cliente cancelou. Motivo: mudança de coleção.', 4000.00, '2026-02-05 11:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro vegetal para sola', 'm²', 50, 80.00, 4000.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "cancelado"', 'novo', 'cancelado'),
(@oid, 1, 'comment', 'Cliente informou que trocou a coleção e não precisa mais desse couro.', NULL, NULL);

-- ========== CLIENTE 2: Indústria de Couros Pampa ==========

-- Pedido 2.1: Aprovado
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(2, 1, 'OC-CP-0452', 'aprovado', 'Cliente aceitou prazo de 15/04.', 28000.00, '2026-03-05 09:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro semi-acabado vegetal 1.4mm', 'm²', 200, 140.00, 28000.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "aprovado"', 'novo', 'aprovado');

-- Pedido 2.2: Recusado PCP
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(2, 1, 'OC-CP-0460', 'recusado_pcp', 'PCP sem capacidade para este lote.', 32000.00, '2026-03-10 09:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro wet blue grande volume 1.6mm', 'm²', 400, 80.00, 32000.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "aguardando_pcp"', 'novo', 'aguardando_pcp'),
(@oid, 1, 'status_change', 'Status alterado de "aguardando_pcp" para "recusado_pcp"', 'aguardando_pcp', 'recusado_pcp'),
(@oid, 1, 'comment', 'Linha de produção ocupada até maio. Sugerido reagendar.', NULL, NULL);

-- Pedido 2.3: Enviado
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(2, 1, 'OC-CP-0445', 'enviado', 'Despachado via transportadora. NF 5521.', 16000.00, '2026-02-10 08:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro crust natural 1.4mm', 'm²', 200, 80.00, 16000.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "enviado"', 'novo', 'enviado');

-- Pedido 2.4: Atraso produção
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(2, 1, 'OC-CP-0458', 'atraso_producao', 'Atraso de 7 dias. Nova previsão: 05/04.', 22400.00, '2026-02-28 10:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro napa preta premium', 'm²', 160, 140.00, 22400.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "atraso_producao"', 'novo', 'atraso_producao'),
(@oid, 1, 'comment', 'Problema com fornecimento de insumos químicos. PCP replanejou.', NULL, NULL);

-- Pedido 2.5: Aguardando PCP
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(2, 1, 'OC-CP-0465', 'aguardando_pcp', 'Enviado ao PCP para avaliação.', 12000.00, '2026-03-20 14:30:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro estofamento cinza', 'm²', 150, 80.00, 12000.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "aguardando_pcp"', 'novo', 'aguardando_pcp');

-- ========== CLIENTE 3: Artefatos Gaúcho SA ==========

-- Pedido 3.1: Entregue com divergência
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(3, 1, 'OC-GA-2026/01', 'entregue_divergencia', 'Entregue, porém 3 m² com tonalidade diferente.', 8400.00, '2026-01-20 09:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro napa branca soft', 'm²', 60, 140.00, 8400.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "entregue_divergencia"', 'novo', 'entregue_divergencia'),
(@oid, 1, 'comment', 'Cliente reclamou de diferença de tonalidade em 3 m². Abrir tratativa com PCP.', NULL, NULL);

-- Pedido 3.2: Ajuste necessário
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(3, 1, 'OC-GA-2026/02', 'ajuste_necessario', 'Referência incorreta na OC. Solicitar correção.', 7000.00, '2026-03-16 16:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro tipo a definir (ref incorreta)', 'm²', 50, 140.00, 7000.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "ajuste_necessario"', 'novo', 'ajuste_necessario'),
(@oid, 1, 'comment', 'Referência "NP-230" não existe no catálogo. Pode ser "NP-320"? Confirmando com cliente.', NULL, NULL);

-- Pedido 3.3: Novo
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(3, 1, 'OC-GA-2026/03', 'novo', 'OC recebida hoje por email.', 9600.00, '2026-03-25 08:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro napa vermelha', 'm²', 40, 140.00, 5600.00),
(@oid, 'Raspa de couro curtida', 'm²', 50, 80.00, 4000.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo');

-- Pedido 3.4: Entregue
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(3, 1, 'OC-GA-2025/18', 'entregue', 'Entregue sem pendências.', 12600.00, '2025-12-10 09:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro bovino acabado marrom', 'm²', 90, 140.00, 12600.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "entregue"', 'novo', 'entregue');

-- Pedido 3.5: Em produção
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(3, 1, 'OC-GA-2026/04', 'em_producao', 'Produção iniciada. Previsão: 02/04.', 5600.00, '2026-03-08 11:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro floater preto', 'm²', 70, 80.00, 5600.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "em_producao"', 'novo', 'em_producao');

-- ========== CLIENTE 4: Estofados Premium ==========

-- Pedido 4.1: Em produção
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(4, 1, 'EP-OC-3344', 'em_producao', 'Produção iniciada. Previsão: 28/03.', 12000.00, '2026-03-01 09:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro estofamento bege liso', 'm²', 150, 80.00, 12000.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "em_producao"', 'novo', 'em_producao');

-- Pedido 4.2: Entregue
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(4, 1, 'EP-OC-3320', 'entregue', 'Entregue no prazo.', 21000.00, '2026-01-10 08:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro estofamento branco', 'm²', 150, 140.00, 21000.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "entregue"', 'novo', 'entregue');

-- Pedido 4.3: Aprovado
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(4, 1, 'EP-OC-3350', 'aprovado', 'Cliente aprovou prazo de 25/04.', 8000.00, '2026-03-18 10:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro estofamento cinza grafite', 'm²', 100, 80.00, 8000.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "aprovado"', 'novo', 'aprovado');

-- Pedido 4.4: Novo
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(4, 1, 'EP-OC-3355', 'novo', 'OC recebida. Aguardando envio ao PCP.', 19600.00, '2026-03-24 16:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro estofamento marrom chocolate', 'm²', 140, 140.00, 19600.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo');

-- Pedido 4.5: Enviado
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(4, 1, 'EP-OC-3330', 'enviado', 'Despachado. NF 7890. Transportadora Sul Express.', 16800.00, '2026-02-15 08:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro estofamento caramelo', 'm²', 120, 140.00, 16800.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "enviado"', 'novo', 'enviado');

-- ========== CLIENTE 5: Selaria Campeira ==========

-- Pedido 5.1: Entregue
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(5, 1, 'SC-PED-110', 'entregue', 'Entregue conforme combinado.', 4000.00, '2026-01-25 09:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Vaqueta para selaria e arreios', 'm²', 50, 80.00, 4000.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "entregue"', 'novo', 'entregue');

-- Pedido 5.2: Aguardando PCP
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(5, 1, 'SC-PED-115', 'aguardando_pcp', 'Enviado ao PCP. Produto especial.', 7000.00, '2026-03-15 10:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro sela graxo especial', 'm²', 50, 140.00, 7000.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "aguardando_pcp"', 'novo', 'aguardando_pcp');

-- Pedido 5.3: Cancelado
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(5, 1, 'SC-PED-112', 'cancelado', 'Cancelado a pedido do cliente. Sem demanda no momento.', 3200.00, '2026-02-20 14:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro latego para rédeas', 'm²', 40, 80.00, 3200.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "cancelado"', 'novo', 'cancelado');

-- Pedido 5.4: Aguardando cliente
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(5, 1, 'SC-PED-118', 'aguardando_cliente', 'PCP estimou 30/04. Aguardando resposta do cliente.', 5600.00, '2026-03-12 08:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro cru curtido para selas', 'm²', 70, 80.00, 5600.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo'),
(@oid, 1, 'status_change', 'Status alterado de "novo" para "aguardando_pcp"', 'novo', 'aguardando_pcp'),
(@oid, 1, 'status_change', 'Status alterado de "aguardando_pcp" para "aguardando_cliente"', 'aguardando_pcp', 'aguardando_cliente');

-- Pedido 5.5: Novo
INSERT INTO orders (client_id, user_id, purchase_order, status, notes, total, created_at) VALUES
(5, 1, 'SC-PED-120', 'novo', 'OC recebida via WhatsApp.', 2400.00, '2026-03-25 11:00:00');
SET @oid = LAST_INSERT_ID();
INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES
(@oid, 'Couro pelica macia para luvas', 'm²', 30, 80.00, 2400.00);
INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES
(@oid, 1, 'status_change', 'Pedido criado', NULL, 'novo');

-- ============================================================
-- AMOSTRAS DE COURO (seed Entrega 3) — código AM-{CLIENT_CODE}-{N}
-- ============================================================
INSERT INTO samples (code, client_id, user_id, description, leather_type, thickness_mm, color, finish, carrier, tracking_code, sent_at, status, notes)
VALUES
  ('AM-BVISTA-1',  1, 1, 'Couro Acabado Preto 1.2mm', 'bovino', 1.20, 'Preto',    'Napa',    'Correios', 'BR123456789', '2026-05-10', 'aprovada',   'Amostra solicitada pela área de criação.'),
  ('AM-PAMPA-1',   2, 1, 'Couro Crust Natural',       'bovino', 1.40, 'Natural',  'Crust',   'Jadlog',   'JL987654321', '2026-05-20', 'em_analise', NULL),
  ('AM-GAUCHO-1',  3, 1, 'Couro Floater Caramelo',    'bovino', 1.00, 'Caramelo', 'Floater', 'Correios', 'BR111222333', '2026-04-15', 'rejeitada',  'Cliente avaliou e rejeitou pelo tom.'),
  ('AM-PREMIUM-1', 4, 1, 'Couro Soft Branco',         'bovino', 0.80, 'Branco',   'Soft',    'Sedex',    'SE555666777', '2026-06-01', 'enviada',    NULL);

INSERT INTO sample_comments (sample_id, user_id, type, content, old_status, new_status) VALUES
  (1, 1, 'status_change', 'Amostra registrada e enviada para Calçados Bela Vista Ltda', NULL, 'enviada'),
  (1, 1, 'status_change', 'Status alterado de "enviada" para "recebida_pelo_cliente"', 'enviada', 'recebida_pelo_cliente'),
  (1, 1, 'status_change', 'Status alterado de "recebida_pelo_cliente" para "em_analise"', 'recebida_pelo_cliente', 'em_analise'),
  (1, 1, 'status_change', 'Status alterado de "em_analise" para "aprovada"', 'em_analise', 'aprovada'),
  (2, 1, 'status_change', 'Amostra registrada e enviada para Indústria de Couros Pampa', NULL, 'enviada'),
  (2, 1, 'status_change', 'Status alterado de "enviada" para "em_analise"', 'enviada', 'em_analise'),
  (3, 1, 'status_change', 'Amostra registrada e enviada para Artefatos Gaúcho SA', NULL, 'enviada'),
  (3, 1, 'status_change', 'Status alterado de "enviada" para "rejeitada"', 'enviada', 'rejeitada'),
  (3, 1, 'comment', 'Cliente indicou que o tom ficou mais escuro do que esperado.', NULL, NULL),
  (4, 1, 'status_change', 'Amostra registrada e enviada para Estofados Premium', NULL, 'enviada');
