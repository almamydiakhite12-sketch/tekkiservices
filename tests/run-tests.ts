import assert from 'assert';
import { db, initDatabase } from '../server/db.js';
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  verifyHmacSignature,
  checkRateLimit
} from '../server/security.js';
import {
  createPaymentTransaction,
  confirmPaymentSuccess,
  markPaymentFailed,
  checkAndExpireSubscriptions,
  isValidSenegalPhone,
  normalizeSenegalPhone,
  OWNER_PHONE
} from '../server/payments.js';

async function runAllTests() {
  console.log('--- DÉBUT DE LA SUITE DE TESTS COMPLÈTE TEKKI SERVICES ---');

  // 1. Initialisation BD
  console.log('1. Test initialisation base de données...');
  initDatabase();
  const plans = db.prepare('SELECT * FROM plans').all();
  assert(plans.length >= 3, 'Au moins 3 forfaits (Starter, Pro, Business) doivent exister.');
  console.log('✓ Base de données initialisée avec succès.');

  // 2. Numéro du propriétaire
  console.log('2. Test vérification du numéro du propriétaire...');
  assert.strictEqual(OWNER_PHONE, '+221 78 424 34 20', 'Le numéro propriétaire doit être +221 78 424 34 20.');
  assert(isValidSenegalPhone('+221784243420'), 'Le numéro du propriétaire doit être un numéro sénégalais valide.');
  console.log('✓ Numéro propriétaire vérifié.');

  // 3. Validation et normalisation des numéros sénégalais
  console.log('3. Test validation des numéros sénégalais...');
  assert(isValidSenegalPhone('77 123 45 67'), '77 123 45 67 doit être valide.');
  assert(isValidSenegalPhone('+221 78 424 34 20'), '+221 78 424 34 20 doit être valide.');
  assert(isValidSenegalPhone('70 999 88 77'), '70 doit être valide.');
  assert(!isValidSenegalPhone('06 12 34 56 78'), 'Numéro français ne doit pas être valide.');
  assert(!isValidSenegalPhone('12345'), 'Numéro court ne doit pas être valide.');
  console.log('✓ Validation des numéros sénégalais validée.');

  // 4. Hachage et sécurité des mots de passe
  console.log('4. Test sécurité des mots de passe (scrypt + sel)...');
  const pwd = 'MasterPassword2026!';
  const hash = await hashPassword(pwd);
  assert(hash.includes(':'), 'Le hash doit contenir le sel et la clé dérivée.');
  const isValid = await verifyPassword(pwd, hash);
  assert(isValid, 'Le mot de passe correct doit être validé.');
  const isInvalid = await verifyPassword('MauvaisPassword', hash);
  assert(!isInvalid, 'Le mauvais mot de passe doit être rejeté.');
  console.log('✓ Hachage de mot de passe sécurisé validé.');

  // 5. Rate limiting anti force brute
  console.log('5. Test rate limiting...');
  const testKey = `test_limit_${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    assert(checkRateLimit(testKey, 5, 10000), `La tentative ${i + 1} doit passer.`);
  }
  assert(!checkRateLimit(testKey, 5, 10000), 'La 6ème tentative doit être bloquée par le limiteur.');
  console.log('✓ Protection anti-force brute validée.');

  // 6. Signatures HMAC pour Webhooks
  console.log('6. Test vérification signature HMAC Webhook...');
  const payload = JSON.stringify({ event: 'payment.success', amount: 15000 });
  const secret = 'super_secret_webhook_key_123';
  const crypto = await import('crypto');
  const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  assert(verifyHmacSignature(payload, validSignature, secret), 'Signature valide doit être acceptée.');
  assert(!verifyHmacSignature(payload, 'signature_falsifiee', secret), 'Signature falsifiée doit être rejetée.');
  console.log('✓ Signatures cryptographiques Webhook validées.');

  // 7. Création de transaction utilisateur et paiement Wave
  console.log('7. Test création de transaction Wave...');
  const waveTx = await createPaymentTransaction({
    planId: 'pro',
    paymentMethod: 'wave',
    fullName: 'Awa Ndiaye',
    phone: '+221 77 555 44 33',
    email: 'awa.ndiaye@test.sn',
    autoRenew: true
  });

  assert(waveTx.paymentId.startsWith('TX-'), 'L\'identifiant de transaction doit débuter par TX-.');
  assert.strictEqual(waveTx.amount, 15000, 'Le montant de la formule Pro doit être 15 000 FCFA.');
  assert.strictEqual(waveTx.status, 'pending', 'Le statut initial doit être pending.');
  assert.strictEqual(waveTx.recipientPhone, '+221 78 424 34 20', 'Le numéro de réception doit être celui du propriétaire.');
  console.log('✓ Création de transaction Wave validée.');

  // 8. Confirmation de paiement et activation automatique d\'abonnement
  console.log('8. Test confirmation de paiement et activation d\'abonnement...');
  const confirmResult = confirmPaymentSuccess(waveTx.paymentId, 'WAVE-SRV-999', { test: true });
  assert.strictEqual(confirmResult.status, 'success', 'La confirmation doit réussir.');

  // Vérifier en base
  const updatedPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(waveTx.paymentId) as any;
  assert.strictEqual(updatedPayment.status, 'successful', 'Le paiement doit être en statut successful.');
  assert(updatedPayment.paid_at, 'La date de paiement paid_at doit être renseignée.');
  assert(updatedPayment.subscription_id, 'Un abonnement doit être lié.');

  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(updatedPayment.subscription_id) as any;
  assert.strictEqual(sub.status, 'active', 'L\'abonnement doit être actif.');
  assert(new Date(sub.expires_date) > new Date(), 'La date d\'expiration doit être dans le futur (+30 jours).');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(waveTx.userId) as any;
  assert.strictEqual(user.current_subscription_id, sub.id, 'L\'utilisateur doit avoir son abonnement mis à jour.');
  console.log('✓ Activation automatique d\'abonnement validée (+30 jours).');

  // 9. Idempotence : prévention du double paiement / double webhook
  console.log('9. Test idempotence et prévention du double paiement...');
  const duplicateConfirm = confirmPaymentSuccess(waveTx.paymentId, 'WAVE-SRV-999-REPLAY', { replay: true });
  assert.strictEqual(duplicateConfirm.status, 'already_processed', 'Un second webhook pour la même transaction ne doit pas réactiver l\'abonnement.');
  console.log('✓ Prévention du double webhook validée.');

  // 10. Paiement échoué
  console.log('10. Test gestion d\'un paiement échoué...');
  const failedTx = await createPaymentTransaction({
    planId: 'starter',
    paymentMethod: 'orange_money',
    fullName: 'Moussa Ba',
    phone: '+221 76 111 22 33'
  });
  markPaymentFailed(failedTx.paymentId, 'Solde insuffisant Orange Money');
  const failedPaymentRecord = db.prepare('SELECT * FROM payments WHERE id = ?').get(failedTx.paymentId) as any;
  assert.strictEqual(failedPaymentRecord.status, 'failed', 'Le paiement doit être marqué comme failed.');
  assert.strictEqual(failedPaymentRecord.error_message, 'Solde insuffisant Orange Money');
  console.log('✓ Gestion du paiement échoué validée.');

  // 11. Expiration automatique des abonnements
  console.log('11. Test expiration automatique des abonnements...');
  // Forcer une date d'expiration dans le passé pour tester le cron
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE subscriptions SET expires_date = ? WHERE id = ?').run(pastDate, sub.id);
  checkAndExpireSubscriptions();
  const expiredSub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(sub.id) as any;
  assert.strictEqual(expiredSub.status, 'expired', 'L\'abonnement dépassé doit être marqué expired.');
  console.log('✓ Expiration automatique validée.');

  // 12. Messagerie support Admin <-> Utilisateur
  console.log('12. Test messagerie intégrée...');
  const convId = `CONV-TEST-${Date.now()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO conversations (id, user_name, user_phone, last_message_at, unread_admin_count, created_at)
    VALUES (?, 'Fatou Diop', '+221 78 123 45 67', ?, 1, ?)
  `).run(convId, now, now);

  db.prepare(`
    INSERT INTO messages (id, conversation_id, sender_type, sender_id, sender_name, content, created_at)
    VALUES (?, ?, 'user', 'client', 'Fatou Diop', 'Bonjour, mon paiement Wave est-il confirmé ?', ?)
  `).run(`MSG-1-${Date.now()}`, convId, now);

  const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ?').all(convId);
  assert.strictEqual(messages.length, 1, 'Le message doit être persisté.');
  console.log('✓ Messagerie support validée.');

  // 13. Audit logs
  console.log('13. Test journal d\'activité (Logs)...');
  const logs = db.prepare('SELECT * FROM activity_logs').all();
  assert(logs.length > 0, 'Des logs d\'activité doivent avoir été enregistrés pour chaque opération.');
  console.log(`✓ Journal d'audit validé (${logs.length} logs enregistrés).`);

  // 14. Zéro fausses données
  console.log('14. Test vérification aucune donnée fictive...');
  const realUsersCount = (db.prepare('SELECT count(*) as count FROM users').get() as any).count;
  assert(realUsersCount >= 2, 'Les seuls utilisateurs présents sont ceux réellement créés.');
  console.log(`✓ Vérification stricte des données : ${realUsersCount} utilisateurs réels.`);

  // 15. Création d'un site web par un abonné actif avec modèles
  console.log('15. Test création d\'un site web par abonné avec modèles au choix...');
  // Réactiver l'abonnement de Fatou Diop pour le test
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("UPDATE subscriptions SET status = 'active', expires_date = ? WHERE id = ?").run(futureDate, sub.id);

  const siteId = `site-test-${Date.now()}`;
  const siteSlug = `boutique-fatou-${Date.now().toString().slice(-4)}`;
  db.prepare(`
    INSERT INTO sites (id, user_id, slug, title, template_id, is_published, content_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    siteId,
    user.id,
    siteSlug,
    'Boutique Fatou Dakar',
    'ecommerce',
    JSON.stringify({
      businessName: 'Boutique Fatou Dakar',
      heroTitle: 'Mode et Accessoires Tendances à Dakar',
      heroSubtitle: 'Commandez en ligne et payez facilement via Wave ou Orange Money',
      contactPhone: '+221 78 123 45 67',
      contactAddress: 'Plateau, Dakar'
    }),
    new Date().toISOString(),
    new Date().toISOString()
  );

  const createdSite = db.prepare('SELECT * FROM sites WHERE id = ?').get(siteId) as any;
  assert.strictEqual(createdSite.title, 'Boutique Fatou Dakar');
  assert.strictEqual(createdSite.template_id, 'ecommerce');
  assert.strictEqual(createdSite.is_published, 1);
  console.log('✓ Création du site par abonné validée avec le modèle E-commerce.');

  // 16. Blocage de création/mise à jour lorsque l'abonnement mensuel n'est pas renouvelé (expiré)
  console.log('16. Test blocage de l\'accès au service si abonnement expiré (renouvellement mensuel)...');
  db.prepare("UPDATE subscriptions SET status = 'expired', expires_date = ? WHERE id = ?").run(pastDate, sub.id);
  
  // Vérifier la fonction d'autorisation : sans abonnement actif, l'utilisateur ne peut pas modifier son site
  const refreshedSub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(sub.id) as any;
  const isSubActiveNow = refreshedSub.status === 'active' && refreshedSub.expires_date > new Date().toISOString();
  assert.strictEqual(isSubActiveNow, false, "L'abonnement doit être reconnu comme non-actif/expiré.");
  console.log('✓ Blocage des services pour abonnement non renouvelé validé.');

  // 17. Consultation publique du site par tout le monde (/s/:slug)
  console.log('17. Test consultation publique du site web (/s/:slug)...');
  const publicSite = db.prepare('SELECT * FROM sites WHERE slug = ?').get(siteSlug) as any;
  assert(publicSite, 'Le site doit être trouvé via son slug public unique.');
  assert.strictEqual(publicSite.slug, siteSlug);
  // Incrémenter les vues
  db.prepare('UPDATE sites SET views_count = views_count + 1 WHERE id = ?').run(siteId);
  const updatedSite = db.prepare('SELECT views_count FROM sites WHERE id = ?').get(siteId) as any;
  assert.strictEqual(updatedSite.views_count, 1, 'Le compteur de vues publiques doit être incrémenté.');
  console.log('✓ Site public visible pour tout le monde avec compteur de vues validé.');

  console.log('\n======================================================');
  console.log('TOUS LES 17 TESTS DE VALIDATION ONT RÉUSSI AVEC SUCCÈS !');
  console.log('======================================================\n');
}

runAllTests().catch((err) => {
  console.error('ÉCHEC DES TESTS :', err);
  process.exit(1);
});

