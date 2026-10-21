import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { errorHandler, notFound } from './errors.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import { requireAuth } from './security.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.frontendUrls.includes(origin)) return callback(null, true);
    return callback(new Error('Origem não permitida.'));
  },
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/profile', requireAuth, profileRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
