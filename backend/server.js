import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

import connectDB from './config/database.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { protect, authorize } from './middlewares/auth.middleware.js';

// Controllers
import { seedDatabase }       from './controllers/seed.controller.js';
import { getMaintenanceQueue } from './controllers/risk.controller.js';

// Routes
import authRoutes             from './routes/auth.routes.js';
import profileRoutes          from './routes/profile.routes.js';
import adminRoutes            from './routes/admin.routes.js';
import schoolRoutes           from './routes/school.routes.js';
import reportRoutes           from './routes/report.routes.js';
import riskRoutes             from './routes/risk.routes.js';
import taskRoutes             from './routes/task.routes.js';
// workorder.routes.js is retired — /api/work-orders delegates to taskRoutes below
// New routes from git pull
import alertRoutes            from './routes/alert.routes.js';
import analyticsRoutes        from './routes/analytics.routes.js';
import maintenanceRoutes      from './routes/maintenance.routes.js';
import schoolConditionRoutes  from './routes/schoolCondition.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

connectDB();

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Seed ─────────────────────────────────────────────────────────────────────
app.get('/api/seed-demo', seedDatabase);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Saksham — Predictive Maintenance Engine (PS-03)',
    version: '3.0.0',
    endpoints: {
      'POST /api/reports':               'Submit weekly condition report',
      'GET  /api/reports/:school_id':    'Get records for a school',
      'GET  /api/risk/:school_id':       'Risk predictions for one school',
      'GET  /api/risk/all':              'All predictions',
      'GET  /api/maintenance-queue':     'Priority queue (girls-school boost)',
      'POST /api/tasks/assign':          'Assign work order',
      'GET  /api/tasks':                 'List tasks',
      'POST /api/tasks/complete':        'Complete task + repair log',
      'GET  /api/alerts':                'Unresolved alerts',
      'GET  /api/analytics':             'District analytics',
      'GET  /api/schools':               'List all schools',
      'GET  /api/admin/load-csv':        'Load TS-PS3.csv (admin)',
    },
  });
});

// ─── PS-03 Core Routes ────────────────────────────────────────────────────────
app.use('/api/reports',  reportRoutes);
app.use('/api/risk',     riskRoutes);
app.use('/api/tasks',    taskRoutes);

app.get(
  '/api/maintenance-queue',
  protect, authorize('deo', 'bmo', 'admin', 'contractor'),
  getMaintenanceQueue,
);

// ─── New Routes (from git pull) ───────────────────────────────────────────────
app.use('/api/alerts',             alertRoutes);
app.use('/api/analytics',          analyticsRoutes);
app.use('/api/maintenance',        maintenanceRoutes);
app.use('/api/school-conditions',  schoolConditionRoutes);

// ─── Auth & Users ─────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/me',    profileRoutes);
app.use('/api/admin', adminRoutes);

// ─── Schools ──────────────────────────────────────────────────────────────────
app.use('/api/schools', schoolRoutes);

// ─── Legacy aliases (backwards compat) ───────────────────────────────────────
app.use('/api/condition-report', reportRoutes);
app.use('/api/risk-scores',      riskRoutes);
// /api/work-orders is retired — delegated to the canonical /api/tasks router
app.use('/api/work-orders',      taskRoutes);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: 'File upload error: ' + err.message });
  }
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n✓ Saksham PS-03 Backend — port ${PORT}`);
  console.log(`✓ Health: http://localhost:${PORT}/health\n`);
});
