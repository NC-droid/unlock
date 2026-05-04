import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';

// =============================================================================
// PostgreSQL Connection Pool (Azure Database for PostgreSQL)
// =============================================================================

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : false,
  max: 10,                    // Max connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// =============================================================================
// Query helper — typed result
// =============================================================================
export async function query<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB]', { query: text.slice(0, 80), duration: `${duration}ms`, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('[DB ERROR]', { query: text.slice(0, 80), error });
    throw error;
  }
}

// =============================================================================
// Transaction helper
// =============================================================================
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// =============================================================================
// Health check
// =============================================================================
export async function checkDbConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Run migrations (called on startup in production)
// =============================================================================
export async function runMigrations(): Promise<void> {
  const schemaPath = path.join(__dirname, '../../../database/schema_v1.sql');
  if (!fs.existsSync(schemaPath)) {
    console.warn('[DB] schema_v1.sql not found at', schemaPath, '— skipping migration');
    return;
  }
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  try {
    await pool.query(sql);
    console.log('[DB] Migrations applied successfully ✅');
  } catch (error) {
    console.error('[DB] Migration failed:', error);
    throw error;
  }
}
