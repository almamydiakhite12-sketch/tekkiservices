import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Assurer le répertoire de données
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'tekki.db');
export const db = new Database(dbPath);

// Activer le mode WAL pour une concurrence élevée et des performances optimales
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // Table des administrateurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      two_factor_secret TEXT,
      two_factor_enabled INTEGER DEFAULT 0,
      role TEXT DEFAULT 'superadmin',
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Table des sessions administrateurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
  `);

  // Table des forfaits / plans
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      currency TEXT DEFAULT 'XOF',
      tagline TEXT,
      features TEXT NOT NULL,
      duration_days INTEGER DEFAULT 30,
      is_active INTEGER DEFAULT 1,
      highlighted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // Table des utilisateurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      current_plan_id TEXT,
      current_subscription_id TEXT,
      last_seen_at TEXT,
      last_login_at TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
  `);

  // Migration sécurisée si la table existait déjà sans password_hash
  try {
    db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);
  } catch {}

  // Table des sites créés par les abonnés
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      logo_url TEXT,
      banner_url TEXT,
      primary_color TEXT DEFAULT '#0f5257',
      contact_phone TEXT,
      contact_whatsapp TEXT,
      contact_email TEXT,
      address TEXT,
      content_json TEXT NOT NULL,
      is_published INTEGER DEFAULT 1,
      views_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sites_slug ON sites(slug);
    CREATE INDEX IF NOT EXISTS idx_sites_user ON sites(user_id);
  `);

  // Table des sessions abonnés
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
  `);

  // Table des abonnements
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      auto_renew INTEGER DEFAULT 1,
      start_date TEXT NOT NULL,
      expires_date TEXT NOT NULL,
      cancelled_at TEXT,
      last_payment_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    );
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
  `);

  // Table des paiements
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      subscription_id TEXT,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'XOF',
      payment_method TEXT NOT NULL,
      phone TEXT NOT NULL,
      recipient_phone TEXT NOT NULL DEFAULT '+221784243420',
      status TEXT NOT NULL DEFAULT 'pending',
      provider_tx_id TEXT,
      provider_response TEXT,
      error_message TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    );
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
  `);

  // Table des événements de paiements (Webhooks & Traçabilité)
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
    );
  `);

  // Table des conversations (Support & Messagerie Admin <-> Utilisateurs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT NOT NULL,
      user_phone TEXT,
      user_email TEXT,
      subject TEXT,
      last_message_at TEXT NOT NULL,
      unread_admin_count INTEGER DEFAULT 0,
      unread_user_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // Table des messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_type TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
  `);

  // Table des notifications admin
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
  `);

  // Table analytics & sessions de visite
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT,
      path TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      device_type TEXT,
      browser TEXT,
      ip_hash TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
  `);

  // Table des logs d'activité administrateur
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      admin_email TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      result TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
  `);

  // Table des paramètres généraux SaaS
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Initialisation des plans par défaut s'ils n'existent pas
  const existingPlans = db.prepare('SELECT count(*) as count FROM plans').get() as { count: number };
  if (existingPlans.count === 0) {
    const insertPlan = db.prepare(`
      INSERT INTO plans (id, name, price, currency, tagline, features, duration_days, is_active, highlighted, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    insertPlan.run(
      'starter',
      'Starter',
      5000,
      'XOF',
      'Pour démarrer seul',
      JSON.stringify(['1 utilisateur', 'Accès aux services de base', 'Support par e-mail']),
      30,
      1,
      0,
      now
    );

    insertPlan.run(
      'pro',
      'Pro',
      15000,
      'XOF',
      'Le plus choisi',
      JSON.stringify([
        'Jusqu\'à 5 utilisateurs',
        'Tous les services Tekki',
        'Support WhatsApp prioritaire',
        'Rapports mensuels'
      ]),
      30,
      1,
      1,
      now
    );

    insertPlan.run(
      'business',
      'Business',
      35000,
      'XOF',
      'Pour les équipes',
      JSON.stringify([
        'Utilisateurs illimités',
        'Tous les services Tekki',
        'Accompagnement dédié',
        'Facturation entreprise'
      ]),
      30,
      1,
      0,
      now
    );
  }

  // Initialisation des paramètres par défaut
  const defaultSettings: Record<string, string> = {
    saas_name: 'Tekki Services',
    owner_phone: '+221 78 424 34 20',
    owner_email: 'almamydiakhite12@gmail.com',
    owner_name: 'Almamy Diakhité',
    wave_environment: 'sandbox',
    wave_api_key: '',
    wave_secret_key: '',
    wave_webhook_secret: '',
    orange_environment: 'sandbox',
    orange_client_id: '',
    orange_client_secret: '',
    orange_merchant_key: '',
    orange_webhook_secret: '',
    auto_renew_enabled: 'true',
    session_timeout_minutes: '120',
    max_login_attempts: '5',
    lockout_duration_minutes: '15'
  };

  const getSetting = db.prepare('SELECT value FROM app_settings WHERE key = ?');
  const setSetting = db.prepare('INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)');
  const now = new Date().toISOString();

  for (const [key, value] of Object.entries(defaultSettings)) {
    if (!getSetting.get(key)) {
      setSetting.run(key, value, now);
    }
  }
}
