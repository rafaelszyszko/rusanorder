import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import importRoutes from './routes/importRoutes.js';
import sampleRoutes from './routes/sampleRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// CORS: aceita CSV de origens em CORS_ORIGIN, ou libera tudo em dev se vazio.
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : true;
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'rusanorder-api' });
});

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/clients', clientRoutes);
app.use('/orders', orderRoutes);
app.use('/reports', reportRoutes);
app.use('/imports', importRoutes);
app.use('/samples', sampleRoutes);
app.use('/notifications', notificationRoutes);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
    console.log(`Server on port ${PORT}`);
});
