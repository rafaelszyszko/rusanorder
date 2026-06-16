-- ============================================================
-- Entrega 3 — Amostras de Couro e Notificações In-App (RF9, RF10)
-- Migração incremental — aplicar sobre o schema da Entrega 2.
-- Uso: USE rusanorder; SOURCE migrations/003_entrega_3_samples_notifications.sql;
-- ============================================================

-- Tabela samples (RF9.1, RF9.2)
CREATE TABLE IF NOT EXISTS samples (
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

-- Tabela sample_photos (RF9.10)
CREATE TABLE IF NOT EXISTS sample_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sample_id INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE
);

-- Tabela sample_comments (RF9.5)
CREATE TABLE IF NOT EXISTS sample_comments (
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

-- Vínculo bidirecional pedido <-> amostra (RF9.13)
-- Em MySQL antigo `ADD COLUMN IF NOT EXISTS` não existe; usamos procedure idempotente.
DROP PROCEDURE IF EXISTS add_orders_sample_id;
DELIMITER //
CREATE PROCEDURE add_orders_sample_id()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'sample_id'
  ) THEN
    ALTER TABLE orders
      ADD COLUMN sample_id INT NULL,
      ADD CONSTRAINT fk_orders_sample FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE SET NULL;
  END IF;
END //
DELIMITER ;
CALL add_orders_sample_id();
DROP PROCEDURE add_orders_sample_id;

-- Tabela notifications (RF10.1, RF10.4)
CREATE TABLE IF NOT EXISTS notifications (
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

-- Tabela notification_preferences (RF10.7)
CREATE TABLE IF NOT EXISTS notification_preferences (
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

-- Seed: 4 amostras de demonstração (código AM-{CLIENT_CODE}-{N})
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

-- Seed: notificações iniciais para o admin
INSERT INTO notifications (user_id, type, title, description, resource_type, resource_id, created_at) VALUES
  (1, 'sample_return', 'Retorno em amostra recebido', 'Cliente Artefatos Gaúcho SA registrou retorno em AM-GAUCHO-1', 'sample', 3, NOW() - INTERVAL 2 DAY),
  (1, 'new_order', 'Novo pedido criado', 'Pedido BVISTA-3 foi criado', 'order', 3, NOW() - INTERVAL 1 DAY),
  (1, 'status_change', 'Status do pedido alterado', 'Pedido foi movido para em_producao', 'order', 2, NOW() - INTERVAL 6 HOUR);
