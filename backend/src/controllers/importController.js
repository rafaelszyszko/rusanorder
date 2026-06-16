import { connection } from '../config/db.js';
import { extractOrderFromPdf } from '../services/aiImportService.js';
import fs from 'fs';
import path from 'path';

function dbQuery(sql, params) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function createComment(orderId, userId, type, content, oldStatus, newStatus) {
  connection.query(
    'INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES (?, ?, ?, ?, ?, ?)',
    [orderId, userId, type, content, oldStatus || null, newStatus || null],
    () => {}
  );
}

// POST /imports/sessions — open a new import session
export const createSession = async (req, res) => {
  try {
    const result = await dbQuery(
      'INSERT INTO import_sessions (user_id, total_files) VALUES (?, 0)',
      [req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar sessão de importação', error: err.message });
  }
};

// POST /imports/sessions/:sessionId/files — upload a PDF and queue AI extraction
// Multer puts the file at req.file
export const uploadPdf = async (req, res) => {
  const { sessionId } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ message: 'Arquivo PDF é obrigatório' });

  let importId;
  try {
    // Verify session belongs to user (admin can see any)
    const sessions = await dbQuery('SELECT user_id FROM import_sessions WHERE id = ?', [sessionId]);
    if (sessions.length === 0) {
      await fs.promises.unlink(file.path).catch(() => {});
      return res.status(404).json({ message: 'Sessão não encontrada' });
    }
    if (sessions[0].user_id !== req.user.id && req.user.role !== 'admin') {
      await fs.promises.unlink(file.path).catch(() => {});
      return res.status(403).json({ message: 'Sem permissão para esta sessão' });
    }

    // Record the import row up-front so we can report progress
    const insert = await dbQuery(
      `INSERT INTO pdf_imports (user_id, session_id, filename, file_path, mime_type, size_bytes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'em_processamento')`,
      [req.user.id, sessionId, file.originalname, file.path, file.mimetype, file.size]
    );
    importId = insert.insertId;
    await dbQuery('UPDATE import_sessions SET total_files = total_files + 1 WHERE id = ?', [sessionId]);

    // Load clients for the AI to match against
    const clients = await dbQuery('SELECT id, name, cnpj, code FROM clients');

    // Call the AI — this may take a few seconds; we keep the HTTP request open
    const { extracted } = await extractOrderFromPdf(file.path, clients);

    // Compute average confidence numerically (alta=1, media=0.5, baixa=0.25)
    const conf = { alta: 1, media: 0.5, baixa: 0.25 };
    const allConfs = [
      conf[extracted.client_match?.confidence] || 0,
      conf[extracted.purchase_order?.confidence] || 0,
      ...(extracted.items || []).map((i) => conf[i.confidence] || 0),
    ];
    const avgConfidence = allConfs.length > 0 ? allConfs.reduce((a, b) => a + b, 0) / allConfs.length : 0;

    await dbQuery(
      `UPDATE pdf_imports
       SET status = 'aguardando_revisao', extracted_data = ?, confidence_score = ?
       WHERE id = ?`,
      [JSON.stringify(extracted), avgConfidence.toFixed(2), importId]
    );

    res.status(201).json({
      id: importId,
      status: 'aguardando_revisao',
      extracted,
      confidence_score: avgConfidence,
    });
  } catch (err) {
    // Mark the import as erro for traceability
    if (importId) {
      await dbQuery(
        "UPDATE pdf_imports SET status = 'erro', error_message = ? WHERE id = ?",
        [String(err.message || err).slice(0, 1000), importId]
      ).catch(() => {});
    }
    res.status(500).json({ message: 'Falha ao processar PDF', error: err.message });
  }
};

// GET /imports/:id — return the import + extracted data (for the review screen)
export const getImport = async (req, res) => {
  try {
    const rows = await dbQuery('SELECT * FROM pdf_imports WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Importação não encontrada' });
    const imp = rows[0];
    if (imp.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Sem permissão' });
    }
    // mysql2 já parseia colunas JSON pra objeto. Se vier como string (driver/versão antiga),
    // parseamos; se já for objeto, mantemos.
    const parsed = typeof imp.extracted_data === 'string'
      ? JSON.parse(imp.extracted_data)
      : imp.extracted_data;
    res.json({ ...imp, extracted_data: parsed });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar importação', error: err.message });
  }
};

// GET /imports/:id/file — download the original PDF (for review preview / order detail)
export const downloadPdf = async (req, res) => {
  try {
    const rows = await dbQuery('SELECT user_id, file_path, filename FROM pdf_imports WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Importação não encontrada' });
    const imp = rows[0];
    if (imp.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Sem permissão' });
    }
    if (!fs.existsSync(imp.file_path)) {
      return res.status(404).json({ message: 'Arquivo PDF não encontrado em disco' });
    }
    res.download(imp.file_path, imp.filename);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao baixar PDF', error: err.message });
  }
};

// POST /imports/:id/confirm — user confirms the reviewed payload, create the order
export const confirmImport = async (req, res) => {
  const { id } = req.params;
  const { client_id, purchase_order, notes, items } = req.body;

  if (!client_id) return res.status(400).json({ message: 'Cliente é obrigatório' });
  if (!items || items.length === 0) return res.status(400).json({ message: 'Adicione pelo menos um item' });

  try {
    const imports = await dbQuery('SELECT * FROM pdf_imports WHERE id = ?', [id]);
    if (imports.length === 0) return res.status(404).json({ message: 'Importação não encontrada' });
    const imp = imports[0];
    if (imp.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Sem permissão' });
    }
    if (imp.status === 'concluida') {
      return res.status(400).json({ message: 'Importação já foi convertida em pedido' });
    }

    // Server-side total recalculation (RF07 RN: never trust frontend)
    const total = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0);

    const orderResult = await dbQuery(
      'INSERT INTO orders (client_id, user_id, purchase_order, notes, total, status) VALUES (?, ?, ?, ?, ?, ?)',
      [client_id, req.user.id, purchase_order || null, notes || null, total, 'novo']
    );
    const orderId = orderResult.insertId;

    const itemValues = items.map((i) => [
      orderId,
      i.description,
      i.unit || 'm²',
      Number(i.quantity),
      Number(i.unit_price),
      Number(i.quantity) * Number(i.unit_price),
    ]);
    await dbQuery(
      'INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES ?',
      [itemValues]
    );

    createComment(orderId, req.user.id, 'status_change', `Pedido criado via importação IA (#${id})`, null, 'novo');

    await dbQuery(
      "UPDATE pdf_imports SET status = 'concluida', order_id = ? WHERE id = ?",
      [orderId, id]
    );

    res.status(201).json({ message: 'Pedido criado com sucesso', order_id: orderId });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao confirmar importação', error: err.message });
  }
};

// PATCH /imports/:id/skip — mark this file as skipped
export const skipImport = async (req, res) => {
  try {
    const result = await dbQuery(
      "UPDATE pdf_imports SET status = 'cancelada' WHERE id = ? AND user_id = ? AND status = 'aguardando_revisao'",
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Importação não encontrada ou já processada' });
    res.json({ message: 'Importação pulada' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao pular importação', error: err.message });
  }
};

// POST /imports/:id/reprocess — re-run AI extraction on an errored file
export const reprocessImport = async (req, res) => {
  try {
    const rows = await dbQuery('SELECT * FROM pdf_imports WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Importação não encontrada' });
    const imp = rows[0];
    if (imp.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Sem permissão' });
    }
    if (imp.status === 'concluida') {
      return res.status(400).json({ message: 'Importação já foi convertida em pedido — não é possível reprocessar' });
    }

    // Create a NEW import row (audit trail preserved) re-using the same file
    const newRow = await dbQuery(
      `INSERT INTO pdf_imports (user_id, session_id, filename, file_path, mime_type, size_bytes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'em_processamento')`,
      [imp.user_id, imp.session_id, imp.filename, imp.file_path, imp.mime_type, imp.size_bytes]
    );
    const newId = newRow.insertId;

    const clients = await dbQuery('SELECT id, name, cnpj, code FROM clients');
    const { extracted } = await extractOrderFromPdf(imp.file_path, clients);

    const conf = { alta: 1, media: 0.5, baixa: 0.25 };
    const allConfs = [
      conf[extracted.client_match?.confidence] || 0,
      conf[extracted.purchase_order?.confidence] || 0,
      ...(extracted.items || []).map((i) => conf[i.confidence] || 0),
    ];
    const avgConfidence = allConfs.length > 0 ? allConfs.reduce((a, b) => a + b, 0) / allConfs.length : 0;

    await dbQuery(
      `UPDATE pdf_imports SET status = 'aguardando_revisao', extracted_data = ?, confidence_score = ? WHERE id = ?`,
      [JSON.stringify(extracted), avgConfidence.toFixed(2), newId]
    );

    res.status(201).json({ id: newId, status: 'aguardando_revisao', extracted, confidence_score: avgConfidence });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao reprocessar', error: err.message });
  }
};

// GET /imports — list session-grouped history (with filters)
export const listImports = async (req, res) => {
  const { status, date_from, date_to, search } = req.query;
  const params = [];
  const wheres = [];

  if (req.user.role !== 'admin') {
    wheres.push('pi.user_id = ?');
    params.push(req.user.id);
  }
  if (status && status !== 'todos') {
    wheres.push('pi.status = ?');
    params.push(status);
  }
  if (date_from) {
    wheres.push('pi.created_at >= ?');
    params.push(date_from);
  }
  if (date_to) {
    wheres.push('pi.created_at <= ?');
    params.push(date_to + ' 23:59:59');
  }
  if (search) {
    wheres.push('pi.filename LIKE ?');
    params.push(`%${search}%`);
  }

  const whereClause = wheres.length > 0 ? `WHERE ${wheres.join(' AND ')}` : '';
  const sql = `
    SELECT pi.*,
           CASE WHEN u.deleted_at IS NOT NULL THEN CONCAT(u.name, ' (inativo)') ELSE u.name END as user_name,
           o.id as linked_order_id,
           c.code as linked_client_code
    FROM pdf_imports pi
    LEFT JOIN users u ON u.id = pi.user_id
    LEFT JOIN orders o ON o.id = pi.order_id
    LEFT JOIN clients c ON c.id = o.client_id
    ${whereClause}
    ORDER BY pi.created_at DESC
  `;

  try {
    const rows = await dbQuery(sql, params);
    res.json(rows.map((r) => ({ ...r, extracted_data: undefined })));
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar importações', error: err.message });
  }
};

// GET /imports/order/:orderId — find import linked to a given order (for "Documento original" link)
export const getImportByOrder = async (req, res) => {
  try {
    const rows = await dbQuery(
      'SELECT id, filename, created_at FROM pdf_imports WHERE order_id = ? LIMIT 1',
      [req.params.orderId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Sem documento original' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
};
