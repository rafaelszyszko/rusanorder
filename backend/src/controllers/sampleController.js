import { connection } from '../config/db.js';
import { createNotification, createNotificationsForAdmins } from '../services/notificationService.js';
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

// Máquina de estados (RF9.2, RF9.11) - 8 status
export const validTransitions = {
  enviada:               ['recebida_pelo_cliente', 'em_analise', 'rejeitada', 'arquivada'],
  recebida_pelo_cliente: ['em_analise', 'aprovada', 'rejeitada', 'arquivada'],
  em_analise:            ['aprovada', 'rejeitada', 'arquivada'],
  aprovada:              ['aceite_recebido', 'arquivada'],
  aceite_recebido:       ['pedido_gerado', 'arquivada'],
  rejeitada:             ['arquivada'],
  pedido_gerado:         ['arquivada'],
  arquivada:             [],
};

const allStatuses = Object.keys(validTransitions);

async function nextSampleCode(clientId) {
  const clientRows = await dbQuery('SELECT code FROM clients WHERE id = ?', [clientId]);
  if (clientRows.length === 0) throw new Error('Cliente inexistente');
  const clientCode = clientRows[0].code;
  // Sequencial dentro do cliente: conta amostras existentes do cliente + 1
  const seqRows = await dbQuery('SELECT COUNT(*) AS total FROM samples WHERE client_id = ?', [clientId]);
  const seq = Number(seqRows[0].total) + 1;
  return `AM-${clientCode}-${seq}`;
}

function addAutoComment(sampleId, userId, type, content, oldStatus, newStatus) {
  connection.query(
    'INSERT INTO sample_comments (sample_id, user_id, type, content, old_status, new_status) VALUES (?, ?, ?, ?, ?, ?)',
    [sampleId, userId, type, content, oldStatus || null, newStatus || null],
    () => {}
  );
}

// GET /samples - listar com filtros
export const listSamples = async (req, res) => {
  const { status, client_id, search, date_from, date_to } = req.query;
  const params = [];
  const wheres = [];

  if (status && status !== 'todos') {
    wheres.push('s.status = ?');
    params.push(status);
  }
  if (client_id) {
    wheres.push('s.client_id = ?');
    params.push(client_id);
  }
  if (date_from) {
    wheres.push('s.sent_at >= ?');
    params.push(date_from);
  }
  if (date_to) {
    wheres.push('s.sent_at <= ?');
    params.push(date_to);
  }
  if (search) {
    wheres.push('(s.description LIKE ? OR s.tracking_code LIKE ? OR s.code LIKE ?)');
    const v = `%${search}%`;
    params.push(v, v, v);
  }

  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';
  const sql = `
    SELECT s.*, c.name AS client_name, c.code AS client_code,
           CASE WHEN u.deleted_at IS NOT NULL THEN CONCAT(u.name, ' (inativo)') ELSE u.name END AS created_by,
           DATEDIFF(COALESCE(s.returned_at, NOW()), s.sent_at) AS days_since_sent,
           (SELECT COUNT(*) FROM sample_photos sp WHERE sp.sample_id = s.id) AS photos_count
    FROM samples s
    JOIN clients c ON c.id = s.client_id
    LEFT JOIN users u ON u.id = s.user_id
    ${where}
    ORDER BY s.created_at DESC
  `;
  try {
    const rows = await dbQuery(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar amostras', error: err.message });
  }
};

// GET /samples/:id
export const getSampleById = async (req, res) => {
  try {
    const rows = await dbQuery(
      `SELECT s.*, c.name AS client_name, c.code AS client_code, c.cnpj AS client_cnpj,
              CASE WHEN u.deleted_at IS NOT NULL THEN CONCAT(u.name, ' (inativo)') ELSE u.name END AS created_by,
              o.id AS linked_order_id, o.status AS linked_order_status, o.total AS linked_order_total, o.created_at AS linked_order_created_at,
              co.code AS linked_order_client_code
       FROM samples s
       JOIN clients c ON c.id = s.client_id
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN orders o ON o.id = s.order_id
       LEFT JOIN clients co ON co.id = o.client_id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Amostra não encontrada' });
    const sample = rows[0];

    const photos = await dbQuery('SELECT * FROM sample_photos WHERE sample_id = ? ORDER BY id ASC', [sample.id]);
    const comments = await dbQuery(
      `SELECT sc.*, CASE WHEN u.deleted_at IS NOT NULL THEN CONCAT(u.name, ' (inativo)') ELSE u.name END AS user_name
       FROM sample_comments sc
       LEFT JOIN users u ON u.id = sc.user_id
       WHERE sc.sample_id = ?
       ORDER BY sc.created_at ASC`,
      [sample.id]
    );
    res.json({ ...sample, photos, comments });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar amostra', error: err.message });
  }
};

// POST /samples
export const createSample = async (req, res) => {
  const {
    client_id, description, leather_type, thickness_mm, color, finish,
    carrier, tracking_code, sent_at, notes,
  } = req.body;

  if (!client_id) return res.status(400).json({ message: 'Cliente é obrigatório' });
  if (!description || !description.trim()) return res.status(400).json({ message: 'Descrição é obrigatória' });
  if (!sent_at) return res.status(400).json({ message: 'Data de envio é obrigatória' });
  if (new Date(sent_at) > new Date()) {
    return res.status(400).json({ message: 'Data de envio não pode ser futura' });
  }

  try {
    const clientRows = await dbQuery('SELECT id, name FROM clients WHERE id = ?', [client_id]);
    if (clientRows.length === 0) return res.status(400).json({ message: 'Cliente inexistente' });

    const code = await nextSampleCode(client_id);
    const result = await dbQuery(
      `INSERT INTO samples (code, client_id, user_id, description, leather_type, thickness_mm, color, finish, carrier, tracking_code, sent_at, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'enviada')`,
      [
        code, client_id, req.user.id, description.trim(),
        leather_type || 'bovino', thickness_mm || null, color || null, finish || null,
        carrier || null, tracking_code || null, sent_at, notes || null,
      ]
    );

    addAutoComment(result.insertId, req.user.id, 'status_change', `Amostra registrada e enviada para ${clientRows[0].name}`, null, 'enviada');

    res.status(201).json({ message: 'Amostra criada com sucesso', id: result.insertId, code });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar amostra', error: err.message });
  }
};

// PATCH /samples/:id
export const updateSample = async (req, res) => {
  const { description, leather_type, thickness_mm, color, finish, carrier, tracking_code, notes } = req.body;
  try {
    const rows = await dbQuery('SELECT id FROM samples WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Amostra não encontrada' });

    await dbQuery(
      `UPDATE samples SET description = ?, leather_type = ?, thickness_mm = ?, color = ?, finish = ?, carrier = ?, tracking_code = ?, notes = ? WHERE id = ?`,
      [
        description, leather_type || 'bovino', thickness_mm || null, color || null, finish || null,
        carrier || null, tracking_code || null, notes || null, req.params.id,
      ]
    );
    res.json({ message: 'Amostra atualizada' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar amostra', error: err.message });
  }
};

// PATCH /samples/:id/status
export const updateSampleStatus = async (req, res) => {
  const { status, comment, returned_at } = req.body;

  if (!allStatuses.includes(status)) {
    return res.status(400).json({ message: 'Status inválido' });
  }

  try {
    const rows = await dbQuery('SELECT * FROM samples WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Amostra não encontrada' });
    const sample = rows[0];
    const allowed = validTransitions[sample.status] || [];

    if (!allowed.includes(status)) {
      const allowedStr = allowed.length > 0 ? allowed.join(', ') : 'nenhum (status final)';
      const baseMsg = `Transição inválida: "${sample.status}" não pode ir para "${status}". Permitidos: ${allowedStr}`;
      // RF9.4 / RF9.11 - mensagem específica para pulo de aprovada -> pedido_gerado
      if (sample.status === 'aprovada' && status === 'pedido_gerado') {
        return res.status(400).json({ message: 'Transição inválida: aprovada → pedido_gerado. Confirme o aceite primeiro.' });
      }
      return res.status(400).json({ message: baseMsg });
    }

    const updates = ['status = ?'];
    const params = [status];
    if (returned_at) {
      updates.push('returned_at = ?');
      params.push(returned_at);
    }
    params.push(req.params.id);
    await dbQuery(`UPDATE samples SET ${updates.join(', ')} WHERE id = ?`, params);

    const autoMsg = `Status alterado de "${sample.status}" para "${status}"`;
    const fullMsg = comment ? `${autoMsg}\n\n${comment}` : autoMsg;
    addAutoComment(req.params.id, req.user.id, 'status_change', fullMsg, sample.status, status);

    // Notificação para o criador da amostra quando há retorno de cliente
    if (['aprovada', 'rejeitada', 'em_analise'].includes(status) && sample.user_id !== req.user.id) {
      await createNotification({
        userId: sample.user_id,
        type: 'sample_return',
        title: 'Retorno em amostra recebido',
        description: `${sample.code} mudou para "${status}"`,
        resourceType: 'sample',
        resourceId: sample.id,
      });
    }

    res.json({ message: 'Status atualizado' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar status', error: err.message });
  }
};

// POST /samples/:id/confirm-acceptance (RF9.11)
export const confirmAcceptance = async (req, res) => {
  const { acceptance_at, acceptance_notes } = req.body;
  if (!acceptance_at) return res.status(400).json({ message: 'Data do aceite é obrigatória' });
  if (new Date(acceptance_at) > new Date()) {
    return res.status(400).json({ message: 'Data do aceite não pode ser futura' });
  }

  try {
    const rows = await dbQuery('SELECT * FROM samples WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Amostra não encontrada' });
    const sample = rows[0];

    if (sample.status !== 'aprovada') {
      return res.status(400).json({ message: 'Apenas amostras com status "aprovada" podem registrar aceite.' });
    }

    await dbQuery(
      `UPDATE samples SET status = 'aceite_recebido', acceptance_at = ?, acceptance_notes = ? WHERE id = ?`,
      [acceptance_at, acceptance_notes || null, req.params.id]
    );

    const formatted = new Date(acceptance_at).toLocaleDateString('pt-BR');
    const content = `Aceite recebido em ${formatted}${acceptance_notes ? ` — ${acceptance_notes}` : ''}`;
    addAutoComment(req.params.id, req.user.id, 'status_change', content, 'aprovada', 'aceite_recebido');

    // Notifica admins
    await createNotificationsForAdmins({
      type: 'sample_acceptance',
      title: 'Aceite registrado em amostra',
      description: `${sample.code} teve aceite registrado em ${formatted}`,
      resourceType: 'sample',
      resourceId: sample.id,
      excludeUserId: req.user.id,
    });

    res.json({ message: 'Aceite registrado com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao registrar aceite', error: err.message });
  }
};

// GET /samples/:id/prefill - retorna dados para pré-preencher pedido (RF9.12)
export const getSamplePrefill = async (req, res) => {
  try {
    const rows = await dbQuery(
      `SELECT s.*, c.name AS client_name, c.code AS client_code
       FROM samples s
       JOIN clients c ON c.id = s.client_id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Amostra não encontrada' });
    const sample = rows[0];

    if (sample.status !== 'aceite_recebido') {
      return res.status(400).json({ message: 'A amostra precisa estar com status "aceite_recebido" para gerar pedido.' });
    }

    const leatherTypeLabel = {
      bovino: 'Couro Bovino',
      ovino: 'Couro Ovino',
      caprino: 'Couro Caprino',
      suino: 'Couro Suíno',
      outros: 'Couro',
    }[sample.leather_type] || 'Couro';

    const parts = [
      leatherTypeLabel,
      sample.finish,
      sample.color,
      sample.thickness_mm ? `${sample.thickness_mm} mm` : null,
    ].filter(Boolean);

    const description = parts.join(' ');
    const formatted = sample.acceptance_at ? new Date(sample.acceptance_at).toLocaleDateString('pt-BR') : '';

    res.json({
      sample_id: sample.id,
      client_id: sample.client_id,
      client_name: sample.client_name,
      client_code: sample.client_code,
      first_item_description: description,
      first_item_unit: 'm²',
      notes: `Pedido gerado a partir da amostra ${sample.code} — aceite recebido em ${formatted}`,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar prefill', error: err.message });
  }
};

// POST /samples/:id/comments
export const addSampleComment = async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ message: 'Comentário não pode ser vazio' });

  try {
    const rows = await dbQuery('SELECT id FROM samples WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Amostra não encontrada' });

    const result = await dbQuery(
      'INSERT INTO sample_comments (sample_id, user_id, type, content) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user.id, 'comment', content.trim()]
    );
    res.status(201).json({ id: result.insertId, message: 'Comentário adicionado' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao adicionar comentário', error: err.message });
  }
};

// DELETE /samples/:sampleId/comments/:commentId
export const deleteSampleComment = async (req, res) => {
  try {
    const rows = await dbQuery(
      'SELECT * FROM sample_comments WHERE id = ? AND type = ?',
      [req.params.commentId, 'comment']
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Comentário não encontrado' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Você só pode excluir seus próprios comentários' });
    }
    await dbQuery('DELETE FROM sample_comments WHERE id = ?', [req.params.commentId]);
    res.json({ message: 'Comentário excluído' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao excluir comentário', error: err.message });
  }
};

// POST /samples/:id/photos
export const uploadSamplePhoto = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Arquivo obrigatório' });

  try {
    const sampleRows = await dbQuery('SELECT id FROM samples WHERE id = ?', [req.params.id]);
    if (sampleRows.length === 0) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ message: 'Amostra não encontrada' });
    }

    const countRows = await dbQuery('SELECT COUNT(*) AS total FROM sample_photos WHERE sample_id = ?', [req.params.id]);
    if (countRows[0].total >= 5) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ message: 'Máximo de 5 fotos atingido' });
    }

    const insert = await dbQuery(
      'INSERT INTO sample_photos (sample_id, file_path, mime_type) VALUES (?, ?, ?)',
      [req.params.id, req.file.path, req.file.mimetype]
    );
    res.status(201).json({ id: insert.insertId, message: 'Foto adicionada' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao salvar foto', error: err.message });
  }
};

// GET /samples/photos/:id - servir imagem
export const downloadSamplePhoto = async (req, res) => {
  try {
    const rows = await dbQuery('SELECT * FROM sample_photos WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Foto não encontrada' });
    if (!fs.existsSync(rows[0].file_path)) return res.status(404).json({ message: 'Arquivo não encontrado em disco' });
    res.sendFile(path.resolve(rows[0].file_path));
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
};

// DELETE /samples/photos/:id
export const deleteSamplePhoto = async (req, res) => {
  try {
    const rows = await dbQuery('SELECT * FROM sample_photos WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Foto não encontrada' });
    await dbQuery('DELETE FROM sample_photos WHERE id = ?', [req.params.id]);
    await fs.promises.unlink(rows[0].file_path).catch(() => {});
    res.json({ message: 'Foto excluída' });
  } catch (err) {
    res.status(500).json({ message: 'Erro', error: err.message });
  }
};

// GET /samples/transitions/:status
export const getValidSampleTransitions = (req, res) => {
  const { status } = req.params;
  if (!allStatuses.includes(status)) return res.status(400).json({ message: 'Status inválido' });
  res.json({ current: status, transitions: validTransitions[status] });
};

// GET /samples/by-client/:clientId - histórico para tela do cliente (RF9.8)
export const listSamplesByClient = async (req, res) => {
  try {
    const rows = await dbQuery(
      `SELECT s.*, (SELECT COUNT(*) FROM sample_photos sp WHERE sp.sample_id = s.id) AS photos_count
       FROM samples s WHERE s.client_id = ? ORDER BY s.created_at DESC`,
      [req.params.clientId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar amostras', error: err.message });
  }
};
