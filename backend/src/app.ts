import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Routes
import usersRouter      from './routes/users.js';
import quizzesRouter    from './routes/quizzes.js';
import studyPlansRouter from './routes/study-plans.js';

// =============================================================================
// Express Application Setup
// =============================================================================

const app: Application = express();

// ---------------------------------------------------------------------------
// Security headers (Helmet)
// ---------------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://*.anthropic.com', 'https://*.azure.com'],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding resources
}));

// ---------------------------------------------------------------------------
// CORS — Only allow our frontend origins
// ---------------------------------------------------------------------------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://lively-dune-00d7f1910.7.azurestaticapps.net')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, cURL, etc.) in dev
    if (!origin || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ---------------------------------------------------------------------------
// Request logging
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ---------------------------------------------------------------------------
// Body parsers
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------------------------------------------------------------------------
// Rate limiting — protect against brute force
// ---------------------------------------------------------------------------
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Stricter for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests. Please wait 15 minutes.' },
});

app.use('/api', globalLimiter);
app.use('/api/users/register', authLimiter);

// =============================================================================
// API Routes
// =============================================================================

app.get('/health', async (_req: Request, res: Response) => {
  const { checkDbConnection } = await import('./services/db.js');
  const dbOk = await checkDbConnection();
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'unlock-api',
    version: '1.0.0',
    database: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.use('/api/users',       usersRouter);
app.use('/api/quizzes',     quizzesRouter);
app.use('/api/study-plans', studyPlansRouter);
app.use('/api/documents',   (_req, res) => res.status(501).json({ message: 'Coming in Week 3' }));
app.use('/api/progress',    (_req, res) => res.status(501).json({ message: 'Coming in Week 4' }));
app.use('/api/resources',   (_req, res) => res.status(501).json({ message: 'Coming in Week 5' }));
app.use('/api/parents',     (_req, res) => res.status(501).json({ message: 'Coming in Week 5' }));

// =============================================================================
// 404 Handler
// =============================================================================
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', path: _req.path });
});

// =============================================================================
// Global Error Handler
// =============================================================================
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled error]', err);

  // Don't leak stack traces in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({ error: 'Internal server error', message });
});

export default app;

