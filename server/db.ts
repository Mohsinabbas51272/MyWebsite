import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory or current directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // fallback

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || process.env.USER || 'mohsinabbas',
  password: process.env.PGPASSWORD || undefined,
  database: process.env.PGDATABASE || 'apex_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

// Database schema initialization
export async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('📦 Connecting to PostgreSQL and initializing schema...');

    await client.query(`
      -- 1. Tasks Table (Kanban & Task Assistant)
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(100) PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        column_id VARCHAR(50) NOT NULL DEFAULT 'todo',
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        tags JSONB DEFAULT '[]'::jsonb,
        due_date VARCHAR(50) DEFAULT '',
        assignee JSONB DEFAULT '{"name": "Mohsin Abbas", "initials": "MA"}'::jsonb,
        subtasks JSONB DEFAULT '[]'::jsonb,
        ai_audit_notes TEXT DEFAULT '',
        order_index INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 2. Transactions Table
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(100) PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_avatar TEXT DEFAULT '',
        email TEXT DEFAULT '',
        type TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(30) NOT NULL DEFAULT 'completed',
        date VARCHAR(50) NOT NULL,
        method TEXT DEFAULT 'Credit Card',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 3. Repositories Table
      CREATE TABLE IF NOT EXISTS repositories (
        id VARCHAR(100) PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        provider VARCHAR(50) DEFAULT 'GitHub',
        default_branch VARCHAR(50) DEFAULT 'main',
        total_deployments INT DEFAULT 0,
        success_rate INT DEFAULT 100,
        last_deployed VARCHAR(50) DEFAULT 'Never',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 4. Deployments Table
      CREATE TABLE IF NOT EXISTS deployments (
        id VARCHAR(100) PRIMARY KEY,
        repo_name TEXT NOT NULL,
        env VARCHAR(30) NOT NULL DEFAULT 'production',
        status VARCHAR(30) NOT NULL DEFAULT 'building',
        commit_hash VARCHAR(50) DEFAULT '',
        commit_msg TEXT DEFAULT '',
        author TEXT DEFAULT 'Mohsin Abbas',
        author_avatar TEXT DEFAULT '',
        branch VARCHAR(50) DEFAULT 'main',
        provider VARCHAR(50) DEFAULT 'Vercel',
        duration VARCHAR(30) DEFAULT '0s',
        created_at VARCHAR(50) NOT NULL,
        preview_url TEXT DEFAULT '',
        steps JSONB DEFAULT '[]'::jsonb
      );

      -- 5. Team Members Table
      CREATE TABLE IF NOT EXISTS team_members (
        id VARCHAR(100) PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role VARCHAR(50) NOT NULL DEFAULT 'Engineer',
        department TEXT DEFAULT 'Engineering',
        avatar TEXT DEFAULT '',
        status VARCHAR(20) DEFAULT 'active',
        two_factor_enabled BOOLEAN DEFAULT true,
        last_active VARCHAR(50) DEFAULT 'Online now',
        joined_date VARCHAR(50) DEFAULT 'Aug 2026',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 6. Activities Table
      CREATE TABLE IF NOT EXISTS activities (
        id VARCHAR(100) PRIMARY KEY,
        user_name TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        timestamp VARCHAR(50) NOT NULL,
        type VARCHAR(30) DEFAULT 'system',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 7. Notifications Table
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(100) PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        time VARCHAR(50) NOT NULL,
        unread BOOLEAN DEFAULT true,
        type VARCHAR(30) DEFAULT 'info',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 8. API Keys Table
      CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR(100) PRIMARY KEY,
        name TEXT NOT NULL,
        key_prefix VARCHAR(50) NOT NULL,
        permissions VARCHAR(30) DEFAULT 'full',
        created VARCHAR(50) NOT NULL,
        last_used VARCHAR(50) DEFAULT 'Never',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 9. Webhooks Table
      CREATE TABLE IF NOT EXISTS webhooks (
        id VARCHAR(100) PRIMARY KEY,
        url TEXT NOT NULL,
        events JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(20) DEFAULT 'active',
        created_at VARCHAR(50) NOT NULL
      );

      -- 10. Comments Table
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(100) PRIMARY KEY,
        author TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        text TEXT NOT NULL,
        timestamp VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 11. Downloaded Media History Table
      CREATE TABLE IF NOT EXISTS downloaded_media (
        id VARCHAR(100) PRIMARY KEY,
        title TEXT NOT NULL,
        thumbnail TEXT DEFAULT '',
        resolution VARCHAR(50) DEFAULT '1080p',
        type VARCHAR(30) DEFAULT 'video',
        date VARCHAR(50) NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed initial data if tables are empty
    await seedInitialData(client);

    console.log('✅ PostgreSQL schema & seed ready in apex_db.');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
  } finally {
    client.release();
  }
}

async function seedInitialData(client: pg.PoolClient) {
  // Tasks table is left clean (no dummy tasks)
  // Users create tasks dynamically via Kanban UI or AI Assistant

  // Check team members
  const teamCount = await client.query('SELECT count(*) FROM team_members');
  if (parseInt(teamCount.rows[0].count, 10) === 0) {
    console.log('🌱 Seeding initial team owner...');
    await client.query(`
      INSERT INTO team_members (id, name, email, role, department, avatar, status, two_factor_enabled, last_active, joined_date)
      VALUES (
        'team-1',
        'Mohsin Abbas',
        'mohsin@apex.io',
        'Owner',
        'Engineering & Systems',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        'active',
        true,
        'Online now',
        'Aug 2026'
      )
    `);
  }

  // Check repositories
  const repoCount = await client.query('SELECT count(*) FROM repositories');
  if (parseInt(repoCount.rows[0].count, 10) === 0) {
    console.log('🌱 Seeding initial repository...');
    await client.query(`
      INSERT INTO repositories (id, name, url, provider, default_branch, total_deployments, success_rate, last_deployed)
      VALUES (
        'repo-1',
        'apex-cloud-core',
        'https://github.com/mohsinabbas/apex-cloud-core',
        'GitHub',
        'main',
        14,
        98,
        'Just now'
      )
    `);

    await client.query(`
      INSERT INTO deployments (id, repo_name, env, status, commit_hash, commit_msg, author, author_avatar, branch, provider, duration, created_at, steps)
      VALUES (
        'dpl-8841',
        'apex-cloud-core',
        'production',
        'success',
        'a9f82d1',
        'feat: PostgreSQL database integration & AI backend routes',
        'Mohsin Abbas',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        'main',
        'Vercel',
        '38s',
        'Just now',
        '[{"name": "Checkout Code", "status": "passed", "duration": "3s", "logs": ["Cloning repo", "Head is at a9f82d1"]}, {"name": "Install Dependencies", "status": "passed", "duration": "14s", "logs": ["npm install", "audited 256 packages"]}, {"name": "Build Application", "status": "passed", "duration": "16s", "logs": ["vite build", "✓ built in 1.4s"]}, {"name": "Deploy Edge Bundle", "status": "passed", "duration": "5s", "logs": ["Deploying to apex-cloud-core.vercel.app", "Deployment ready"]}]'::jsonb
      )
    `);
  }

  // Check activities
  const actCount = await client.query('SELECT count(*) FROM activities');
  if (parseInt(actCount.rows[0].count, 10) === 0) {
    await client.query(`
      INSERT INTO activities (id, user_name, avatar, action, target, timestamp, type)
      VALUES 
      ('act-1', 'Mohsin Abbas', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'configured', 'PostgreSQL apex_db & AI Services', 'Just now', 'system'),
      ('act-2', 'Mohsin Abbas', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'deployed release to', 'production (apex-cloud-core)', '10 mins ago', 'system')
    `);
  }
}
