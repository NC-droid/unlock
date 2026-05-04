import 'dotenv/config';
import app from './app';
import { checkDbConnection } from './services/db';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function start() {
  // Verify database connection before accepting traffic
  console.log('[Server] Checking database connection...');
  const dbOk = await checkDbConnection();
  if (!dbOk) {
    console.error('[Server] ❌ Cannot connect to database. Check DATABASE_URL in .env');
    console.error('[Server] Ensure the DATABASE_URL secret is set in Azure App Service configuration.');
    process.exit(1);
  }
  console.log('[Server] ✅ Database connected');

  const server = app.listen(PORT, () => {
    console.log(`[Server] 🚀 UNLOCK API running on http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Server] Health: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`[Server] ${signal} received — shutting down gracefully...`);
    server.close(async () => {
      const { pool } = await import('./services/db');
      await pool.end();
      console.log('[Server] 👋 Goodbye');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
