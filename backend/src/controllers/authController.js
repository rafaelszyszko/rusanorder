import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connection } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export const login = (req, res) => {
  const { email, password } = req.body;

  connection.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.length === 0)
        return res.status(401).json({ message: 'Credenciais inválidas' });

      const user = results[0];

      if (user.deleted_at)
        return res.status(403).json({ message: 'Usuário desativado. Entre em contato com o administrador do sistema.' });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid)
        return res.status(401).json({ message: 'Credenciais inválidas' });

      const token = jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({ token, role: user.role, name: user.name, userId: user.id });
    }
  );
};
