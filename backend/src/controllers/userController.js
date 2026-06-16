import bcrypt from 'bcryptjs';
import { connection } from '../config/db.js';

// ===== Admin =====

export const listUsers = (req, res) => {
  const sql = `
    SELECT u.id, u.name, u.email, u.role, u.created_at, u.deleted_at,
           COUNT(DISTINCT o.id) as order_count,
           COUNT(DISTINCT oc.id) as comment_count
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    LEFT JOIN order_comments oc ON oc.user_id = u.id
    WHERE u.deleted_at IS NULL
    GROUP BY u.id
    ORDER BY u.id
  `;
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

export const listDeletedUsers = (req, res) => {
  const sql = `
    SELECT u.id, u.name, u.email, u.role, u.created_at, u.deleted_at,
           COUNT(DISTINCT o.id) as order_count,
           COUNT(DISTINCT oc.id) as comment_count
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    LEFT JOIN order_comments oc ON oc.user_id = u.id
    WHERE u.deleted_at IS NOT NULL
    GROUP BY u.id
    ORDER BY u.deleted_at DESC
  `;
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

export const getUserById = (req, res) => {
  const sql = `
    SELECT u.id, u.name, u.email, u.role, u.created_at, u.deleted_at,
           COUNT(DISTINCT o.id) as order_count,
           COUNT(DISTINCT oc.id) as comment_count
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    LEFT JOIN order_comments oc ON oc.user_id = u.id
    WHERE u.id = ?
    GROUP BY u.id
  `;
  connection.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0)
      return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json(results[0]);
  });
};

export const getUserOrders = (req, res) => {
  const sql = `
    SELECT o.id, o.status, o.total, o.created_at, o.deleted_at,
           c.name as client_name, c.code as client_code
    FROM orders o
    JOIN clients c ON c.id = o.client_id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `;
  connection.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

export const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });

  const hashedPassword = await bcrypt.hash(password, 10);

  connection.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hashedPassword, role || 'user'],
    (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.status(409).json({ message: 'Email já cadastrado' });
        return res.status(500).json(err);
      }
      res.status(201).json({ message: 'Usuário criado com sucesso' });
    }
  );
};

export const updateUser = (req, res) => {
  const { name, email, password, role } = req.body;

  connection.query(
    'SELECT * FROM users WHERE id = ?',
    [req.params.id],
    async (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.length === 0)
        return res.status(404).json({ message: 'Usuário não encontrado' });

      const user = results[0];
      const newName = name || user.name;
      const newEmail = email || user.email;
      const newRole = role || user.role;
      let newPassword = user.password;

      if (password) {
        newPassword = await bcrypt.hash(password, 10);
      }

      connection.query(
        'UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?',
        [newName, newEmail, newPassword, newRole, req.params.id],
        (err) => {
          if (err) {
            if (err.code === 'ER_DUP_ENTRY')
              return res.status(409).json({ message: 'Email já cadastrado' });
            return res.status(500).json(err);
          }
          res.json({ message: 'Usuário atualizado com sucesso' });
        }
      );
    }
  );
};

export const deleteUser = (req, res) => {
  connection.query(
    'UPDATE users SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.affectedRows === 0)
        return res.status(404).json({ message: 'Usuário não encontrado' });
      res.json({ message: 'Usuário desativado com sucesso' });
    }
  );
};

export const restoreUser = (req, res) => {
  connection.query(
    'UPDATE users SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL',
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.affectedRows === 0)
        return res.status(404).json({ message: 'Usuário não encontrado na lixeira' });
      res.json({ message: 'Usuário restaurado com sucesso' });
    }
  );
};

// ===== Perfil (próprio usuário) =====

export const getProfile = (req, res) => {
  connection.query(
    'SELECT id, name, email, role FROM users WHERE id = ?',
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.length === 0)
        return res.status(404).json({ message: 'Usuário não encontrado' });

      res.json(results[0]);
    }
  );
};

export const updateProfile = (req, res) => {
  const { name, email, password } = req.body;

  connection.query(
    'SELECT * FROM users WHERE id = ?',
    [req.user.id],
    async (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.length === 0)
        return res.status(404).json({ message: 'Usuário não encontrado' });

      const user = results[0];
      const newName = name || user.name;
      const newEmail = email || user.email;
      let newPassword = user.password;

      if (password) {
        newPassword = await bcrypt.hash(password, 10);
      }

      connection.query(
        'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?',
        [newName, newEmail, newPassword, req.user.id],
        (err) => {
          if (err) return res.status(500).json(err);
          res.json({ message: 'Perfil atualizado com sucesso' });
        }
      );
    }
  );
};
