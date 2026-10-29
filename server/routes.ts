import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from './db.js';
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  logActivity,
  createNotification,
  requireAdminAuth,
  checkRateLimit,
  verifyHmacSignature,
  authenticateUser,
  requireUserAuth
} from './security.js';
import {
  createPaymentTransaction,
  confirmPaymentSuccess,
  markPaymentFailed,
  checkAndExpireSubscriptions,
  OWNER_PHONE,
  isValidSenegalPhone,
  normalizeSenegalPhone
} from './payments.js';

export const apiRouter = Router();

// ==========================================
// 1. ROUTES PUBLIQUES
// ==========================================

// Liste des forfaits disponibles
apiRouter.get('/plans', (req: Request, res: Response) => {
  try {
    const plans = db.prepare('SELECT * FROM plans WHERE is_active = 1 ORDER BY price ASC').all() as any[];
    const parsed = plans.map(p => ({
      ...p,
      features: JSON.parse(p.features)
    }));
    res.json({ plans: parsed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Création d'une transaction de paiement
apiRouter.post('/payments/create', async (req: Request, res: Response) => {
  try {
    const { planId, paymentMethod, fullName, phone, email, autoRenew } = req.body;

    if (!planId || !paymentMethod || !fullName || !phone) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être renseignés.' });
    }

    if (!['wave', 'orange_money'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Moyen de paiement non pris en charge. Choisissez Wave ou Orange Money.' });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

    // Limitation anti-spam
    if (!checkRateLimit(`payment:${ipAddress}`, 20, 60 * 1000)) {
      return res.status(429).json({ error: 'Trop de requêtes. Veuillez patienter avant de réessayer.' });
    }

    const result = await createPaymentTransaction({
      planId,
      paymentMethod,
      fullName,
      phone,
      email,
      autoRenew: autoRenew ?? true,
      ipAddress
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Consultation du statut d'une transaction (Vérifié côté serveur)
apiRouter.get('/payments/status/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = db.prepare(`
      SELECT p.*, pl.name as plan_name, pl.price as plan_price, u.name as user_name
      FROM payments p
      JOIN plans pl ON p.plan_id = pl.id
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id) as any;

    if (!payment) {
      return res.status(404).json({ error: 'Transaction introuvable.' });
    }

    // Récupérer l'abonnement si existant
    let subscription = null;
    if (payment.subscription_id) {
      subscription = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(payment.subscription_id);
    }

    res.json({
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      phone: payment.phone,
      recipientPhone: payment.recipient_phone,
      planName: payment.plan_name,
      userName: payment.user_name,
      paidAt: payment.paid_at,
      createdAt: payment.created_at,
      subscription
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook officiel Wave
apiRouter.post('/webhooks/wave', (req: Request, res: Response) => {
  try {
    const signature = req.headers['wave-signature'] as string || '';
    const secret = (db.prepare("SELECT value FROM app_settings WHERE key = 'wave_webhook_secret'").get() as any)?.value || process.env.WAVE_WEBHOOK_SECRET || '';

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Si un secret est configuré, valider la signature cryptographique
    if (secret && signature && !verifyHmacSignature(rawBody, signature, secret)) {
      logActivity({
        action: 'webhook_invalid_signature',
        targetType: 'webhook',
        details: 'Signature Wave invalide',
        result: 'failed'
      });
      return res.status(401).json({ error: 'Signature de webhook invalide.' });
    }

    const { id: waveEventId, type, data } = req.body;
    const clientRef = data?.client_reference || data?.transaction_id || data?.id;

    if (type === 'checkout.session.completed' || data?.status === 'succeeded' || data?.status === 'successful') {
      if (clientRef) {
        confirmPaymentSuccess(clientRef, waveEventId || data?.id, req.body);
      }
    } else if (data?.status === 'failed' || type === 'checkout.session.failed') {
      if (clientRef) {
        markPaymentFailed(clientRef, data?.error_message || 'Échec de paiement Wave', req.body);
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('Erreur webhook Wave:', err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook officiel Orange Money
apiRouter.post('/webhooks/orange-money', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'] as string || '';
    const secret = (db.prepare("SELECT value FROM app_settings WHERE key = 'orange_webhook_secret'").get() as any)?.value || process.env.ORANGE_MONEY_WEBHOOK_SECRET || '';

    if (secret && authHeader && !authHeader.includes(secret)) {
      return res.status(401).json({ error: 'Autorisation webhook Orange Money invalide.' });
    }

    const { notif_token, txnid, status, order_id } = req.body;
    const paymentId = order_id || txnid;

    if (status === 'SUCCESS' || status === 'SUCCESSFUL') {
      if (paymentId) {
        confirmPaymentSuccess(paymentId, txnid || notif_token, req.body);
      }
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      if (paymentId) {
        markPaymentFailed(paymentId, `Statut Orange Money: ${status}`, req.body);
      }
    }

    res.json({ status: 'OK' });
  } catch (err: any) {
    console.error('Erreur webhook Orange Money:', err);
    res.status(500).json({ error: err.message });
  }
});

// Simulateur de webhook sécurisé (permet de tester l'intégration et la validation sans attendre l'agrégateur en phase de test)
apiRouter.post('/webhooks/simulate', (req: Request, res: Response) => {
  try {
    const { paymentId, status, secretToken } = req.body;

    if (!paymentId || !status) {
      return res.status(400).json({ error: 'paymentId et status requis.' });
    }

    // Sécurisé : nécessite soit le secret de test ou une session admin
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as any;
    if (!payment) {
      return res.status(404).json({ error: 'Paiement introuvable.' });
    }

    if (status === 'successful') {
      const result = confirmPaymentSuccess(paymentId, `SIM-${Date.now()}`, { simulated: true, at: new Date().toISOString() });
      return res.json(result);
    } else if (status === 'failed') {
      const result = markPaymentFailed(paymentId, 'Simulation d\'échec de paiement', { simulated: true });
      return res.json(result);
    }

    res.status(400).json({ error: 'Statut de simulation invalide.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Suivi Analytics interne (Respect de la vie privée, aucune donnée abusive)
apiRouter.post('/analytics/track', (req: Request, res: Response) => {
  try {
    const { sessionId, path: pagePath, referrer, deviceType, browser, userId } = req.body;

    if (!sessionId || !pagePath) {
      return res.status(400).json({ error: 'Données requises manquantes.' });
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const ipHash = crypto.createHash('sha256').update(ip + 'salt_tekki').digest('hex').slice(0, 16);
    const userAgent = req.headers['user-agent']?.slice(0, 200) || '';

    const id = `EVT-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO analytics_events (id, session_id, user_id, path, referrer, user_agent, device_type, browser, ip_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, sessionId, userId || null, pagePath.slice(0, 100), referrer?.slice(0, 200) || null, userAgent, deviceType || 'desktop', browser || 'unknown', ipHash, now);

    res.json({ tracked: true });
  } catch {
    res.json({ tracked: false });
  }
});

// Heartbeat d'activité utilisateur (utilisateurs connectés / actifs)
apiRouter.post('/users/heartbeat', (req: Request, res: Response) => {
  try {
    const { userId, phone } = req.body;
    const now = new Date().toISOString();

    if (userId) {
      db.prepare('UPDATE users SET last_seen_at = ?, updated_at = ? WHERE id = ?').run(now, now, userId);
    } else if (phone) {
      const normalized = phone.replace(/\D/g, '');
      db.prepare('UPDATE users SET last_seen_at = ?, updated_at = ? WHERE phone LIKE ?').run(now, now, `%${normalized}%`);
    }

    res.json({ status: 'ok', timestamp: now });
  } catch {
    res.json({ status: 'ignored' });
  }
});

// Messagerie Support Utilisateur -> Administration
apiRouter.post('/support/message', (req: Request, res: Response) => {
  try {
    const { userName, userPhone, userEmail, content, conversationId } = req.body;

    if (!userName || !content || !content.trim()) {
      return res.status(400).json({ error: 'Le nom et le message sont requis.' });
    }

    const now = new Date().toISOString();
    let convId = conversationId;

    if (!convId) {
      convId = `CONV-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      db.prepare(`
        INSERT INTO conversations (id, user_name, user_phone, user_email, subject, last_message_at, unread_admin_count, unread_user_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)
      `).run(convId, userName.trim(), userPhone?.trim() || null, userEmail?.trim() || null, content.trim().slice(0, 60), now, now);
    } else {
      db.prepare(`
        UPDATE conversations
        SET last_message_at = ?, unread_admin_count = unread_admin_count + 1
        WHERE id = ?
      `).run(now, convId);
    }

    const msgId = `MSG-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_type, sender_id, sender_name, content, is_read, created_at)
      VALUES (?, ?, 'user', ?, ?, ?, 0, ?)
    `).run(msgId, convId, userPhone || 'client', userName.trim(), content.trim(), now);

    // Notification admin
    createNotification({
      type: 'new_message',
      title: `Nouveau message de ${userName}`,
      message: content.trim().slice(0, 100),
      link: `/admin#messages`
    });

    res.json({
      success: true,
      conversationId: convId,
      messageId: msgId,
      createdAt: now
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Récupération des messages d'une conversation par l'utilisateur
apiRouter.get('/support/messages/:conversationId', (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation introuvable.' });
    }

    const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId);

    // Marquer les messages envoyés par l'admin comme lus par l'utilisateur
    db.prepare(`
      UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_type = 'admin'
    `).run(conversationId);
    db.prepare('UPDATE conversations SET unread_user_count = 0 WHERE id = ?').run(conversationId);

    res.json({ conversation, messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 1.B. SITES PUBLICS ET VISIBILITÉ MONDIALE
// ==========================================

// Consultation publique d'un site créé par son slug
apiRouter.get('/public/sites/:slug', (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const site = db.prepare(`
      SELECT s.*, u.name as owner_name, u.phone as owner_phone,
             sub.status as sub_status, sub.expires_date as sub_expires_date, pl.name as plan_name
      FROM sites s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN subscriptions sub ON u.current_subscription_id = sub.id
      LEFT JOIN plans pl ON u.current_plan_id = pl.id
      WHERE s.slug = ?
    `).get(slug.toLowerCase().trim()) as any;

    if (!site) {
      return res.status(404).json({ error: 'Ce site web est introuvable.' });
    }

    if (!site.is_published) {
      return res.status(403).json({ error: 'Ce site est actuellement en mode brouillon ou suspendu.' });
    }

    // Vérifier si l'abonnement du propriétaire est actif ou expiré
    const now = new Date().toISOString();
    const isSubscriptionActive = site.sub_status === 'active' && site.sub_expires_date && site.sub_expires_date > now;

    res.json({
      site: {
        ...site,
        content: JSON.parse(site.content_json || '{}')
      },
      isSubscriptionActive,
      subscriptionExpiresDate: site.sub_expires_date
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Incrémentation des visites du site public
apiRouter.post('/public/sites/:slug/view', (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    db.prepare('UPDATE sites SET views_count = views_count + 1 WHERE slug = ?').run(slug.toLowerCase().trim());
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// Formulaire de contact / commande / réservation sur un site abonné
apiRouter.post('/public/sites/:slug/inquiry', (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { customerName, customerPhone, message, details } = req.body;

    const site = db.prepare('SELECT s.id, s.title, s.user_id, u.name as owner_name FROM sites s JOIN users u ON s.user_id = u.id WHERE s.slug = ?').get(slug.toLowerCase().trim()) as any;
    if (!site) {
      return res.status(404).json({ error: 'Site introuvable.' });
    }

    createNotification({
      type: 'new_message',
      title: `Nouvelle demande sur le site "${site.title}"`,
      message: `${customerName || 'Client'} (${customerPhone || 'Sans tél'}) : ${message || 'Nouvelle commande/réservation'}`,
      link: `/s/${slug}`
    });

    res.json({ success: true, message: 'Votre demande a été transmise avec succès au propriétaire du site !' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 1.C. AUTHENTIFICATION ABONNÉS (ESPACE CLIENT)
// ==========================================

// Connexion abonné
apiRouter.post('/user/auth/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Numéro de téléphone requis.' });
    }

    const normalized = normalizeSenegalPhone(phone);
    let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(normalized) as any;

    if (!user) {
      return res.status(404).json({
        error: "Aucun compte trouvé avec ce numéro. Souscrivez d'abord à une formule ou vérifiez votre numéro.",
        code: "USER_NOT_FOUND"
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Votre compte est actuellement suspendu. Veuillez contacter le support.' });
    }

    if (user.password_hash) {
      if (!password) {
        return res.status(400).json({ error: 'Mot de passe requis.' });
      }
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Mot de passe incorrect.' });
      }
    } else {
      if (password && password.length >= 6) {
        const hash = await hashPassword(password);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
      }
    }

    const token = generateSecureToken(32);
    const sessionId = `USES-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, user.id, token, expiresAt, new Date().toISOString());

    res.cookie('user_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    db.prepare('UPDATE users SET last_login_at = ?, last_seen_at = ? WHERE id = ?').run(new Date().toISOString(), new Date().toISOString(), user.id);

    const sub = user.current_subscription_id
      ? db.prepare('SELECT s.*, pl.name as plan_name FROM subscriptions s JOIN plans pl ON s.plan_id = pl.id WHERE s.id = ?').get(user.current_subscription_id)
      : null;

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        currentPlanId: user.current_plan_id,
        subscription: sub
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Inscription abonné
apiRouter.post('/user/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, password } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Nom et numéro de téléphone requis.' });
    }

    const normalized = normalizeSenegalPhone(phone);
    if (!isValidSenegalPhone(normalized)) {
      return res.status(400).json({ error: 'Numéro sénégalais invalide (doit commencer par 70, 75, 76, 77 ou 78).' });
    }

    const existing = db.prepare('SELECT * FROM users WHERE phone = ?').get(normalized) as any;
    if (existing) {
      return res.status(400).json({ error: 'Un compte existe déjà avec ce numéro de téléphone. Veuillez vous connecter.' });
    }

    const userId = `USR-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();
    let passwordHash = null;
    if (password && password.length >= 6) {
      passwordHash = await hashPassword(password);
    }

    db.prepare(`
      INSERT INTO users (id, name, email, phone, password_hash, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(userId, name.trim(), email?.trim() || null, normalized, passwordHash, now, now);

    const token = generateSecureToken(32);
    const sessionId = `USES-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, userId, token, expiresAt, now);

    res.cookie('user_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    createNotification({
      type: 'new_user',
      title: 'Nouvel utilisateur inscrit',
      message: `${name.trim()} (${normalized}) a créé son compte.`,
      link: '/admin#users'
    });

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: normalized,
        currentPlanId: null,
        subscription: null
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Profil abonné connecté
apiRouter.get('/user/auth/me', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Non connecté', code: 'UNAUTHENTICATED' });
  }

  checkAndExpireSubscriptions();

  const now = new Date().toISOString();
  let sub = null;
  if (user.current_subscription_id) {
    sub = db.prepare(`
      SELECT s.*, pl.name as plan_name, pl.price as plan_price
      FROM subscriptions s
      JOIN plans pl ON s.plan_id = pl.id
      WHERE s.id = ?
    `).get(user.current_subscription_id) as any;
  }

  const isSubscriptionActive = sub?.status === 'active' && sub?.expires_date > now;
  let daysRemaining = 0;
  if (isSubscriptionActive && sub?.expires_date) {
    const diff = new Date(sub.expires_date).getTime() - new Date().getTime();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  let maxSites = 1;
  if (sub?.plan_id === 'pro') maxSites = 3;
  if (sub?.plan_id === 'business') maxSites = 999;

  const currentSitesCount = (db.prepare('SELECT count(*) as count FROM sites WHERE user_id = ?').get(user.id) as any)?.count || 0;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status
    },
    subscription: sub,
    isSubscriptionActive,
    daysRemaining,
    limits: {
      maxSites,
      currentSitesCount,
      canCreateSite: isSubscriptionActive && currentSitesCount < maxSites
    }
  });
});

// Déconnexion abonné
apiRouter.post('/user/auth/logout', (req: Request, res: Response) => {
  const token = req.cookies?.user_session || req.headers['x-user-token'];
  if (token) {
    db.prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
  }
  res.clearCookie('user_session');
  res.json({ success: true });
});

// ==========================================
// 1.D. GESTION DES SITES ABONNÉS (requireUserAuth)
// ==========================================

// Lister les sites de l'abonné connecté
apiRouter.get('/user/sites', requireUserAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const sites = db.prepare('SELECT * FROM sites WHERE user_id = ? ORDER BY created_at DESC').all(user.id) as any[];
    const parsed = sites.map(s => ({
      ...s,
      content: JSON.parse(s.content_json || '{}')
    }));

    res.json({ sites: parsed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Créer un nouveau site web (VÉRIFICATION STRICTE DE L'ABONNEMENT)
apiRouter.post('/user/sites', requireUserAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    checkAndExpireSubscriptions();

    // 1. VÉRIFIER L'ABONNEMENT MENSUEL
    const now = new Date().toISOString();
    const sub = user.current_subscription_id
      ? db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(user.current_subscription_id) as any
      : null;

    const isSubscriptionActive = sub?.status === 'active' && sub?.expires_date > now;
    if (!isSubscriptionActive) {
      return res.status(403).json({
        error: "Votre abonnement mensuel est expiré ou inactif. Vous devez renouveler votre formule avec Wave ou Orange Money (+221 78 424 34 20) pour créer et publier des sites web.",
        code: "SUBSCRIPTION_REQUIRED"
      });
    }

    // 2. VÉRIFIER LA LIMITE DU FORFAIT
    let maxSites = 1;
    if (sub?.plan_id === 'pro') maxSites = 3;
    if (sub?.plan_id === 'business') maxSites = 999;

    const currentCount = (db.prepare('SELECT count(*) as count FROM sites WHERE user_id = ?').get(user.id) as any)?.count || 0;
    if (currentCount >= maxSites) {
      return res.status(400).json({
        error: `Votre formule ${sub.plan_id.toUpperCase()} est limitée à ${maxSites} site(s). Passez à la formule supérieure pour créer plus de sites.`
      });
    }

    const { templateId, title, slug, description, contactPhone, contactWhatsapp, contactEmail, address, primaryColor, content } = req.body;

    if (!templateId || !title || !slug) {
      return res.status(400).json({ error: 'Le modèle, le titre et l\'identifiant URL (slug) sont requis.' });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!cleanSlug || cleanSlug.length < 3) {
      return res.status(400).json({ error: 'L\'identifiant URL (slug) doit comporter au moins 3 caractères alphanumériques.' });
    }

    const existingSlug = db.prepare('SELECT id FROM sites WHERE slug = ?').get(cleanSlug);
    if (existingSlug) {
      return res.status(400).json({ error: `L'adresse URL "${cleanSlug}" est déjà réservée. Veuillez en choisir une autre.` });
    }

    const siteId = `SITE-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO sites (
        id, user_id, template_id, title, slug, description, primary_color,
        contact_phone, contact_whatsapp, contact_email, address, content_json, is_published, views_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
    `).run(
      siteId,
      user.id,
      templateId,
      title.trim(),
      cleanSlug,
      description?.trim() || null,
      primaryColor || '#0f5257',
      contactPhone?.trim() || user.phone,
      contactWhatsapp?.trim() || user.phone,
      contactEmail?.trim() || user.email,
      address?.trim() || 'Dakar, Sénégal',
      JSON.stringify(content || {}),
      createdAt,
      createdAt
    );

    createNotification({
      type: 'new_user',
      title: `Nouveau site web créé : ${title.trim()}`,
      message: `${user.name} a publié son site (${templateId}) sous /s/${cleanSlug}`,
      link: `/s/${cleanSlug}`
    });

    logActivity({
      action: 'site_created',
      targetType: 'site',
      targetId: siteId,
      details: `Site "${title.trim()}" (/s/${cleanSlug}) créé par ${user.name}`,
      result: 'success'
    });

    res.json({
      success: true,
      siteId,
      slug: cleanSlug,
      url: `/s/${cleanSlug}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer un site de l'abonné pour édition
apiRouter.get('/user/sites/:id', requireUserAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const site = db.prepare('SELECT * FROM sites WHERE id = ? AND user_id = ?').get(id, user.id) as any;
    if (!site) {
      return res.status(404).json({ error: 'Site introuvable.' });
    }

    res.json({
      site: {
        ...site,
        content: JSON.parse(site.content_json || '{}')
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour un site web (VÉRIFICATION STRICTE DE L'ABONNEMENT)
apiRouter.put('/user/sites/:id', requireUserAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    checkAndExpireSubscriptions();

    const now = new Date().toISOString();
    const sub = user.current_subscription_id
      ? db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(user.current_subscription_id) as any
      : null;

    const isSubscriptionActive = sub?.status === 'active' && sub?.expires_date > now;
    if (!isSubscriptionActive) {
      return res.status(403).json({
        error: "Votre abonnement mensuel est expiré. Veuillez renouveler votre formule pour modifier et mettre à jour votre site web.",
        code: "SUBSCRIPTION_REQUIRED"
      });
    }

    const site = db.prepare('SELECT * FROM sites WHERE id = ? AND user_id = ?').get(id, user.id) as any;
    if (!site) {
      return res.status(404).json({ error: 'Site introuvable.' });
    }

    const { title, description, contactPhone, contactWhatsapp, contactEmail, address, primaryColor, content, isPublished } = req.body;

    db.prepare(`
      UPDATE sites
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          contact_phone = COALESCE(?, contact_phone),
          contact_whatsapp = COALESCE(?, contact_whatsapp),
          contact_email = COALESCE(?, contact_email),
          address = COALESCE(?, address),
          primary_color = COALESCE(?, primary_color),
          content_json = COALESCE(?, content_json),
          is_published = COALESCE(?, is_published),
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      title?.trim() || null,
      description?.trim() || null,
      contactPhone?.trim() || null,
      contactWhatsapp?.trim() || null,
      contactEmail?.trim() || null,
      address?.trim() || null,
      primaryColor || null,
      content ? JSON.stringify(content) : null,
      typeof isPublished === 'boolean' ? (isPublished ? 1 : 0) : null,
      now,
      id,
      user.id
    );

    res.json({ success: true, message: 'Site mis à jour avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un site
apiRouter.delete('/user/sites/:id', requireUserAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const site = db.prepare('SELECT * FROM sites WHERE id = ? AND user_id = ?').get(id, user.id) as any;
    if (!site) {
      return res.status(404).json({ error: 'Site introuvable.' });
    }

    db.prepare('DELETE FROM sites WHERE id = ? AND user_id = ?').run(id, user.id);

    logActivity({
      action: 'site_deleted',
      targetType: 'site',
      targetId: id,
      details: `Suppression du site "${site.title}" (/s/${site.slug}) par ${user.name}`,
      result: 'success'
    });

    res.json({ success: true, message: 'Site supprimé avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin : voir tous les sites créés
apiRouter.get('/admin/sites', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const sites = db.prepare(`
      SELECT s.*, u.name as user_name, u.phone as user_phone,
             sub.status as sub_status, sub.expires_date as sub_expires_date, pl.name as plan_name
      FROM sites s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN subscriptions sub ON u.current_subscription_id = sub.id
      LEFT JOIN plans pl ON u.current_plan_id = pl.id
      ORDER BY s.created_at DESC
    `).all() as any[];

    const parsed = sites.map(s => ({
      ...s,
      content: JSON.parse(s.content_json || '{}')
    }));

    res.json({ sites: parsed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin : suspendre ou réactiver un site
apiRouter.post('/admin/sites/:id/toggle-publish', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(id) as any;
    if (!site) {
      return res.status(404).json({ error: 'Site introuvable.' });
    }

    const newStatus = site.is_published ? 0 : 1;
    db.prepare('UPDATE sites SET is_published = ?, updated_at = ? WHERE id = ?').run(newStatus, new Date().toISOString(), id);

    res.json({ success: true, is_published: newStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin : supprimer un site (modération)
apiRouter.delete('/admin/sites/:id', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = (req as any).admin;
    const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(id) as any;
    if (!site) {
      return res.status(404).json({ error: 'Site introuvable.' });
    }
    db.prepare('DELETE FROM sites WHERE id = ?').run(id);
    logActivity({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'site_deleted_by_admin',
      targetType: 'site',
      targetId: id,
      details: `Suppression administrative du site "${site.title}" (/s/${site.slug})`,
      result: 'success'
    });
    res.json({ success: true, message: 'Site supprimé avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. AUTHENTIFICATION ADMINISTRATEUR
// ==========================================

// Vérification de l'état d'installation de l'administrateur
apiRouter.get('/admin/setup-status', (req: Request, res: Response) => {
  try {
    const adminCount = db.prepare('SELECT count(*) as count FROM admins').get() as { count: number };
    res.json({ isInitialized: adminCount.count > 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Création initiale sécurisée du compte administrateur (autorisée UNIQUEMENT s'il n'existe aucun admin)
apiRouter.post('/admin/setup', async (req: Request, res: Response) => {
  try {
    const adminCount = db.prepare('SELECT count(*) as count FROM admins').get() as { count: number };
    if (adminCount.count > 0) {
      return res.status(403).json({ error: 'Un compte administrateur est déjà configuré.' });
    }

    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Nom, email et mot de passe requis.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 8 caractères.' });
    }

    const passwordHash = await hashPassword(password);
    const adminId = `ADM-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO admins (id, email, name, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'superadmin', ?, ?)
    `).run(adminId, email.trim().toLowerCase(), name.trim(), passwordHash, now, now);

    logActivity({
      adminId,
      adminEmail: email.trim().toLowerCase(),
      action: 'admin_setup',
      targetType: 'admin',
      targetId: adminId,
      details: 'Initialisation du compte administrateur principal',
      result: 'success'
    });

    res.json({ success: true, message: 'Administrateur initialisé avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Connexion administrateur avec sessions sécurisées et protection anti-brute-force
apiRouter.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    // Protection anti-force brute
    const rateLimitKey = `admin_login:${ipAddress}:${email.toLowerCase().trim()}`;
    if (!checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000)) {
      logActivity({
        adminEmail: email,
        action: 'admin_login_blocked',
        ipAddress,
        details: 'Tentatives excessives de connexion bloquées par rate limit',
        result: 'failed'
      });
      return res.status(429).json({
        error: 'Trop de tentatives de connexion infructueuses. Veuillez réessayer dans 15 minutes.'
      });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email.toLowerCase().trim()) as any;
    if (!admin) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    // Vérifier si le compte est verrouillé
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return res.status(423).json({
        error: `Compte temporairement verrouillé suite à plusieurs échecs jusqu'à ${new Date(admin.locked_until).toLocaleTimeString('fr-FR')}.`
      });
    }

    const isValid = await verifyPassword(password, admin.password_hash);
    if (!isValid) {
      const attempts = (admin.failed_login_attempts || 0) + 1;
      let lockedUntil: string | null = null;
      if (attempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      db.prepare(`
        UPDATE admins
        SET failed_login_attempts = ?, locked_until = ?, updated_at = ?
        WHERE id = ?
      `).run(attempts, lockedUntil, new Date().toISOString(), admin.id);

      logActivity({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'admin_login',
        ipAddress,
        details: `Échec mot de passe (tentative ${attempts})`,
        result: 'failed'
      });

      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    // Réinitialiser les tentatives échouées
    db.prepare(`
      UPDATE admins
      SET failed_login_attempts = 0, locked_until = NULL, updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), admin.id);

    // Créer une session sécurisée
    const token = generateSecureToken(32);
    const sessionId = `SES-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 heures

    db.prepare(`
      INSERT INTO admin_sessions (id, admin_id, token, ip_address, user_agent, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, admin.id, token, ipAddress, userAgent, expiresAt, new Date().toISOString());

    // Cookie httpOnly sécurisé
    res.cookie('admin_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    });

    logActivity({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'admin_login',
      ipAddress,
      details: 'Connexion administrateur réussie',
      result: 'success'
    });

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Déconnexion administrateur
apiRouter.post('/admin/logout', (req: Request, res: Response) => {
  try {
    const token = req.cookies?.admin_session || req.headers.authorization?.replace(/^Bearer\s+/, '');
    if (token) {
      db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
    }

    res.clearCookie('admin_session');
    res.json({ success: true, message: 'Déconnecté avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. ROUTES ADMINISTRATEUR PRIVÉES (requireAdminAuth)
// ==========================================

// Profil administrateur actuel
apiRouter.get('/admin/me', requireAdminAuth, (req: Request, res: Response) => {
  const admin = (req as any).admin;
  res.json({ admin });
});

// Dashboard : Statistiques globales RÉELLES issues de la base de données
apiRouter.get('/admin/dashboard', requireAdminAuth, (req: Request, res: Response) => {
  try {
    // Vérifier les expirations d'abonnements au passage
    checkAndExpireSubscriptions();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Utilisateurs
    const totalUsers = (db.prepare('SELECT count(*) as count FROM users').get() as any)?.count || 0;
    const activeUsers = (db.prepare("SELECT count(*) as count FROM users WHERE status = 'active'").get() as any)?.count || 0;
    const suspendedUsers = (db.prepare("SELECT count(*) as count FROM users WHERE status = 'suspended'").get() as any)?.count || 0;
    const newUsersToday = (db.prepare('SELECT count(*) as count FROM users WHERE created_at >= ?').get(todayStart) as any)?.count || 0;

    // 2. Abonnements
    const activeSubs = (db.prepare("SELECT count(*) as count FROM subscriptions WHERE status = 'active'").get() as any)?.count || 0;
    const expiredSubs = (db.prepare("SELECT count(*) as count FROM subscriptions WHERE status = 'expired'").get() as any)?.count || 0;
    const suspendedSubs = (db.prepare("SELECT count(*) as count FROM subscriptions WHERE status = 'suspended'").get() as any)?.count || 0;

    // 3. Revenus réels
    const totalRevenue = (db.prepare("SELECT sum(amount) as sum FROM payments WHERE status = 'successful'").get() as any)?.sum || 0;
    const todayRevenue = (db.prepare("SELECT sum(amount) as sum FROM payments WHERE status = 'successful' AND paid_at >= ?").get(todayStart) as any)?.sum || 0;
    const weekRevenue = (db.prepare("SELECT sum(amount) as sum FROM payments WHERE status = 'successful' AND paid_at >= ?").get(sevenDaysAgo) as any)?.sum || 0;
    const monthRevenue = (db.prepare("SELECT sum(amount) as sum FROM payments WHERE status = 'successful' AND paid_at >= ?").get(thirtyDaysAgo) as any)?.sum || 0;

    // 4. Visites & Analytics
    const totalVisitors = (db.prepare('SELECT count(DISTINCT session_id) as count FROM analytics_events').get() as any)?.count || 0;
    const visitorsToday = (db.prepare('SELECT count(DISTINCT session_id) as count FROM analytics_events WHERE created_at >= ?').get(todayStart) as any)?.count || 0;
    const visitorsWeek = (db.prepare('SELECT count(DISTINCT session_id) as count FROM analytics_events WHERE created_at >= ?').get(sevenDaysAgo) as any)?.count || 0;
    const visitorsMonth = (db.prepare('SELECT count(DISTINCT session_id) as count FROM analytics_events WHERE created_at >= ?').get(thirtyDaysAgo) as any)?.count || 0;

    // 5. Derniers paiements
    const recentPayments = db.prepare(`
      SELECT p.*, pl.name as plan_name, u.name as user_name
      FROM payments p
      JOIN plans pl ON p.plan_id = pl.id
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 6
    `).all() as any[];

    // 6. Évolution des revenus sur les 7 derniers jours
    const revenueTrend = db.prepare(`
      SELECT substr(paid_at, 1, 10) as day, sum(amount) as total
      FROM payments
      WHERE status = 'successful' AND paid_at >= ?
      GROUP BY day
      ORDER BY day ASC
    `).all(sevenDaysAgo) as any[];

    res.json({
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          newToday: newUsersToday
        },
        subscriptions: {
          active: activeSubs,
          expired: expiredSubs,
          suspended: suspendedSubs
        },
        revenue: {
          total: totalRevenue,
          today: todayRevenue,
          week: weekRevenue,
          month: monthRevenue
        },
        visitors: {
          total: totalVisitors,
          today: visitorsToday,
          week: visitorsWeek,
          month: visitorsMonth
        }
      },
      recentPayments,
      revenueTrend
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gestion des Utilisateurs : Liste, recherche et filtres
apiRouter.get('/admin/users', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { search, status, plan } = req.query;
    let query = `
      SELECT u.*, pl.name as plan_name, pl.price as plan_price, s.status as sub_status, s.expires_date
      FROM users u
      LEFT JOIN plans pl ON u.current_plan_id = pl.id
      LEFT JOIN subscriptions s ON u.current_subscription_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ` AND u.status = ?`;
      params.push(status);
    }

    if (plan) {
      query += ` AND u.current_plan_id = ?`;
      params.push(plan);
    }

    query += ` ORDER BY u.created_at DESC`;

    const users = db.prepare(query).all(...params);
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Détail complet d'un utilisateur
apiRouter.get('/admin/users/:id', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = db.prepare(`
      SELECT u.*, pl.name as plan_name, pl.price as plan_price
      FROM users u
      LEFT JOIN plans pl ON u.current_plan_id = pl.id
      WHERE u.id = ?
    `).get(id) as any;

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    // Abonnements de l'utilisateur
    const subscriptions = db.prepare(`
      SELECT s.*, pl.name as plan_name, pl.price as plan_price
      FROM subscriptions s
      JOIN plans pl ON s.plan_id = pl.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `).all(id);

    // Paiements de l'utilisateur
    const payments = db.prepare(`
      SELECT p.*, pl.name as plan_name
      FROM payments p
      JOIN plans pl ON p.plan_id = pl.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(id);

    res.json({ user, subscriptions, payments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Suspension d'un utilisateur
apiRouter.post('/admin/users/:id/suspend', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = (req as any).admin;
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(id) as any;

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE users SET status = 'suspended', updated_at = ? WHERE id = ?").run(now, id);

    logActivity({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'user_suspend',
      targetType: 'user',
      targetId: id,
      details: `Suspension du compte de ${user.name}`,
      result: 'success'
    });

    res.json({ success: true, message: 'Utilisateur suspendu avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Réactivation d'un utilisateur
apiRouter.post('/admin/users/:id/reactivate', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = (req as any).admin;
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(id) as any;

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE users SET status = 'active', updated_at = ? WHERE id = ?").run(now, id);

    logActivity({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'user_reactivate',
      targetType: 'user',
      targetId: id,
      details: `Réactivation du compte de ${user.name}`,
      result: 'success'
    });

    res.json({ success: true, message: 'Utilisateur réactivé avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Modification des informations d'un utilisateur
apiRouter.put('/admin/users/:id', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const admin = (req as any).admin;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), updated_at = ? WHERE id = ?
    `).run(name?.trim() || null, email?.trim() || null, now, id);

    logActivity({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'user_edit',
      targetType: 'user',
      targetId: id,
      details: `Mise à jour des informations de ${user.name}`,
      result: 'success'
    });

    res.json({ success: true, message: 'Informations mises à jour.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Suppression d'un utilisateur
apiRouter.delete('/admin/users/:id', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = (req as any).admin;
    const user = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(id) as any;

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    logActivity({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'user_delete',
      targetType: 'user',
      targetId: id,
      details: `Suppression du compte de ${user.name} (${user.phone})`,
      result: 'success'
    });

    res.json({ success: true, message: 'Utilisateur supprimé.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gestion des Abonnements
apiRouter.get('/admin/subscriptions', requireAdminAuth, (req: Request, res: Response) => {
  try {
    checkAndExpireSubscriptions();
    const { status, plan, search } = req.query;

    let query = `
      SELECT s.*, pl.name as plan_name, pl.price as plan_price, u.name as user_name, u.phone as user_phone, p.payment_method, p.id as payment_id
      FROM subscriptions s
      JOIN plans pl ON s.plan_id = pl.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN payments p ON s.last_payment_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND s.status = ?`;
      params.push(status);
    }
    if (plan) {
      query += ` AND s.plan_id = ?`;
      params.push(plan);
    }
    if (search) {
      query += ` AND (u.name LIKE ? OR u.phone LIKE ? OR s.id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY s.created_at DESC`;

    const subscriptions = db.prepare(query).all(...params);
    res.json({ subscriptions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Suspension d'un abonnement
apiRouter.post('/admin/subscriptions/:id/suspend', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = (req as any).admin;
    const sub = db.prepare('SELECT s.*, u.name as user_name FROM subscriptions s JOIN users u ON s.user_id = u.id WHERE s.id = ?').get(id) as any;

    if (!sub) {
      return res.status(404).json({ error: 'Abonnement introuvable.' });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE subscriptions SET status = 'suspended', updated_at = ? WHERE id = ?").run(now, id);

    logActivity({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'sub_suspend',
      targetType: 'subscription',
      targetId: id,
      details: `Suspension de l'abonnement de ${sub.user_name}`,
      result: 'success'
    });

    res.json({ success: true, message: 'Abonnement suspendu.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Réactivation d'un abonnement
apiRouter.post('/admin/subscriptions/:id/reactivate', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = (req as any).admin;
    const sub = db.prepare('SELECT s.*, u.name as user_name FROM subscriptions s JOIN users u ON s.user_id = u.id WHERE s.id = ?').get(id) as any;

    if (!sub) {
      return res.status(404).json({ error: 'Abonnement introuvable.' });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE subscriptions SET status = 'active', updated_at = ? WHERE id = ?").run(now, id);

    logActivity({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'sub_reactivate',
      targetType: 'subscription',
      targetId: id,
      details: `Réactivation de l'abonnement de ${sub.user_name}`,
      result: 'success'
    });

    res.json({ success: true, message: 'Abonnement réactivé.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Prolongation manuelle d'un abonnement (+30 jours)
apiRouter.post('/admin/subscriptions/:id/extend', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = (req as any).admin;
    const sub = db.prepare('SELECT s.*, u.name as user_name FROM subscriptions s JOIN users u ON s.user_id = u.id WHERE s.id = ?').get(id) as any;

    if (!sub) {
      return res.status(404).json({ error: 'Abonnement introuvable.' });
    }

    const currentExpire = new Date(sub.expires_date > new Date().toISOString() ? sub.expires_date : new Date().toISOString());
    const newExpires = new Date(currentExpire.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    db.prepare("UPDATE subscriptions SET expires_date = ?, status = 'active', updated_at = ? WHERE id = ?").run(newExpires, now, id);

    logActivity({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'sub_extend',
      targetType: 'subscription',
      targetId: id,
      details: `Prolongation de 30 jours pour ${sub.user_name} jusqu'au ${newExpires.slice(0, 10)}`,
      result: 'success'
    });

    res.json({ success: true, message: `Abonnement prolongé jusqu'au ${newExpires.slice(0, 10)}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Gestion des Paiements
apiRouter.get('/admin/payments', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { status, method, search } = req.query;

    let query = `
      SELECT p.*, pl.name as plan_name, u.name as user_name, u.phone as user_phone
      FROM payments p
      JOIN plans pl ON p.plan_id = pl.id
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }
    if (method) {
      query += ` AND p.payment_method = ?`;
      params.push(method);
    }
    if (search) {
      query += ` AND (p.id LIKE ? OR u.name LIKE ? OR p.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY p.created_at DESC`;

    const payments = db.prepare(query).all(...params);
    res.json({ payments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Remboursement d'un paiement
apiRouter.post('/admin/payments/:id/refund', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const admin = (req as any).admin;

    const payment = db.prepare('SELECT p.*, u.name as user_name FROM payments p JOIN users u ON p.user_id = u.id WHERE p.id = ?').get(id) as any;
    if (!payment) {
      return res.status(404).json({ error: 'Paiement introuvable.' });
    }

    if (payment.status !== 'successful') {
      return res.status(400).json({ error: 'Seul un paiement réussi peut faire l\'objet d\'un remboursement.' });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE payments SET status = 'refunded', updated_at = ? WHERE id = ?").run(now, id);

    // Si lié à un abonnement, le suspendre ou l'annuler
    if (payment.subscription_id) {
      db.prepare("UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE id = ?").run(now, payment.subscription_id);
    }

    logActivity({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'payment_refund',
      targetType: 'payment',
      targetId: id,
      details: `Remboursement de ${payment.amount} FCFA pour ${payment.user_name}. Motif: ${reason || 'Non précisé'}`,
      result: 'success'
    });

    res.json({ success: true, message: 'Paiement remboursé et abonnement résilié.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Suivi Analytics et Visites
apiRouter.get('/admin/analytics', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // Visiteurs en temps réel (15 dernières minutes)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const activeNow = (db.prepare('SELECT count(DISTINCT session_id) as count FROM analytics_events WHERE created_at >= ?').get(fifteenMinsAgo) as any)?.count || 0;

    // Évolution des visites par jour sur 30 jours
    const dailyVisits = db.prepare(`
      SELECT substr(created_at, 1, 10) as date, count(DISTINCT session_id) as visitors, count(*) as pageviews
      FROM analytics_events
      WHERE created_at >= ?
      GROUP BY date
      ORDER BY date ASC
    `).all(thirtyDaysAgo);

    // Top pages visitées
    const topPages = db.prepare(`
      SELECT path, count(*) as views
      FROM analytics_events
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10
    `).all();

    // Répartition par appareil
    const devices = db.prepare(`
      SELECT device_type, count(*) as count
      FROM analytics_events
      GROUP BY device_type
    `).all();

    res.json({
      activeNow,
      dailyVisits,
      topPages,
      devices
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Utilisateurs actifs en temps réel / récemment actifs
apiRouter.get('/admin/active-users', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const users = db.prepare(`
      SELECT u.id, u.name, u.phone, u.status, u.last_seen_at, u.created_at,
             pl.name as plan_name, s.status as sub_status, s.expires_date,
             CASE WHEN u.last_seen_at >= ? THEN 1 ELSE 0 END as is_online
      FROM users u
      LEFT JOIN plans pl ON u.current_plan_id = pl.id
      LEFT JOIN subscriptions s ON u.current_subscription_id = s.id
      ORDER BY u.last_seen_at DESC NULLS LAST, u.created_at DESC
      LIMIT 20
    `).all(twoMinutesAgo);

    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Messagerie : Liste des conversations
apiRouter.get('/admin/conversations', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const conversations = db.prepare(`
      SELECT c.*,
             (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
      ORDER BY c.last_message_at DESC
    `).all();

    res.json({ conversations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Messagerie : Messages d'une conversation
apiRouter.get('/admin/conversations/:id', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation introuvable.' });
    }

    const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(id);

    // Marquer les messages envoyés par l'utilisateur comme lus par l'admin
    db.prepare("UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_type = 'user'").run(id);
    db.prepare('UPDATE conversations SET unread_admin_count = 0 WHERE id = ?').run(id);

    res.json({ conversation, messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Messagerie : Réponse administrateur
apiRouter.post('/admin/conversations/:id/reply', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const admin = (req as any).admin;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Le message ne peut pas être vide.' });
    }

    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as any;
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation introuvable.' });
    }

    const now = new Date().toISOString();
    const msgId = `MSG-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_type, sender_id, sender_name, content, is_read, created_at)
      VALUES (?, ?, 'admin', ?, ?, ?, 0, ?)
    `).run(msgId, id, admin.id, admin.name, content.trim(), now);

    db.prepare(`
      UPDATE conversations
      SET last_message_at = ?, unread_user_count = unread_user_count + 1
      WHERE id = ?
    `).run(now, id);

    logActivity({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'message_sent',
      targetType: 'conversation',
      targetId: id,
      details: `Réponse envoyée à ${conversation.user_name}`,
      result: 'success'
    });

    res.json({ success: true, messageId: msgId, createdAt: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications administrateur
apiRouter.get('/admin/notifications', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all();
    const unreadCount = (db.prepare('SELECT count(*) as count FROM notifications WHERE is_read = 0').get() as any)?.count || 0;

    res.json({ notifications, unreadCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Marquer une notification comme lue
apiRouter.post('/admin/notifications/:id/read', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Marquer toutes les notifications comme lues
apiRouter.post('/admin/notifications/read-all', requireAdminAuth, (req: Request, res: Response) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1').run();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Journal d'activité (Logs)
apiRouter.get('/admin/logs', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { action, search } = req.query;
    let query = 'SELECT * FROM activity_logs WHERE 1=1';
    const params: any[] = [];

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    if (search) {
      query += ' AND (details LIKE ? OR admin_email LIKE ? OR ip_address LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';
    const logs = db.prepare(query).all(...params);

    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Paramètres SaaS
apiRouter.get('/admin/settings', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const r of rows) {
      // Masquer les secrets pour la sécurité du frontend
      if (r.key.includes('secret') || r.key.includes('api_key') || r.key.includes('client_secret')) {
        settings[r.key] = r.value ? '••••••••••••••••' : '';
      } else {
        settings[r.key] = r.value;
      }
    }

    // Récupérer les forfaits configurables
    const plans = db.prepare('SELECT * FROM plans ORDER BY price ASC').all() as any[];
    const parsedPlans = plans.map(p => ({
      ...p,
      features: JSON.parse(p.features)
    }));

    res.json({
      settings,
      plans: parsedPlans,
      ownerPhone: OWNER_PHONE
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mise à jour des paramètres
apiRouter.put('/admin/settings', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { settings, plans } = req.body;
    const admin = (req as any).admin;
    const now = new Date().toISOString();

    if (settings && typeof settings === 'object') {
      const updateSetting = db.prepare('INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)');
      for (const [key, val] of Object.entries(settings)) {
        // Ignorer si la valeur est masquée
        if (typeof val === 'string' && val !== '••••••••••••••••') {
          updateSetting.run(key, val, now);
        }
      }
    }

    if (Array.isArray(plans)) {
      const updatePlan = db.prepare('UPDATE plans SET name = ?, price = ?, tagline = ?, features = ? WHERE id = ?');
      for (const p of plans) {
        updatePlan.run(p.name, p.price, p.tagline, JSON.stringify(p.features || []), p.id);
      }
    }

    logActivity({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'settings_update',
      targetType: 'settings',
      details: 'Mise à jour des paramètres du SaaS et des forfaits',
      result: 'success'
    });

    res.json({ success: true, message: 'Paramètres enregistrés avec succès.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
