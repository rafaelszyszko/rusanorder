import { connection } from '../config/db.js';
import { createNotification, createNotificationsForAdmins } from '../services/notificationService.js';

function dbQueryP(sql, params) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Mapa de transicoes validas baseado nos fluxos do Curtume Rusan
const validTransitions = {
  novo:                  ['aguardando_pcp', 'ajuste_necessario', 'cancelado'],
  aguardando_pcp:        ['aguardando_cliente', 'recusado_pcp'],
  aguardando_cliente:    ['aprovado', 'aguardando_pcp', 'cancelado'],
  ajuste_necessario:     ['novo', 'cancelado'],
  recusado_pcp:          ['novo'],
  aprovado:              ['em_producao', 'cancelado'],
  em_producao:           ['enviado', 'atraso_producao', 'cancelado'],
  atraso_producao:       ['aguardando_cliente', 'cancelado'],
  enviado:               ['entregue', 'entregue_divergencia'],
  entregue:              ['novo'],
  entregue_divergencia:  ['novo'],
  cancelado:             ['novo'],
};

const allStatuses = Object.keys(validTransitions);

// Helper: create a comment (used internally for status changes)
function createComment(orderId, userId, type, content, oldStatus, newStatus) {
  connection.query(
    'INSERT INTO order_comments (order_id, user_id, type, content, old_status, new_status) VALUES (?, ?, ?, ?, ?, ?)',
    [orderId, userId, type, content, oldStatus || null, newStatus || null],
    () => {} // fire and forget
  );
}

export const listOrders = (req, res) => {
  const sql = `
    SELECT o.*, c.name as client_name, c.code as client_code,
           CASE WHEN u.deleted_at IS NOT NULL THEN CONCAT(u.name, ' (inativo)') ELSE u.name END as created_by,
           c.cnpj as client_cnpj
    FROM orders o
    JOIN clients c ON c.id = o.client_id
    LEFT JOIN users u ON u.id = o.user_id
    WHERE o.deleted_at IS NULL
    ORDER BY o.created_at DESC
  `;
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

export const getOrderById = (req, res) => {
  const sqlOrder = `
    SELECT o.*, c.name as client_name, c.code as client_code,
           CASE WHEN u.deleted_at IS NOT NULL THEN CONCAT(u.name, ' (inativo)') ELSE u.name END as created_by,
           c.cnpj as client_cnpj,
           s.code as sample_code, s.acceptance_at as sample_acceptance_at,
           (SELECT sp.id FROM sample_photos sp WHERE sp.sample_id = o.sample_id ORDER BY sp.id ASC LIMIT 1) AS sample_first_photo_id
    FROM orders o
    JOIN clients c ON c.id = o.client_id
    LEFT JOIN users u ON u.id = o.user_id
    LEFT JOIN samples s ON s.id = o.sample_id
    WHERE o.id = ? AND o.deleted_at IS NULL
  `;
  const sqlItems = `
    SELECT * FROM order_items WHERE order_id = ?
  `;
  const sqlComments = `
    SELECT oc.*,
           CASE WHEN u.deleted_at IS NOT NULL THEN CONCAT(u.name, ' (inativo)') ELSE u.name END as user_name
    FROM order_comments oc
    LEFT JOIN users u ON u.id = oc.user_id
    WHERE oc.order_id = ?
    ORDER BY oc.created_at ASC
  `;

  connection.query(sqlOrder, [req.params.id], (err, orderResults) => {
    if (err) return res.status(500).json(err);
    if (orderResults.length === 0) return res.status(404).json({ message: 'Pedido não encontrado' });

    connection.query(sqlItems, [req.params.id], (err, items) => {
      if (err) return res.status(500).json(err);

      connection.query(sqlComments, [req.params.id], (err, comments) => {
        if (err) return res.status(500).json(err);
        res.json({ ...orderResults[0], items, comments });
      });
    });
  });
};

export const createOrder = async (req, res) => {
  const { client_id, purchase_order, notes, items, sample_id } = req.body;

  if (!client_id) return res.status(400).json({ message: 'Cliente é obrigatório' });
  if (!items || items.length === 0) return res.status(400).json({ message: 'Adicione pelo menos um item' });

  const total = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0);

  try {
    let resolvedSampleId = null;
    if (sample_id) {
      const sampleRows = await dbQueryP('SELECT * FROM samples WHERE id = ?', [sample_id]);
      if (sampleRows.length === 0) {
        return res.status(400).json({ message: 'Amostra inexistente' });
      }
      const sample = sampleRows[0];
      if (sample.status !== 'aceite_recebido') {
        return res.status(400).json({ message: 'Amostra precisa estar em "aceite_recebido" para gerar pedido' });
      }
      resolvedSampleId = sample.id;
    }

    const result = await dbQueryP(
      'INSERT INTO orders (client_id, user_id, purchase_order, notes, total, status, sample_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [client_id, req.user.id, purchase_order || null, notes || null, total, 'novo', resolvedSampleId]
    );
    const orderId = result.insertId;

    const values = items.map((i) => [
      orderId, i.description, i.unit || 'm²',
      Number(i.quantity), Number(i.unit_price), Number(i.quantity) * Number(i.unit_price),
    ]);
    await dbQueryP(
      'INSERT INTO order_items (order_id, description, unit, quantity, unit_price, subtotal) VALUES ?',
      [values]
    );

    createComment(orderId, req.user.id, 'status_change', 'Pedido criado', null, 'novo');

    if (resolvedSampleId) {
      // Vincula pedido <-> amostra de forma atômica (transição automática)
      await dbQueryP(
        "UPDATE samples SET status = 'pedido_gerado', order_id = ? WHERE id = ?",
        [orderId, resolvedSampleId]
      );
      await dbQueryP(
        `INSERT INTO sample_comments (sample_id, user_id, type, content, old_status, new_status)
         VALUES (?, ?, 'status_change', ?, 'aceite_recebido', 'pedido_gerado')`,
        [resolvedSampleId, req.user.id, `Pedido gerado a partir desta amostra (pedido #${orderId})`]
      );
    }

    await createNotificationsForAdmins({
      type: 'new_order',
      title: 'Novo pedido criado',
      description: `Pedido #${orderId} foi criado`,
      resourceType: 'order',
      resourceId: orderId,
      excludeUserId: req.user.id,
    });

    res.status(201).json({ message: 'Pedido criado com sucesso', id: orderId });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar pedido', error: err.message });
  }
};

export const updateOrderStatus = (req, res) => {
  const { status, comment } = req.body;

  if (!allStatuses.includes(status))
    return res.status(400).json({ message: 'Status inválido' });

  connection.query('SELECT status FROM orders WHERE id = ? AND deleted_at IS NULL', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (rows.length === 0) return res.status(404).json({ message: 'Pedido não encontrado' });

    const currentStatus = rows[0].status;
    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Transição inválida: "${currentStatus}" não pode ir para "${status}". Permitidos: ${allowed.length > 0 ? allowed.join(', ') : 'nenhum (status final)'}`,
      });
    }

    connection.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id],
      async (err) => {
        if (err) return res.status(500).json(err);

        // Log status change as comment
        const autoMsg = `Status alterado de "${currentStatus}" para "${status}"`;
        const fullMsg = comment ? `${autoMsg}\n\n${comment}` : autoMsg;
        createComment(req.params.id, req.user.id, 'status_change', fullMsg, currentStatus, status);

        // Notifica o criador do pedido (se não for ele mudando)
        try {
          const ownerRows = await dbQueryP('SELECT user_id FROM orders WHERE id = ?', [req.params.id]);
          if (ownerRows.length > 0 && ownerRows[0].user_id !== req.user.id) {
            await createNotification({
              userId: ownerRows[0].user_id,
              type: 'status_change',
              title: 'Status do pedido alterado',
              description: `Pedido #${req.params.id} foi movido para "${status}"`,
              resourceType: 'order',
              resourceId: Number(req.params.id),
            });
          }
          if (status === 'atraso_producao') {
            const o = ownerRows[0];
            if (o) {
              await createNotification({
                userId: o.user_id,
                type: 'production_delay',
                title: 'Pedido com atraso de produção',
                description: `Pedido #${req.params.id} entrou em atraso de produção`,
                resourceType: 'order',
                resourceId: Number(req.params.id),
              });
            }
          }
        } catch { /* não bloqueia */ }

        res.json({ message: 'Status atualizado com sucesso' });
      }
    );
  });
};

export const addComment = (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ message: 'Comentário não pode ser vazio' });

  connection.query('SELECT id FROM orders WHERE id = ? AND deleted_at IS NULL', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (rows.length === 0) return res.status(404).json({ message: 'Pedido não encontrado' });

    connection.query(
      'INSERT INTO order_comments (order_id, user_id, type, content) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user.id, 'comment', content.trim()],
      async (err, result) => {
        if (err) return res.status(500).json(err);

        try {
          const ownerRows = await dbQueryP('SELECT user_id FROM orders WHERE id = ?', [req.params.id]);
          if (ownerRows.length > 0 && ownerRows[0].user_id !== req.user.id) {
            await createNotification({
              userId: ownerRows[0].user_id,
              type: 'comment_received',
              title: 'Comentário recebido em pedido',
              description: content.trim().slice(0, 200),
              resourceType: 'order',
              resourceId: Number(req.params.id),
            });
          }
        } catch { /* ignore */ }

        res.status(201).json({ message: 'Comentário adicionado', id: result.insertId });
      }
    );
  });
};

export const deleteComment = (req, res) => {
  const { commentId } = req.params;

  connection.query(
    'SELECT * FROM order_comments WHERE id = ? AND type = ?',
    [commentId, 'comment'],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      if (rows.length === 0) return res.status(404).json({ message: 'Comentário não encontrado' });
      if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Você só pode excluir seus próprios comentários' });
      }

      connection.query('DELETE FROM order_comments WHERE id = ?', [commentId], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Comentário excluído' });
      });
    }
  );
};

export const getValidTransitions = (req, res) => {
  const { status } = req.params;
  if (!allStatuses.includes(status)) {
    return res.status(400).json({ message: 'Status inválido' });
  }
  res.json({ current: status, transitions: validTransitions[status] });
};

export const softDeleteOrder = (req, res) => {
  connection.query(
    'UPDATE orders SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Pedido não encontrado' });
      createComment(req.params.id, req.user.id, 'status_change', 'Pedido movido para a lixeira', null, null);
      res.json({ message: 'Pedido movido para a lixeira' });
    }
  );
};

export const listDeletedOrders = (req, res) => {
  const sql = `
    SELECT o.*, c.name as client_name, c.code as client_code,
           CASE WHEN u.deleted_at IS NOT NULL THEN CONCAT(u.name, ' (inativo)') ELSE u.name END as created_by,
           DATEDIFF(NOW(), o.deleted_at) as days_in_trash
    FROM orders o
    JOIN clients c ON c.id = o.client_id
    LEFT JOIN users u ON u.id = o.user_id
    WHERE o.deleted_at IS NOT NULL
    ORDER BY o.deleted_at DESC
  `;
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

export const restoreOrder = (req, res) => {
  connection.query(
    'UPDATE orders SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL',
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Pedido não encontrado na lixeira' });
      createComment(req.params.id, req.user.id, 'status_change', 'Pedido restaurado da lixeira', null, null);
      res.json({ message: 'Pedido restaurado com sucesso' });
    }
  );
};

export const permanentDeleteOrder = (req, res) => {
  connection.query(
    'DELETE FROM orders WHERE id = ? AND deleted_at IS NOT NULL',
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Pedido não encontrado na lixeira' });
      res.json({ message: 'Pedido excluído permanentemente' });
    }
  );
};
