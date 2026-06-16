import { connection } from '../config/db.js';

export const listClients = (req, res) => {
  const sql = `
    SELECT c.*, GROUP_CONCAT(ce.email ORDER BY ce.id SEPARATOR ', ') as emails
    FROM clients c
    LEFT JOIN client_emails ce ON ce.client_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `;
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results.map(r => ({ ...r, emails_list: r.emails ? r.emails.split(', ') : [] })));
  });
};

export const getClientById = (req, res) => {
  connection.query('SELECT * FROM clients WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) return res.status(404).json({ message: 'Cliente não encontrado' });

    const client = results[0];
    connection.query('SELECT id, email FROM client_emails WHERE client_id = ? ORDER BY id', [req.params.id], (err, emails) => {
      if (err) return res.status(500).json(err);
      res.json({ ...client, emails_list: emails.map(e => e.email) });
    });
  });
};

export const createClient = (req, res) => {
  const { name, code, cnpj, emails, phone, address, city, state } = req.body;
  if (!name) return res.status(400).json({ message: 'Nome é obrigatório' });
  if (!code) return res.status(400).json({ message: 'Código é obrigatório' });

  connection.query(
    'INSERT INTO clients (name, code, cnpj, phone, address, city, state) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, code.toUpperCase(), cnpj || null, phone || null, address || null, city || null, state || null],
    (err, result) => {
      if (err) return res.status(500).json(err);

      const clientId = result.insertId;
      const emailList = (emails || []).filter(e => e && e.trim());

      if (emailList.length > 0) {
        const values = emailList.map(e => [clientId, e.trim()]);
        connection.query('INSERT INTO client_emails (client_id, email) VALUES ?', [values], (err) => {
          if (err) return res.status(500).json(err);
          res.status(201).json({ message: 'Cliente criado com sucesso', id: clientId });
        });
      } else {
        res.status(201).json({ message: 'Cliente criado com sucesso', id: clientId });
      }
    }
  );
};

export const updateClient = (req, res) => {
  const { name, cnpj, emails, phone, address, city, state } = req.body;

  connection.query('SELECT * FROM clients WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) return res.status(404).json({ message: 'Cliente não encontrado' });

    const c = results[0];
    const { code } = req.body;
    connection.query(
      'UPDATE clients SET name = ?, code = ?, cnpj = ?, phone = ?, address = ?, city = ?, state = ? WHERE id = ?',
      [name || c.name, code ? code.toUpperCase() : c.code, cnpj ?? c.cnpj, phone ?? c.phone, address ?? c.address, city ?? c.city, state ?? c.state, req.params.id],
      (err) => {
        if (err) return res.status(500).json(err);

        // Atualizar emails: remover todos e reinserir
        if (emails !== undefined) {
          connection.query('DELETE FROM client_emails WHERE client_id = ?', [req.params.id], (err) => {
            if (err) return res.status(500).json(err);

            const emailList = (emails || []).filter(e => e && e.trim());
            if (emailList.length > 0) {
              const values = emailList.map(e => [req.params.id, e.trim()]);
              connection.query('INSERT INTO client_emails (client_id, email) VALUES ?', [values], (err) => {
                if (err) return res.status(500).json(err);
                res.json({ message: 'Cliente atualizado com sucesso' });
              });
            } else {
              res.json({ message: 'Cliente atualizado com sucesso' });
            }
          });
        } else {
          res.json({ message: 'Cliente atualizado com sucesso' });
        }
      }
    );
  });
};

export const deleteClient = (req, res) => {
  connection.query('DELETE FROM clients WHERE id = ?', [req.params.id], (err, result) => {
    if (err) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2')
        return res.status(409).json({ message: 'Cliente possui pedidos vinculados e não pode ser excluído' });
      return res.status(500).json(err);
    }
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Cliente não encontrado' });
    res.json({ message: 'Cliente excluído com sucesso' });
  });
};

export const getClientHistory = (req, res) => {
  const sql = `
    SELECT o.id, o.status, o.total, o.notes, o.purchase_order, o.created_at, o.updated_at,
           u.name as created_by, c.code as client_code
    FROM orders o
    JOIN users u ON u.id = o.user_id
    JOIN clients c ON c.id = o.client_id
    WHERE o.client_id = ? AND o.deleted_at IS NULL
    ORDER BY o.created_at DESC
  `;
  connection.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};
