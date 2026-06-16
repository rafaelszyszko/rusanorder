import { connection } from '../config/db.js';

// Helper to run multiple queries in parallel
function runQueries(queryMap, res) {
  const results = {};
  const keys = Object.keys(queryMap);
  let done = 0;
  let errored = false;

  keys.forEach((key) => {
    const { sql, params, transform } = typeof queryMap[key] === 'string'
      ? { sql: queryMap[key], params: [], transform: null }
      : queryMap[key];

    connection.query(sql, params || [], (err, rows) => {
      if (errored) return;
      if (err) { errored = true; return res.status(500).json(err); }

      if (transform) {
        results[key] = transform(rows);
      } else {
        results[key] = rows;
      }

      done++;
      if (done === keys.length) res.json(results);
    });
  });
}

export const getDashboardStats = (req, res) => {
  runQueries({
    totalOrders: {
      sql: 'SELECT COUNT(*) as v FROM orders WHERE deleted_at IS NULL',
      transform: (r) => r[0].v,
    },
    pendingOrders: {
      sql: "SELECT COUNT(*) as v FROM orders WHERE deleted_at IS NULL AND status NOT IN ('entregue', 'entregue_divergencia', 'cancelado', 'recusado_pcp')",
      transform: (r) => r[0].v,
    },
    totalClients: {
      sql: 'SELECT COUNT(*) as v FROM clients',
      transform: (r) => r[0].v,
    },
    totalRevenue: {
      sql: "SELECT COALESCE(SUM(total), 0) as v FROM orders WHERE deleted_at IS NULL AND status NOT IN ('cancelado', 'recusado_pcp')",
      transform: (r) => r[0].v,
    },
    recentOrders: {
      sql: `
        SELECT o.id, o.status, o.total, o.created_at, c.name as client_name, c.code as client_code
        FROM orders o JOIN clients c ON c.id = o.client_id
        WHERE o.deleted_at IS NULL
        ORDER BY o.created_at DESC LIMIT 10
      `,
    },
    ordersByStatus: {
      sql: 'SELECT status, COUNT(*) as count FROM orders WHERE deleted_at IS NULL GROUP BY status',
    },
    ordersByMonth: {
      sql: `
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count,
               COALESCE(SUM(CASE WHEN status NOT IN ('cancelado', 'recusado_pcp') THEN total ELSE 0 END), 0) as revenue
        FROM orders WHERE deleted_at IS NULL
        GROUP BY month ORDER BY month DESC LIMIT 12
      `,
    },
    topClients: {
      sql: `
        SELECT c.name, COUNT(o.id) as order_count,
               COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelado', 'recusado_pcp') THEN o.total ELSE 0 END), 0) as revenue
        FROM orders o JOIN clients c ON c.id = o.client_id
        WHERE o.deleted_at IS NULL
        GROUP BY c.id ORDER BY revenue DESC LIMIT 5
      `,
    },
    deliveredRate: {
      sql: `
        SELECT
          COUNT(CASE WHEN status IN ('entregue', 'entregue_divergencia') THEN 1 END) as delivered,
          COUNT(CASE WHEN status = 'cancelado' THEN 1 END) as cancelled,
          COUNT(*) as total
        FROM orders WHERE deleted_at IS NULL
      `,
      transform: (r) => r[0],
    },
  }, res);
};

export const getAdminDashboardStats = (req, res) => {
  runQueries({
    totalUsers: {
      sql: 'SELECT COUNT(*) as v FROM users WHERE deleted_at IS NULL',
      transform: (r) => r[0].v,
    },
    adminUsers: {
      sql: "SELECT COUNT(*) as v FROM users WHERE deleted_at IS NULL AND role = 'admin'",
      transform: (r) => r[0].v,
    },
    regularUsers: {
      sql: "SELECT COUNT(*) as v FROM users WHERE deleted_at IS NULL AND role = 'user'",
      transform: (r) => r[0].v,
    },
    inactiveUsers: {
      sql: 'SELECT COUNT(*) as v FROM users WHERE deleted_at IS NOT NULL',
      transform: (r) => r[0].v,
    },
    totalOrders: {
      sql: 'SELECT COUNT(*) as v FROM orders WHERE deleted_at IS NULL',
      transform: (r) => r[0].v,
    },
    totalClients: {
      sql: 'SELECT COUNT(*) as v FROM clients',
      transform: (r) => r[0].v,
    },
    totalRevenue: {
      sql: "SELECT COALESCE(SUM(total), 0) as v FROM orders WHERE deleted_at IS NULL AND status NOT IN ('cancelado', 'recusado_pcp')",
      transform: (r) => r[0].v,
    },
    ordersToday: {
      sql: 'SELECT COUNT(*) as v FROM orders WHERE deleted_at IS NULL AND DATE(created_at) = CURDATE()',
      transform: (r) => r[0].v,
    },
    recentUsers: {
      sql: 'SELECT id, name, email, role, created_at FROM users WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 5',
    },
    recentOrders: {
      sql: `
        SELECT o.id, o.status, o.total, o.created_at, c.name as client_name, c.code as client_code,
               CASE WHEN u.deleted_at IS NOT NULL THEN CONCAT(u.name, ' (inativo)') ELSE u.name END as created_by
        FROM orders o
        JOIN clients c ON c.id = o.client_id
        LEFT JOIN users u ON u.id = o.user_id
        WHERE o.deleted_at IS NULL
        ORDER BY o.created_at DESC LIMIT 10
      `,
    },
    ordersByStatus: {
      sql: 'SELECT status, COUNT(*) as count FROM orders WHERE deleted_at IS NULL GROUP BY status',
    },
    ordersByMonth: {
      sql: `
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count,
               COALESCE(SUM(CASE WHEN status NOT IN ('cancelado', 'recusado_pcp') THEN total ELSE 0 END), 0) as revenue
        FROM orders WHERE deleted_at IS NULL
        GROUP BY month ORDER BY month DESC LIMIT 12
      `,
    },
    topClients: {
      sql: `
        SELECT c.name, COUNT(o.id) as order_count,
               COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelado', 'recusado_pcp') THEN o.total ELSE 0 END), 0) as revenue
        FROM orders o JOIN clients c ON c.id = o.client_id
        WHERE o.deleted_at IS NULL
        GROUP BY c.id ORDER BY revenue DESC LIMIT 5
      `,
    },
    topUsers: {
      sql: `
        SELECT u.name, COUNT(o.id) as order_count,
               COALESCE(SUM(o.total), 0) as total_value
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        WHERE o.deleted_at IS NULL
        GROUP BY o.user_id ORDER BY order_count DESC LIMIT 5
      `,
    },
    deliveredRate: {
      sql: `
        SELECT
          COUNT(CASE WHEN status IN ('entregue', 'entregue_divergencia') THEN 1 END) as delivered,
          COUNT(CASE WHEN status = 'cancelado' THEN 1 END) as cancelled,
          COUNT(CASE WHEN status NOT IN ('entregue', 'entregue_divergencia', 'cancelado') THEN 1 END) as in_progress,
          COUNT(*) as total
        FROM orders WHERE deleted_at IS NULL
      `,
      transform: (r) => r[0],
    },
  }, res);
};

// GET /reports/search?q=...&type=all|clients|orders|samples|users&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
// Busca textual global em clients, orders, samples e users (admin)
export const globalSearch = (req, res) => {
  const raw = (req.query.q || '').trim();
  const type = (req.query.type || 'all').toLowerCase();
  const dateFrom = req.query.date_from || null;
  const dateTo = req.query.date_to || null;

  if (raw.length < 2) {
    return res.json({ q: raw, type, clients: [], orders: [], samples: [], users: [] });
  }
  const q = `%${raw}%`;
  const limit = 50;
  const isAdmin = req.user?.role === 'admin';

  // Filtros de data: usamos created_at para clients/orders/users e sent_at para samples
  const range = (col) => {
    const w = [];
    const p = [];
    if (dateFrom) { w.push(`${col} >= ?`); p.push(`${dateFrom} 00:00:00`); }
    if (dateTo)   { w.push(`${col} <= ?`); p.push(`${dateTo} 23:59:59`); }
    return { sql: w.length ? ` AND ${w.join(' AND ')}` : '', params: p };
  };

  const wantsAll = type === 'all';
  const queries = {};

  if (wantsAll || type === 'clients') {
    const r = range('c.created_at');
    queries.clients = {
      sql: `
        SELECT DISTINCT c.id, c.name, c.code, c.cnpj, c.phone, c.city, c.state, c.created_at,
               GROUP_CONCAT(DISTINCT ce.email SEPARATOR ', ') AS emails
        FROM clients c
        LEFT JOIN client_emails ce ON ce.client_id = c.id
        WHERE (c.name LIKE ? OR c.code LIKE ? OR c.cnpj LIKE ?
           OR c.city LIKE ? OR c.phone LIKE ? OR ce.email LIKE ?)${r.sql}
        GROUP BY c.id
        ORDER BY c.name
        LIMIT ?
      `,
      params: [q, q, q, q, q, q, ...r.params, limit],
    };
  }

  if (wantsAll || type === 'orders') {
    const r = range('o.created_at');
    queries.orders = {
      sql: `
        SELECT o.id, o.status, o.total, o.purchase_order, o.notes, o.created_at,
               c.name AS client_name, c.code AS client_code
        FROM orders o
        JOIN clients c ON c.id = o.client_id
        WHERE o.deleted_at IS NULL AND (
          c.name LIKE ? OR c.code LIKE ? OR
          o.purchase_order LIKE ? OR o.notes LIKE ? OR
          CONCAT(c.code, '-', o.id) LIKE ? OR
          o.id IN (SELECT order_id FROM order_items WHERE description LIKE ?)
        )${r.sql}
        ORDER BY o.created_at DESC
        LIMIT ?
      `,
      params: [q, q, q, q, q, q, ...r.params, limit],
    };
  }

  if (wantsAll || type === 'samples') {
    const r = range('s.sent_at');
    queries.samples = {
      sql: `
        SELECT s.id, s.code, s.description, s.status, s.sent_at, s.tracking_code,
               s.color, s.finish, s.leather_type,
               c.name AS client_name, c.code AS client_code
        FROM samples s
        JOIN clients c ON c.id = s.client_id
        WHERE (s.code LIKE ? OR s.description LIKE ? OR s.tracking_code LIKE ?
           OR s.color LIKE ? OR s.finish LIKE ? OR c.name LIKE ? OR c.code LIKE ?)${r.sql}
        ORDER BY s.created_at DESC
        LIMIT ?
      `,
      params: [q, q, q, q, q, q, q, ...r.params, limit],
    };
  }

  if (isAdmin && (wantsAll || type === 'users')) {
    const r = range('created_at');
    queries.users = {
      sql: `
        SELECT id, name, email, role, deleted_at, created_at
        FROM users
        WHERE (name LIKE ? OR email LIKE ?)${r.sql}
        ORDER BY (deleted_at IS NOT NULL), name
        LIMIT ?
      `,
      params: [q, q, ...r.params, limit],
    };
  }

  const keys = Object.keys(queries);
  const out = { q: raw, type, clients: [], orders: [], samples: [], users: [] };

  if (keys.length === 0) return res.json(out);

  let done = 0;
  let errored = false;
  keys.forEach((key) => {
    connection.query(queries[key].sql, queries[key].params, (err, rows) => {
      if (errored) return;
      if (err) { errored = true; return res.status(500).json({ message: 'Erro na busca', error: err.message }); }
      out[key] = rows;
      done++;
      if (done === keys.length) res.json(out);
    });
  });
};

