import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.js';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Hachage sécurisé avec scrypt et sel aléatoire
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

// Vérification du mot de passe avec timingSafeEqual
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return resolve(false);
    const [salt, key] = parts;
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const keyBuffer = Buffer.from(key, 'hex');
      if (keyBuffer.length !== derivedKey.length) return resolve(false);
      try {
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

// Générateur de token sécurisé
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

// Enregistrement d'un log d'activité
export function logActivity(params: {
  adminId?: string;
  adminEmail?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
  result: 'success' | 'failed';
}) {
  try {
    const id = `LOG-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO activity_logs (id, admin_id, admin_email, action, target_type, target_id, details, ip_address, result, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.adminId || null,
      params.adminEmail || null,
      params.action,
      params.targetType || null,
      params.targetId || null,
      params.details || null,
      params.ipAddress || null,
      params.result,
      now
    );
  } catch (err) {
    console.error('Erreur enregistrement log activité:', err);
  }
}

// Enregistrement d'une notification
export function createNotification(params: {
  type: 'new_user' | 'payment_success' | 'payment_failed' | 'new_subscription' | 'subscription_expired' | 'new_message' | 'security_alert';
  title: string;
  message: string;
  link?: string;
}) {
  try {
    const id = `NOTIF-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO notifications (id, type, title, message, link, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(id, params.type, params.title, params.message, params.link || null, now);
  } catch (err) {
    console.error('Erreur création notification:', err);
  }
}

// Vérification de la session admin par cookie ou header Bearer
export function authenticateAdmin(req: Request): AdminUser | null {
  const token = req.cookies?.admin_session || req.headers.authorization?.replace(/^Bearer\s+/, '');
  if (!token) return null;

  try {
    const now = new Date().toISOString();
    const session = db.prepare(`
      SELECT s.id as session_id, s.admin_id, s.expires_at, a.id, a.email, a.name, a.role, a.locked_until
      FROM admin_sessions s
      JOIN admins a ON s.admin_id = a.id
      WHERE s.token = ? AND s.expires_at > ?
    `).get(token, now) as any;

    if (!session) return null;

    if (session.locked_until && new Date(session.locked_until) > new Date()) {
      return null;
    }

    return {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role
    };
  } catch {
    return null;
  }
}

// Middleware de protection des routes admin côté serveur
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const admin = authenticateAdmin(req);
  if (!admin) {
    return res.status(401).json({
      error: 'Non autorisé. Accès administrateur requis.',
      code: 'UNAUTHORIZED_ADMIN'
    });
  }
  (req as any).admin = admin;
  next();
}

// Limitation du débit (Rate limiter simple et robuste en mémoire)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count++;
  return true;
}

// Réinitialisation du limiteur pour une clé
export function resetRateLimit(key: string) {
  rateLimits.delete(key);
}

// Vérification de signature HMAC pour webhooks
export function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const signatureBuffer = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (signatureBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// Vérification de la session abonné par cookie ou header Bearer
export function authenticateUser(req: Request): any | null {
  const token = req.cookies?.user_session || req.headers['x-user-token'] || req.headers.authorization?.replace(/^Bearer\s+/, '');
  if (!token) return null;

  try {
    const now = new Date().toISOString();
    const session = db.prepare(`
      SELECT s.id as session_id, s.user_id, s.expires_at,
             u.id, u.name, u.email, u.phone, u.status, u.current_plan_id, u.current_subscription_id,
             sub.status as sub_status, sub.expires_date as sub_expires_date, pl.name as plan_name
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN subscriptions sub ON u.current_subscription_id = sub.id
      LEFT JOIN plans pl ON u.current_plan_id = pl.id
      WHERE s.token = ? AND s.expires_at > ?
    `).get(token, now) as any;

    if (!session) return null;
    if (session.status === 'suspended') return null;

    return session;
  } catch {
    return null;
  }
}

// Middleware de protection pour les abonnés
export function requireUserAuth(req: Request, res: Response, next: NextFunction) {
  const user = authenticateUser(req);
  if (!user) {
    return res.status(401).json({
      error: 'Veuillez vous connecter à votre compte abonné pour accéder à cet espace.',
      code: 'UNAUTHORIZED_USER'
    });
  }
  (req as any).user = user;
  next();
}

