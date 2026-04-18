import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

import connectDB from './config/database.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Routes
import { seedDatabase } from './controllers/seed.controller.js';
import authRoutes     from './routes/auth.routes.js';
import profileRoutes  from './routes/profile.routes.js';
import adminRoutes    from './routes/admin.routes.js';
import schoolRoutes   from './routes/school.routes.js';
import reportRoutes   from './routes/report.routes.js';
import riskRoutes     from './routes/risk.routes.js';
import workOrderRoutes from './routes/workorder.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── One-time seed endpoint (remove after demo setup) ────────────────────────
app.get('/api/seed-demo', seedDatabase);

// ─── Health ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Saksham — Predictive Maintenance Engine', version: '1.0.0' });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/me',             profileRoutes);
app.use('/api/admin',          adminRoutes);
app.use('/api/schools',        schoolRoutes);
app.use('/api/condition-report', reportRoutes);
app.use('/api/risk-scores',    riskRoutes);
app.use('/api/work-orders',    workOrderRoutes);

// Convenience aliases
app.use('/api/maintenance-queue', riskRoutes);
app.use('/api/assign-task',    workOrderRoutes);
app.use('/api/complete-task',  workOrderRoutes);

// ─── Error handling ──────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: 'File upload error: ' + err.message });
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`✓ Saksham — Predictive Maintenance Backend running on port ${PORT}`);
  console.log(`✓ Health: http://localhost:${PORT}/health`);
});
