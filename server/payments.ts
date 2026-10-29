import crypto from 'crypto';
import { db } from './db.js';
import { logActivity, createNotification, verifyHmacSignature } from './security.js';

export const OWNER_PHONE = '+221 78 424 34 20';
export const OWNER_PHONE_RAW = '+221784243420';

export interface CreatePaymentParams {
  planId: string;
  paymentMethod: 'wave' | 'orange_money';
  fullName: string;
  phone: string;
  email?: string;
  autoRenew?: boolean;
  ipAddress?: string;
}

// Nettoyage et normalisation du numéro de téléphone sénégalais (+221...)
export function normalizeSenegalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('221') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.length === 9) {
    return `+221${digits}`;
  }
  return phone.trim();
}

// Vérification de la validité d'un numéro sénégalais (70, 75, 76, 77, 78)
export function isValidSenegalPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  const localNum = digits.startsWith('221') ? digits.slice(3) : digits;
  return /^(7[05678])\d{7}$/.test(localNum);
}

// Création d'une transaction unique
export async function createPaymentTransaction(params: CreatePaymentParams) {
  const { planId, paymentMethod, fullName, phone, email, autoRenew = true, ipAddress } = params;

  const normalizedPhone = normalizeSenegalPhone(phone);
  if (!isValidSenegalPhone(normalizedPhone)) {
    throw new Error('Numéro sénégalais invalide. Doit débuter par 70, 75, 76, 77 ou 78.');
  }

  // Vérifier le plan
  const plan = db.prepare('SELECT * FROM plans WHERE id = ? AND is_active = 1').get(planId) as any;
  if (!plan) {
    throw new Error('Le forfait sélectionné est introuvable ou inactif.');
  }

  const now = new Date().toISOString();

  // Créer ou récupérer l'utilisateur
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(normalizedPhone) as any;
  if (!user) {
    const userId = `USR-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    db.prepare(`
      INSERT INTO users (id, name, email, phone, status, current_plan_id, ip_address, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)
    `).run(userId, fullName.trim(), email?.trim() || null, normalizedPhone, planId, ipAddress || null, now, now);

    user = { id: userId, name: fullName.trim(), phone: normalizedPhone };

    createNotification({
      type: 'new_user',
      title: 'Nouvel utilisateur inscrit',
      message: `${fullName.trim()} (${normalizedPhone}) s'est inscrit.`,
      link: `/admin#users`
    });
  } else {
    // Mettre à jour le nom si fourni
    db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?')
      .run(fullName.trim(), now, user.id);
  }

  // Générer un identifiant de transaction unique TX-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const paymentId = `TX-${dateStr}-${randomSuffix}`;

  // Récupérer les clés API configurées
  const waveKey = (db.prepare("SELECT value FROM app_settings WHERE key = 'wave_api_key'").get() as any)?.value || process.env.WAVE_API_KEY;
  const orangeClientId = (db.prepare("SELECT value FROM app_settings WHERE key = 'orange_client_id'").get() as any)?.value || process.env.ORANGE_MONEY_CLIENT_ID;

  let checkoutUrl: string | null = null;
  let providerTxId: string | null = null;
  let paymentInstructions = '';

  if (paymentMethod === 'wave') {
    paymentInstructions = `Ouvrez l'application Wave sur votre téléphone et confirmez le paiement de ${plan.price.toLocaleString('fr-FR')} FCFA destiné à Tekki Services (${OWNER_PHONE}).`;
    if (waveKey) {
      providerTxId = `WAVE-${Date.now()}`;
      checkoutUrl = `https://pay.wave.com/m/${providerTxId}`;
    }
  } else {
    paymentInstructions = `Composez le #144# ou confirmez la notification Orange Money sur votre téléphone pour valider les ${plan.price.toLocaleString('fr-FR')} FCFA.`;
    if (orangeClientId) {
      providerTxId = `OM-${Date.now()}`;
      checkoutUrl = `https://webpayment.orange-money.com/pay/${providerTxId}`;
    }
  }

  // Insérer la transaction en statut 'pending'
  db.prepare(`
    INSERT INTO payments (
      id, user_id, plan_id, amount, currency, payment_method, phone, recipient_phone,
      status, provider_tx_id, provider_response, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'XOF', ?, ?, ?, 'pending', ?, ?, ?, ?)
  `).run(
    paymentId,
    user.id,
    planId,
    plan.price,
    paymentMethod,
    normalizedPhone,
    OWNER_PHONE_RAW,
    providerTxId,
    JSON.stringify({ instructions: paymentInstructions }),
    now,
    now
  );

  // Enregistrer l'événement initial
  db.prepare(`
    INSERT INTO payment_events (id, payment_id, event_type, payload, created_at)
    VALUES (?, ?, 'payment.created', ?, ?)
  `).run(
    `EVT-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    paymentId,
    JSON.stringify({ planId, amount: plan.price, paymentMethod, normalizedPhone }),
    now
  );

  return {
    paymentId,
    userId: user.id,
    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      currency: plan.currency
    },
    paymentMethod,
    amount: plan.price,
    phone: normalizedPhone,
    recipientPhone: OWNER_PHONE,
    status: 'pending',
    checkoutUrl,
    instructions: paymentInstructions,
    createdAt: now
  };
}

// Confirmation sécurisée et idempotente d'un paiement côté backend
export function confirmPaymentSuccess(paymentId: string, providerTxId?: string, webhookPayload?: any) {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as any;
  if (!payment) {
    throw new Error(`Paiement ${paymentId} introuvable.`);
  }

  // Idempotence : si déjà réussi, ne rien faire de plus
  if (payment.status === 'successful') {
    return {
      status: 'already_processed',
      message: 'Ce paiement a déjà été validé et activé.',
      payment
    };
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // Calcul de la date d'expiration (+30 jours)
  const expiresDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Exécuter l'activation dans une transaction SQL atomique
  const transaction = db.transaction(() => {
    // 1. Mettre à jour le paiement
    db.prepare(`
      UPDATE payments
      SET status = 'successful',
          paid_at = ?,
          provider_tx_id = COALESCE(?, provider_tx_id),
          provider_response = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      nowIso,
      providerTxId || null,
      webhookPayload ? JSON.stringify(webhookPayload) : payment.provider_response,
      nowIso,
      paymentId
    );

    // 2. Créer ou prolonger l'abonnement
    const subId = `SUB-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    db.prepare(`
      INSERT INTO subscriptions (
        id, user_id, plan_id, status, auto_renew, start_date, expires_date, last_payment_id, created_at, updated_at
      ) VALUES (?, ?, ?, 'active', 1, ?, ?, ?, ?, ?)
    `).run(
      subId,
      payment.user_id,
      payment.plan_id,
      nowIso,
      expiresDate,
      paymentId,
      nowIso,
      nowIso
    );

    // 3. Associer le subscription_id au paiement
    db.prepare('UPDATE payments SET subscription_id = ? WHERE id = ?').run(subId, paymentId);

    // 4. Mettre à jour l'utilisateur
    db.prepare(`
      UPDATE users
      SET current_plan_id = ?,
          current_subscription_id = ?,
          updated_at = ?
      WHERE id = ?
    `).run(payment.plan_id, subId, nowIso, payment.user_id);

    // 5. Enregistrer l'événement de paiement
    db.prepare(`
      INSERT INTO payment_events (id, payment_id, event_type, payload, created_at)
      VALUES (?, ?, 'payment.successful', ?, ?)
    `).run(
      `EVT-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      paymentId,
      JSON.stringify({ subId, expiresDate, providerTxId }),
      nowIso
    );
  });

  transaction();

  // Récupérer les infos utilisateur pour notification et logs
  const user = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(payment.user_id) as any;
  const plan = db.prepare('SELECT name FROM plans WHERE id = ?').get(payment.plan_id) as any;

  // Créer une notification pour l'administrateur
  createNotification({
    type: 'payment_success',
    title: `Paiement ${payment.payment_method.toUpperCase()} reçu (${payment.amount.toLocaleString('fr-FR')} FCFA)`,
    message: `${user?.name || 'Client'} (+221 ${user?.phone}) a activé la formule ${plan?.name} via ${payment.payment_method === 'wave' ? 'Wave' : 'Orange Money'}.`,
    link: `/admin#payments`
  });

  // Log d'activité
  logActivity({
    action: 'payment_confirmed',
    targetType: 'payment',
    targetId: paymentId,
    details: `Paiement de ${payment.amount} FCFA confirmé pour ${user?.name} (${payment.payment_method}). Abonnement activé jusqu'au ${expiresDate.slice(0, 10)}.`,
    result: 'success'
  });

  return {
    status: 'success',
    paymentId,
    subscriptionId: payment.subscription_id,
    expiresDate,
    paidAt: nowIso
  };
}

// Marquer un paiement comme échoué
export function markPaymentFailed(paymentId: string, reason: string, payload?: any) {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as any;
  if (!payment) return null;

  if (payment.status === 'successful') {
    return { status: 'cannot_fail_successful_payment' };
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE payments
    SET status = 'failed',
        error_message = ?,
        updated_at = ?
    WHERE id = ?
  `).run(reason, now, paymentId);

  db.prepare(`
    INSERT INTO payment_events (id, payment_id, event_type, payload, created_at)
    VALUES (?, ?, 'payment.failed', ?, ?)
  `).run(
    `EVT-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    paymentId,
    JSON.stringify({ reason, payload }),
    now
  );

  createNotification({
    type: 'payment_failed',
    title: `Paiement échoué (${payment.id})`,
    message: `Le paiement de ${payment.amount.toLocaleString('fr-FR')} FCFA via ${payment.payment_method} a échoué : ${reason}`,
    link: `/admin#payments`
  });

  logActivity({
    action: 'payment_failed',
    targetType: 'payment',
    targetId: paymentId,
    details: `Échec paiement : ${reason}`,
    result: 'failed'
  });

  return { status: 'failed', paymentId, reason };
}

// Vérification automatique des abonnements expirés
export function checkAndExpireSubscriptions() {
  const now = new Date().toISOString();
  const expiredSubs = db.prepare(`
    SELECT s.id, s.user_id, s.plan_id, u.name, u.phone
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    WHERE s.status = 'active' AND s.expires_date < ?
  `).all(now) as any[];

  for (const sub of expiredSubs) {
    db.prepare(`
      UPDATE subscriptions
      SET status = 'expired', updated_at = ?
      WHERE id = ?
    `).run(now, sub.id);

    // Si c'est l'abonnement en cours de l'utilisateur, retirer l'abonnement actif
    db.prepare(`
      UPDATE users
      SET current_subscription_id = NULL, updated_at = ?
      WHERE id = ? AND current_subscription_id = ?
    `).run(now, sub.user_id, sub.id);

    createNotification({
      type: 'subscription_expired',
      title: `Abonnement expiré pour ${sub.name}`,
      message: `L'abonnement de ${sub.name} (+221 ${sub.phone}) est arrivé à échéance.`,
      link: `/admin#subscriptions`
    });

    logActivity({
      action: 'subscription_expired',
      targetType: 'subscription',
      targetId: sub.id,
      details: `Abonnement de ${sub.name} expiré automatiquement le ${now.slice(0, 10)}.`,
      result: 'success'
    });
  }
}
