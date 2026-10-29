import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PaymentBadge } from '../components/PaymentBadge';
import {
  Lock,
  Smartphone,
  Check,
  ShieldCheck,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import type { Plan } from '../types';

export const AbonnementPage: React.FC = () => {
  // Récupérer le plan depuis l'URL
  const searchParams = new URLSearchParams(window.location.search);
  const initialPlanId = searchParams.get('plan') || 'pro';

  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange_money'>('wave');
  const [fullName, setFullName] = useState(() => localStorage.getItem('tekki_user_name') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('tekki_user_phone')?.replace(/^\+221/, '') || '');
  const [email, setEmail] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);

  const [plans, setPlans] = useState<Plan[]>([
    {
      id: 'starter',
      name: 'Starter',
      price: 5000,
      currency: 'XOF',
      tagline: 'Pour démarrer seul',
      features: ['1 utilisateur', 'Accès aux services de base', 'Support par e-mail'],
      duration_days: 30,
      is_active: 1
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 15000,
      currency: 'XOF',
      tagline: 'Le plus choisi',
      features: [
        "Jusqu'à 5 utilisateurs",
        'Tous les services Tekki',
        'Support WhatsApp prioritaire',
        'Rapports mensuels'
      ],
      duration_days: 30,
      is_active: 1,
      highlighted: 1
    },
    {
      id: 'business',
      name: 'Business',
      price: 35000,
      currency: 'XOF',
      tagline: 'Pour les équipes',
      features: [
        'Utilisateurs illimités',
        'Tous les services Tekki',
        'Accompagnement dédié',
        'Facturation entreprise'
      ],
      duration_days: 30,
      is_active: 1
    }
  ]);

  const [step, setStep] = useState<'form' | 'pending' | 'done'>('form');
  const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);

  // Charger les forfaits dynamiques depuis l'API
  useEffect(() => {
    fetch('/api/plans')
      .then((res) => res.json())
      .then((data) => {
        if (data.plans && data.plans.length > 0) {
          setPlans(data.plans);
        }
      })
      .catch(() => {});
  }, []);

  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[1] || plans[0];

  // Validation du numéro sénégalais
  const cleanPhone = phone.replace(/\D/g, '');
  const isValidPhone = /^(7[05678])\d{7}$/.test(cleanPhone);

  const formatPrice = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  };

  // Soumission du formulaire pour créer la transaction
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone || !fullName.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanId,
          paymentMethod,
          fullName: fullName.trim(),
          phone: `+221${cleanPhone}`,
          email: email.trim() || undefined,
          autoRenew
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la transaction.');
      }

      setCurrentPaymentId(data.paymentId);
      setPaymentDetails(data);
      setStep('pending');

      localStorage.setItem('tekki_user_name', fullName.trim());
      localStorage.setItem('tekki_user_phone', `+221${cleanPhone}`);
      if (data.userId) {
        localStorage.setItem('tekki_user_id', data.userId);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Impossible d’initier le paiement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Polling de confirmation de paiement côté serveur
  useEffect(() => {
    if (step !== 'pending' || !currentPaymentId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status/${currentPaymentId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'successful') {
            setPaymentDetails(data);
            setStep('done');
            clearInterval(interval);
          } else if (data.status === 'failed') {
            setErrorMessage('Le paiement a été refusé ou a échoué.');
            setStep('form');
            clearInterval(interval);
          }
        }
      } catch {
        // En cas d'erreur réseau temporaire, continuer le polling
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [step, currentPaymentId]);

  // Déclenchement de la validation webhook (test / direct)
  const handleTriggerWebhookSimulation = async () => {
    if (!currentPaymentId) return;
    setIsSimulatingWebhook(true);
    try {
      const res = await fetch('/api/webhooks/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: currentPaymentId,
          status: 'successful'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentDetails((prev: any) => ({ ...prev, ...data, status: 'successful' }));
        setStep('done');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f1e7] text-[#0d1b1e]">
      <Header currentPath="/abonnement" />

      <main className="grain flex-1 min-h-[calc(100vh-4rem)]">
        <div className="mx-auto max-w-5xl px-5 py-12 lg:py-16 grid lg:grid-cols-[1.3fr_1fr] gap-8 items-start">
          {/* COLONNE GAUCHE : PROCESSUS DE PAIEMENT */}
          <section className="rounded-3xl bg-white border border-[#0d1b1e]/10 p-6 sm:p-8 shadow-sm">
            {step === 'form' && (
              <form onSubmit={handleSubmitPayment} className="space-y-8">
                <div>
                  <h1 className="text-3xl font-extrabold text-[#0d1b1e]">Activer mon abonnement</h1>
                  <p className="mt-2 text-[#3b4a4d]">Paiement mobile sécurisé, activation immédiate.</p>
                </div>

                {errorMessage && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
                    <AlertCircle className="size-5 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* 1. CHOIX DE LA FORMULE */}
                <fieldset>
                  <legend className="font-bold mb-3 text-sm text-[#0d1b1e] uppercase tracking-wider">
                    1. Formule
                  </legend>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {plans.map((p) => {
                      const isSelected = selectedPlanId === p.id;
                      return (
                        <label
                          key={p.id}
                          className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                            isSelected
                              ? 'border-[#0f5257] bg-[#0f5257]/5 shadow-sm'
                              : 'border-[#0d1b1e]/10 hover:border-[#0d1b1e]/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="plan"
                            className="sr-only"
                            checked={isSelected}
                            onChange={() => setSelectedPlanId(p.id)}
                          />
                          <span className="block font-bold text-[#0d1b1e]">{p.name}</span>
                          <span className="block text-sm text-[#3b4a4d] mt-0.5">{formatPrice(p.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {/* 2. MOYEN DE PAIEMENT */}
                <fieldset>
                  <legend className="font-bold mb-3 text-sm text-[#0d1b1e] uppercase tracking-wider">
                    2. Moyen de paiement
                  </legend>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {/* WAVE */}
                    <label
                      className={`cursor-pointer rounded-2xl border-2 p-4 flex items-center gap-3 transition-all ${
                        paymentMethod === 'wave'
                          ? 'border-[#1dc4ff] bg-[#1dc4ff]/10 shadow-sm'
                          : 'border-[#0d1b1e]/10 hover:border-[#0d1b1e]/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="method"
                        className="sr-only"
                        checked={paymentMethod === 'wave'}
                        onChange={() => setPaymentMethod('wave')}
                      />
                      <PaymentBadge method="wave" size="lg" />
                      <div>
                        <span className="block font-bold text-[#0d1b1e]">Wave</span>
                        <span className="block text-xs text-[#3b4a4d]">Validation via Application Wave</span>
                      </div>
                    </label>

                    {/* ORANGE MONEY */}
                    <label
                      className={`cursor-pointer rounded-2xl border-2 p-4 flex items-center gap-3 transition-all ${
                        paymentMethod === 'orange_money'
                          ? 'border-[#ff7900] bg-[#ff7900]/10 shadow-sm'
                          : 'border-[#0d1b1e]/10 hover:border-[#0d1b1e]/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="method"
                        className="sr-only"
                        checked={paymentMethod === 'orange_money'}
                        onChange={() => setPaymentMethod('orange_money')}
                      />
                      <PaymentBadge method="orange" size="lg" />
                      <div>
                        <span className="block font-bold text-[#0d1b1e]">Orange Money</span>
                        <span className="block text-xs text-[#3b4a4d]">Validation via #144#</span>
                      </div>
                    </label>
                  </div>
                </fieldset>

                {/* 3. VOS INFORMATIONS */}
                <fieldset className="space-y-4">
                  <legend className="font-bold mb-3 text-sm text-[#0d1b1e] uppercase tracking-wider">
                    3. Vos informations
                  </legend>

                  <label className="block">
                    <span className="text-sm font-semibold text-[#0d1b1e]">Nom complet</span>
                    <input
                      required
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#0d1b1e]/20 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                      placeholder="Awa Ndiaye"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-[#0d1b1e]">
                      Numéro {paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}
                    </span>
                    <div className="mt-1 flex rounded-xl border border-[#0d1b1e]/20 focus-within:ring-2 focus-within:ring-[#0f5257] overflow-hidden">
                      <span className="px-4 py-3 bg-[#f6f1e7] font-semibold text-[#3b4a4d] border-r border-[#0d1b1e]/15">
                        +221
                      </span>
                      <input
                        required
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 px-4 py-3 outline-none"
                        placeholder="77 123 45 67"
                        aria-invalid={phone.length > 0 && !isValidPhone}
                      />
                    </div>
                    {phone.length > 0 && !isValidPhone && (
                      <span className="mt-1.5 block text-xs font-semibold text-red-600">
                        Entrez un numéro sénégalais à 9 chiffres débutant par 70, 75, 76, 77 ou 78.
                      </span>
                    )}
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-[#0d1b1e]">Adresse e-mail (optionnelle)</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#0d1b1e]/20 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                      placeholder="client@mail.sn"
                    />
                  </label>

                  <label className="flex items-start gap-3 rounded-xl bg-[#f6f1e7] p-4 cursor-pointer border border-[#0d1b1e]/5">
                    <input
                      type="checkbox"
                      checked={autoRenew}
                      onChange={(e) => setAutoRenew(e.target.checked)}
                      className="mt-1 size-4 accent-[#0f5257] rounded"
                    />
                    <span className="text-sm text-[#0d1b1e]">
                      <strong>Renouvellement automatique</strong> — une demande de paiement est envoyée sur ce numéro chaque mois. Vous pouvez l'arrêter à tout moment.
                    </span>
                  </label>
                </fieldset>

                <button
                  type="submit"
                  disabled={!isValidPhone || !fullName.trim() || isSubmitting}
                  className="w-full rounded-full bg-[#0d1b1e] text-[#f6f1e7] py-4 font-bold hover:bg-[#0f5257] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Création de la transaction en cours…
                    </>
                  ) : (
                    <>
                      <Lock className="size-4" aria-hidden="true" />
                      Payer {formatPrice(activePlan.price)} avec{' '}
                      {paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ÉTAPE : EN ATTENTE DE CONFIRMATION */}
            {step === 'pending' && (
              <div className="py-8 text-center" role="status">
                <div
                  className="mx-auto grid place-items-center size-20 rounded-3xl mb-6 shadow-sm"
                  style={{
                    backgroundColor: paymentMethod === 'wave' ? '#1dc4ff22' : '#ff790022'
                  }}
                >
                  <Smartphone
                    className="size-9"
                    style={{
                      color: paymentMethod === 'wave' ? '#1dc4ff' : '#ff7900'
                    }}
                    aria-hidden="true"
                  />
                </div>

                <div className="inline-block px-3 py-1 rounded-full bg-[#0d1b1e]/5 text-xs font-mono font-bold text-[#3b4a4d] mb-3">
                  Réf : {currentPaymentId}
                </div>

                <h2 className="text-2xl font-extrabold text-[#0d1b1e]">Validez sur votre téléphone</h2>
                <p className="mt-2 text-[#3b4a4d] max-w-sm mx-auto text-sm">
                  Une demande de <strong>{formatPrice(activePlan.price)}</strong> a été envoyée au{' '}
                  <strong>+221 {cleanPhone}</strong> vers le compte marchand de Tekki Services (+221 78 424 34 20).
                </p>

                <div className="mt-4 p-4 rounded-2xl bg-[#f6f1e7] text-left text-xs text-[#3b4a4d] max-w-md mx-auto space-y-1.5 border border-[#0d1b1e]/10">
                  <p className="font-bold text-[#0d1b1e]">Instructions :</p>
                  <p>
                    {paymentMethod === 'wave'
                      ? "1. Ouvrez l'application Wave sur votre téléphone.\n2. Confirmez le paiement demandé par Tekki Services."
                      : "1. Composez le #144# ou ouvrez l'application Orange Money.\n2. Validez le paiement de votre abonnement."}
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 text-sm font-semibold text-[#0f5257]">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>En attente de confirmation officielle du serveur…</span>
                </div>

                {/* BOUTON TEST / WEBHOOK SIMULATION */}
                <div className="mt-8 pt-6 border-t border-[#0d1b1e]/10">
                  <p className="text-xs text-[#3b4a4d] mb-3">
                    Environnement de vérification : vous pouvez déclencher la validation du webhook pour tester l'activation instantanée :
                  </p>
                  <button
                    type="button"
                    onClick={handleTriggerWebhookSimulation}
                    disabled={isSimulatingWebhook}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#14a38b] text-white text-xs font-bold hover:bg-[#0f5257] transition-all shadow-sm"
                  >
                    {isSimulatingWebhook ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    Confirmer le paiement via Webhook Serveur
                  </button>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3b4a4d] hover:text-[#0d1b1e]"
                  >
                    <ArrowLeft className="size-3.5" /> Modifier les informations
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE : SUCCÈS ET ACTIVATION AUTOMATIQUE */}
            {step === 'done' && (
              <div className="py-8 text-center" role="status">
                <div className="mx-auto grid place-items-center size-20 rounded-full bg-[#14a38b] text-white mb-6 shadow-md animate-in zoom-in-75 duration-300">
                  <CheckCircle2 className="size-10" aria-hidden="true" />
                </div>

                <div className="inline-block px-3 py-1 rounded-full bg-[#14a38b]/15 text-xs font-mono font-bold text-[#0f5257] mb-3">
                  Paiement Confirmé · {currentPaymentId}
                </div>

                <h2 className="text-3xl font-extrabold text-[#0d1b1e]">
                  Bienvenue, {fullName.split(' ')[0]} !
                </h2>
                <p className="mt-2 text-[#3b4a4d] text-base">
                  Votre formule <strong>{activePlan.name}</strong> a été activée avec succès côté serveur.
                </p>

                <div className="mt-6 p-5 rounded-2xl bg-[#f6f1e7] max-w-md mx-auto text-sm text-left border border-[#0d1b1e]/10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#3b4a4d]">Statut de l'abonnement :</span>
                    <span className="font-bold text-[#14a38b]">Actif</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3b4a4d]">Date d'expiration :</span>
                    <span className="font-bold text-[#0d1b1e]">
                      {paymentDetails?.expiresDate
                        ? new Date(paymentDetails.expiresDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                        : 'Dans 30 jours'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3b4a4d]">Moyen de règlement :</span>
                    <span className="font-bold text-[#0d1b1e]">
                      {paymentMethod === 'wave' ? 'Wave Sénégal' : 'Orange Money Sénégal'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#3b4a4d]">Montant payé :</span>
                    <span className="font-bold text-[#0d1b1e]">{formatPrice(activePlan.price)}</span>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <a
                    href="/"
                    className="inline-block rounded-full bg-[#0d1b1e] text-[#f6f1e7] px-6 py-3 font-bold hover:bg-[#0f5257] transition-colors shadow-md"
                  >
                    Retour à l'accueil
                  </a>
                  <a
                    href="/admin"
                    className="inline-block rounded-full border-2 border-[#0d1b1e] text-[#0d1b1e] px-6 py-3 font-bold hover:bg-[#0d1b1e] hover:text-[#f6f1e7] transition-colors"
                  >
                    Voir dans l'Admin
                  </a>
                </div>
              </div>
            )}
          </section>

          {/* COLONNE DROITE : RÉCAPITULATIF */}
          <aside className="rounded-3xl bg-[#0d1b1e] text-[#f6f1e7] p-6 sm:p-8 lg:sticky lg:top-24 shadow-xl">
            <p className="text-sm font-bold text-[#f2a541]">Récapitulatif</p>
            <h2 className="mt-2 text-2xl font-extrabold">Formule {activePlan.name}</h2>

            <ul className="mt-4 space-y-2 text-sm text-[#f6f1e7]/80">
              {activePlan.features.map((f) => (
                <li key={f} className="flex gap-2.5 items-start">
                  <Check className="size-4 mt-0.5 text-[#f2a541] shrink-0" aria-hidden="true" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-6 pt-6 border-t border-[#f6f1e7]/15 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#f6f1e7]/70">Période</dt>
                <dd className="font-semibold">30 jours</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#f6f1e7]/70">Moyen sélectionné</dt>
                <dd className="font-semibold flex items-center gap-1.5">
                  <PaymentBadge method={paymentMethod} size="sm" />
                  {paymentMethod === 'wave' ? 'Wave' : 'Orange Money'}
                </dd>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#f6f1e7]/10">
                <dt>Total à payer</dt>
                <dd className="text-[#f2a541]">{formatPrice(activePlan.price)}</dd>
              </div>
            </dl>

            <div className="mt-6 pt-6 border-t border-[#f6f1e7]/15">
              <div className="flex items-center gap-2 text-xs text-[#14a38b] font-semibold mb-2">
                <ShieldCheck className="size-4" />
                Paiement direct et sécurisé
              </div>
              <p className="text-xs text-[#f6f1e7]/60">
                Bénéficiaire : Almamy Diakhité (+221 78 424 34 20) · Dakar, Sénégal
              </p>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};
