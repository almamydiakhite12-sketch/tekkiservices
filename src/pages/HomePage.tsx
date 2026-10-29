import React from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { PaymentBadge } from '../components/PaymentBadge';
import {
  Smartphone,
  ShieldCheck,
  RefreshCcw,
  BellRing,
  Check,
  ArrowRight,
  Mail,
  Phone,
  MessageCircle,
  Lock
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const steps = [
    {
      icon: Smartphone,
      title: 'Choisissez Wave ou Orange Money',
      text: 'Saisissez votre numéro, validez la demande de paiement sur votre téléphone.'
    },
    {
      icon: ShieldCheck,
      title: 'Accès activé immédiatement',
      text: 'Dès la confirmation du paiement, votre compte est débloqué pour 30 jours.'
    },
    {
      icon: RefreshCcw,
      title: 'Renouvellement automatique',
      text: "Un rappel vous est envoyé avant l'échéance, puis la demande de paiement suivante."
    },
    {
      icon: BellRing,
      title: 'Aucune mauvaise surprise',
      text: "Sans renouvellement, l'accès est suspendu, puis rétabli dès le paiement."
    }
  ];

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '5 000',
      tagline: 'Pour démarrer seul',
      features: ['1 utilisateur', 'Accès aux services de base', 'Support par e-mail'],
      highlighted: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '15 000',
      tagline: 'Le plus choisi',
      features: [
        "Jusqu'à 5 utilisateurs",
        'Tous les services Tekki',
        'Support WhatsApp prioritaire',
        'Rapports mensuels'
      ],
      highlighted: true
    },
    {
      id: 'business',
      name: 'Business',
      price: '35 000',
      tagline: 'Pour les équipes',
      features: [
        'Utilisateurs illimités',
        'Tous les services Tekki',
        'Accompagnement dédié',
        'Facturation entreprise'
      ],
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f1e7] text-[#0d1b1e]">
      <Header currentPath="/" />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="grain border-b border-[#0d1b1e]/10">
          <div className="mx-auto max-w-6xl px-5 pt-16 pb-20 lg:pt-24 grid lg:grid-cols-[1.15fr_1fr] gap-14 items-center">
            <div className="rise">
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0f5257] border border-[#0d1b1e]/10 shadow-sm">
                <span className="size-2 rounded-full bg-[#14a38b]"></span> Abonnement mensuel
              </p>
              <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[0.95]">
                Vos services Tekki,
                <span className="block text-[#0f5257]">payés en un geste.</span>
              </h1>
              <p className="mt-6 text-lg text-[#3b4a4d] max-w-xl">
                Choisissez votre formule, payez avec <strong>Wave</strong> ou{' '}
                <strong>Orange Money</strong>, et votre accès est activé immédiatement. Le renouvellement se fait automatiquement chaque mois.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/abonnement?plan=pro"
                  className="inline-flex items-center gap-2 rounded-full bg-[#0d1b1e] text-[#f6f1e7] px-6 py-3.5 font-bold hover:bg-[#0f5257] transition-all shadow-md"
                >
                  Je m'abonne <ArrowRight className="size-4" aria-hidden="true" />
                </a>
                <a
                  href="#tarifs"
                  className="inline-flex items-center rounded-full border-2 border-[#0d1b1e] px-6 py-3 font-bold hover:bg-[#0d1b1e] hover:text-[#f6f1e7] transition-colors"
                >
                  Voir les tarifs
                </a>
              </div>

              <div className="mt-8 flex items-center gap-4 text-sm text-[#3b4a4d]">
                <span className="flex items-center gap-2">
                  <PaymentBadge method="wave" size="sm" /> Wave
                </span>
                <span className="flex items-center gap-2">
                  <PaymentBadge method="orange" size="sm" /> Orange Money
                </span>
              </div>
            </div>

            {/* LIVE MOCKUP PREVIEW */}
            <div className="rise relative mx-auto w-full max-w-sm" style={{ animationDelay: '120ms' }}>
              <div className="absolute -inset-6 rounded-[3rem] bg-[#f2a541]/30 rotate-3" aria-hidden="true" />
              <div className="relative rounded-[2.5rem] bg-[#0d1b1e] p-3 shadow-2xl">
                <div className="rounded-[2rem] bg-white p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#3b4a4d] uppercase tracking-wider">Paiement</span>
                    <span className="text-xs font-bold text-[#14a38b]">● Sécurisé</span>
                  </div>

                  <div>
                    <p className="text-sm text-[#3b4a4d]">Formule Pro · mensuel</p>
                    <p className="font-display text-4xl font-extrabold text-[#0d1b1e]">15 000 FCFA</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border-2 border-[#1dc4ff] bg-[#1dc4ff]/10 p-3 flex items-center gap-2 font-bold text-sm">
                      <PaymentBadge method="wave" size="sm" /> Wave
                    </div>
                    <div className="rounded-2xl border-2 border-[#0d1b1e]/10 p-3 flex items-center gap-2 font-bold text-sm">
                      <PaymentBadge method="orange" size="sm" /> Orange
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#f6f1e7] p-4 text-sm">
                    <p className="text-[#3b4a4d]">Numéro Wave</p>
                    <p className="font-bold tracking-wide text-[#0d1b1e]">77 512 08 41</p>
                  </div>

                  <div className="rounded-2xl bg-[#0f5257] text-[#f6f1e7] p-4 flex items-center gap-3 shadow-sm">
                    <ShieldCheck className="size-5 shrink-0 text-[#14a38b]" aria-hidden="true" />
                    <div className="text-sm">
                      <p className="font-bold">Paiement confirmé</p>
                      <p className="text-[#f6f1e7]/70 text-xs">Abonnement actif · 30 jours</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-white border-b border-[#0d1b1e]/10">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="text-3xl sm:text-4xl font-extrabold max-w-xl text-[#0d1b1e]">
              Comment fonctionne votre abonnement
            </h2>
            <ol className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, idx) => (
                <li key={step.title} className="relative rounded-3xl bg-[#f6f1e7] p-6 border border-[#0d1b1e]/5">
                  <span className="absolute top-5 right-6 font-display text-5xl font-extrabold text-[#0d1b1e]/10">
                    {idx + 1}
                  </span>
                  <step.icon className="size-7 text-[#0f5257]" aria-hidden="true" />
                  <h3 className="mt-6 text-lg font-bold text-[#0d1b1e]">{step.title}</h3>
                  <p className="mt-2 text-sm text-[#3b4a4d]">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* PRICING */}
        <section id="tarifs" className="scroll-mt-16 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0d1b1e]">Des tarifs simples, en FCFA</h2>
                <p className="text-[#3b4a4d] mt-1">Sans engagement · résiliable à tout moment</p>
              </div>
              <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#0f5257]/10 text-[#0f5257] self-start sm:self-auto">
                Moyens acceptés : Wave & Orange Money
              </div>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {plans.map((p) => (
                <article
                  key={p.id}
                  className={`flex flex-col rounded-3xl p-8 transition-all ${
                    p.highlighted
                      ? 'bg-[#0d1b1e] text-[#f6f1e7] shadow-xl md:-translate-y-3 ring-2 ring-[#f2a541]/40'
                      : 'bg-white border border-[#0d1b1e]/10 text-[#0d1b1e]'
                  }`}
                >
                  <p className={`text-sm font-bold ${p.highlighted ? 'text-[#f2a541]' : 'text-[#0f5257]'}`}>
                    {p.tagline}
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold">{p.name}</h3>
                  <p className="mt-6">
                    <span className="font-display text-4xl font-extrabold">{p.price}</span>{' '}
                    <span className={p.highlighted ? 'text-[#f6f1e7]/70' : 'text-[#3b4a4d]'}>FCFA / mois</span>
                  </p>

                  <ul className="mt-6 space-y-3 text-sm flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2.5 items-start">
                        <Check
                          className={`size-4 mt-0.5 shrink-0 ${p.highlighted ? 'text-[#f2a541]' : 'text-[#14a38b]'}`}
                          aria-hidden="true"
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href={`/abonnement?plan=${p.id}`}
                    className={`mt-8 rounded-full py-3.5 text-center font-bold transition-all ${
                      p.highlighted
                        ? 'bg-[#f2a541] text-[#0d1b1e] hover:bg-[#f6f1e7]'
                        : 'bg-[#0d1b1e] text-[#f6f1e7] hover:bg-[#0f5257]'
                    }`}
                  >
                    Choisir {p.name}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section id="contact" className="scroll-mt-16 bg-[#0f5257] text-[#f6f1e7]">
          <div className="mx-auto max-w-6xl px-5 py-20 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold">Une question ? Parlons-en.</h2>
              <p className="mt-4 text-[#f6f1e7]/80 max-w-md">
                Pour un paiement, un renouvellement ou une offre entreprise, contactez directement Almamy Diakhité.
              </p>
            </div>

            <div className="grid gap-3">
              <a
                href="mailto:almamydiakhite12@gmail.com"
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition-colors bg-[#f6f1e7]/10 hover:bg-[#f6f1e7]/20 text-[#f6f1e7]"
              >
                <Mail className="size-5 shrink-0" aria-hidden="true" />
                <span className="break-all">almamydiakhite12@gmail.com</span>
              </a>
              <a
                href="tel:+221784243420"
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition-colors bg-[#f6f1e7]/10 hover:bg-[#f6f1e7]/20 text-[#f6f1e7]"
              >
                <Phone className="size-5 shrink-0" aria-hidden="true" />
                +221 78 424 34 20
              </a>
              <a
                href="https://wa.me/221784243420"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition-colors bg-[#f6f1e7]/10 hover:bg-[#f6f1e7]/20 text-[#f6f1e7]"
              >
                <MessageCircle className="size-5 shrink-0" aria-hidden="true" />
                Écrire sur WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
