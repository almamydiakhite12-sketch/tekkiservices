import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Clock,
  Check,
  Star,
  AlertTriangle,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  X,
  ExternalLink,
  ShieldCheck,
  Send
} from 'lucide-react';
import type { UserSite } from '../types';

export const PublicSitePage: React.FC = () => {
  // Récupérer le slug depuis l'URL (ex: /s/mon-site)
  const pathParts = window.location.pathname.split('/');
  const slug = pathParts[2] || '';

  const [site, setSite] = useState<any | null>(null);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Panier pour le modèle E-commerce
  const [cart, setCart] = useState<{ product: any; quantity: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Formulaires (réservation, devis, contact)
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryLoading, setInquiryLoading] = useState(false);

  useEffect(() => {
    if (!slug) {
      setError('Adresse du site web invalide.');
      setLoading(false);
      return;
    }

    // Charger les informations du site
    fetch(`/api/public/sites/${slug}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Site web introuvable.');
        setSite(data.site);
        setIsSubscriptionActive(data.isSubscriptionActive);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Comptabiliser la visite
    fetch(`/api/public/sites/${slug}/view`, { method: 'POST' }).catch(() => {});
  }, [slug]);

  const handleInquirySubmit = async (e: React.FormEvent, customType?: string) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryPhone.trim()) return;

    setInquiryLoading(true);
    try {
      const res = await fetch(`/api/public/sites/${slug}/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: inquiryName.trim(),
          customerPhone: inquiryPhone.trim(),
          message: customType ? `[${customType}] ${inquiryMessage.trim()}` : inquiryMessage.trim()
        })
      });
      if (res.ok) {
        setInquirySent(true);
        setInquiryMessage('');
      }
    } catch {
      // Ignorer
    } finally {
      setInquiryLoading(false);
    }
  };

  // E-commerce: Ajouter au panier
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCartOpen(true);
  };

  // E-commerce: Calcul du total
  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  // E-commerce: Générer le lien de commande WhatsApp
  const generateWhatsAppOrderLink = () => {
    const phone = site?.contact_whatsapp?.replace(/\D/g, '') || '221784243420';
    let text = `Bonjour ${site?.title} ! Je souhaite passer commande :\n\n`;
    cart.forEach((item) => {
      text += `• ${item.quantity}x ${item.product.name} (${(item.product.price * item.quantity).toLocaleString('fr-FR')} FCFA)\n`;
    });
    text += `\n*TOTAL : ${cartTotal.toLocaleString('fr-FR')} FCFA*\n`;
    text += `Livraison demandée pour : ${inquiryName || 'Client'}\nTéléphone : ${inquiryPhone || ''}\n`;
    text += `Merci de confirmer la commande et le paiement Wave !`;
    return `https://wa.me/${phone.startsWith('221') ? phone : `221${phone}`}?text=${encodeURIComponent(text)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 border-4 border-[#0f5257] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-700">Chargement du site web…</p>
        </div>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="min-h-screen bg-[#f6f1e7] flex items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-4">
          <AlertTriangle className="size-12 text-[#f2a541] mx-auto" />
          <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Site Introuvable</h1>
          <p className="text-sm text-[#3b4a4d]">
            {error || "Ce site n'existe pas ou n'est plus publié."}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2.5 rounded-full bg-[#0d1b1e] text-[#f6f1e7] text-xs font-bold hover:bg-[#0f5257]"
          >
            Retour à l'accueil Tekki Services
          </a>
        </div>
      </div>
    );
  }

  const content = site.content || {};
  const primaryColor = site.primary_color || '#0f5257';

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-[#14a38b]/20">
      {/* BANNIÈRE SI L'ABONNEMENT MENSUEL EST EXPIRÉ */}
      {!isSubscriptionActive && (
        <div className="bg-red-600 text-white px-4 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <AlertTriangle className="size-4 shrink-0 animate-bounce" />
          <span>
            Ce site web est temporairement en attente de renouvellement : l'abonnement mensuel Tekki Services du propriétaire a expiré.
          </span>
          <a
            href="/abonnement"
            className="underline ml-2 hover:text-red-100"
          >
            Renouveler
          </a>
        </div>
      )}

      {/* HEADER DU SITE PUBLIÉ */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 shadow-xs">
        <div className="mx-auto max-w-6xl px-5 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="grid place-items-center size-10 rounded-xl text-white font-extrabold text-lg shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {site.title.charAt(0)}
            </span>
            <div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 block leading-tight">
                {site.title}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {site.address || 'Dakar, Sénégal'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {site.contact_phone && (
              <a
                href={`tel:${site.contact_phone}`}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200"
              >
                <Phone className="size-3.5" />
                <span>{site.contact_phone}</span>
              </a>
            )}

            {site.contact_whatsapp && (
              <a
                href={`https://wa.me/${site.contact_whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle className="size-4" />
                <span className="hidden xs:inline">WhatsApp</span>
              </a>
            )}

            {/* BOUTON PANIER SI E-COMMERCE */}
            {site.template_id === 'ecommerce' && (
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2.5 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
                aria-label="Voir le panier"
              >
                <ShoppingBag className="size-5" />
                {cart.length > 0 && (
                  <span
                    className="absolute -top-1 -right-1 size-5 rounded-full text-white text-[10px] font-black grid place-items-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ==================================================== */}
      {/* 1. MODÈLE E-COMMERCE */}
      {/* ==================================================== */}
      {site.template_id === 'ecommerce' && (
        <main className="flex-1">
          {/* BANDEAU PROMO */}
          {content.promoBanner && (
            <div
              className="py-2.5 px-4 text-center text-xs font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {content.promoBanner}
            </div>
          )}

          {/* HERO */}
          <section className="bg-slate-50 py-16 sm:py-20 border-b border-slate-200/60">
            <div className="mx-auto max-w-6xl px-5 text-center max-w-3xl">
              {content.badge && (
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  {content.badge}
                </span>
              )}
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {content.heroTitle || site.title}
              </h1>
              <p className="mt-4 text-slate-600 text-base sm:text-lg">
                {content.heroSubtitle || site.description}
              </p>
            </div>
          </section>

          {/* CATALOGUE DE PRODUITS */}
          <section className="py-16 mx-auto max-w-6xl px-5">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Nos Articles Disponibles</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Commande instantanée · Paiement sécurisé Wave & Orange Money
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {content.products?.map((prod: any) => (
                <div
                  key={prod.id}
                  className="rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-xs hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="aspect-square bg-slate-100 overflow-hidden relative">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold text-slate-800">
                      {prod.category}
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 leading-snug">{prod.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{prod.description}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-extrabold text-lg text-slate-900">
                        {prod.price.toLocaleString('fr-FR')} FCFA
                      </span>
                      <button
                        onClick={() => addToCart(prod)}
                        className="px-3.5 py-2 rounded-full text-xs font-bold text-white flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-xs"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Plus className="size-3.5" /> Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* ==================================================== */}
      {/* 2. MODÈLE RESTAURANT & TRAITEUR */}
      {/* ==================================================== */}
      {site.template_id === 'restaurant' && (
        <main className="flex-1">
          <section
            className="py-20 sm:py-28 text-white text-center relative bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.75)), url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80')`
            }}
          >
            <div className="mx-auto max-w-4xl px-5 space-y-4">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#d97706] text-white text-xs font-bold uppercase tracking-wider">
                {content.badge || 'Cuisine Sénégalaise & Grillades'}
              </span>
              <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight">
                {content.heroTitle || site.title}
              </h1>
              <p className="text-slate-200 text-base sm:text-lg max-w-2xl mx-auto">
                {content.heroSubtitle || site.description}
              </p>
              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <a
                  href="#reservation"
                  className="px-6 py-3 rounded-full bg-[#d97706] text-white font-bold text-sm shadow-lg hover:bg-[#b45309]"
                >
                  Réserver une table
                </a>
                <a
                  href={`https://wa.me/${site.contact_whatsapp?.replace(/\D/g, '') || '221784243420'}?text=${encodeURIComponent('Bonjour ! Je souhaite commander à emporter.')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-full bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 flex items-center gap-2"
                >
                  <MessageCircle className="size-4 text-[#25D366]" /> Commande WhatsApp
                </a>
              </div>
            </div>
          </section>

          {/* MENU DIGITAL */}
          <section className="py-16 mx-auto max-w-5xl px-5">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-slate-900">La Carte & Les Menus</h2>
              <p className="text-xs text-slate-500 mt-1">Tous nos plats sont cuisinés à base de produits frais locaux.</p>
            </div>

            <div className="space-y-12">
              {content.menu?.map((category: any) => (
                <div key={category.category} className="space-y-4">
                  <h3 className="text-xl font-bold pb-2 border-b-2 border-[#d97706] inline-block text-slate-900">
                    {category.category}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {category.items?.map((item: any) => (
                      <div
                        key={item.name}
                        className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 flex justify-between items-start gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-slate-900">{item.name}</h4>
                            {item.badge && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                        </div>
                        <span className="font-extrabold text-base text-[#d97706] whitespace-nowrap">
                          {item.price.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* RÉSERVATION DE TABLE */}
          <section id="reservation" className="py-16 bg-slate-50 border-t border-slate-200">
            <div className="mx-auto max-w-xl px-5">
              <div className="rounded-3xl bg-white p-8 border border-slate-200 shadow-sm">
                <h3 className="text-2xl font-extrabold text-slate-900 text-center">Réserver une table</h3>
                <p className="text-xs text-slate-500 text-center mt-1 mb-6">
                  Confirmation instantanée par SMS / WhatsApp
                </p>

                {inquirySent ? (
                  <div className="p-4 rounded-2xl bg-green-50 text-green-800 text-center text-sm font-bold">
                    ✓ Votre demande de réservation a été enregistrée avec succès ! Le restaurant vous contactera sous peu.
                  </div>
                ) : (
                  <form onSubmit={(e) => handleInquirySubmit(e, 'Réservation Table')} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Votre nom</label>
                      <input
                        type="text"
                        required
                        value={inquiryName}
                        onChange={(e) => setInquiryName(e.target.value)}
                        placeholder="Ex: Ibrahima Ndiaye"
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Numéro de téléphone</label>
                      <input
                        type="tel"
                        required
                        value={inquiryPhone}
                        onChange={(e) => setInquiryPhone(e.target.value)}
                        placeholder="+221 77 ..."
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Date, heure et nombre de convives</label>
                      <textarea
                        required
                        rows={2}
                        value={inquiryMessage}
                        onChange={(e) => setInquiryMessage(e.target.value)}
                        placeholder="Ex: Vendredi 20h pour 4 personnes en terrasse"
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={inquiryLoading}
                      className="w-full py-3 rounded-xl bg-[#d97706] text-white font-bold text-xs hover:bg-[#b45309] shadow-sm"
                    >
                      {inquiryLoading ? 'Envoi en cours…' : 'Confirmer ma réservation'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ==================================================== */}
      {/* 3. MODÈLE AGENCE & CONSEIL */}
      {/* ==================================================== */}
      {site.template_id === 'agency' && (
        <main className="flex-1">
          <section className="bg-slate-900 text-white py-20 sm:py-28">
            <div className="mx-auto max-w-5xl px-5 text-center space-y-4">
              <span className="inline-block px-3.5 py-1 rounded-full bg-[#14a38b]/20 text-[#14a38b] text-xs font-bold uppercase tracking-wider">
                {content.badge || 'Partenaire de Confiance'}
              </span>
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
                {content.heroTitle || site.title}
              </h1>
              <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
                {content.heroSubtitle || site.description}
              </p>
              <div className="pt-6 flex justify-center gap-3">
                <a
                  href="#devis"
                  className="px-6 py-3 rounded-full bg-[#14a38b] text-white font-bold text-sm hover:bg-[#0f5257] shadow-lg"
                >
                  Demander un devis gratuit
                </a>
              </div>
            </div>
          </section>

          {/* STATS */}
          {content.stats && (
            <section className="bg-slate-800 text-white py-10 border-t border-slate-700">
              <div className="mx-auto max-w-6xl px-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                {content.stats.map((st: any) => (
                  <div key={st.label}>
                    <p className="text-3xl sm:text-4xl font-extrabold text-[#14a38b]">{st.value}</p>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">{st.label}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SERVICES */}
          <section className="py-16 mx-auto max-w-6xl px-5">
            <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-10">Nos Domaines d'Expertise</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {content.services?.map((serv: any) => (
                <div key={serv.title} className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <h3 className="font-extrabold text-xl text-slate-900">{serv.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{serv.desc}</p>
                  <p className="text-xs font-bold text-[#0f5257] pt-2">{serv.price}</p>
                </div>
              ))}
            </div>
          </section>

          {/* DEVIS FORM */}
          <section id="devis" className="py-16 bg-slate-100">
            <div className="mx-auto max-w-lg px-5">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-2xl font-extrabold text-slate-900 text-center">Demander un Devis</h3>
                <p className="text-xs text-slate-500 text-center mt-1 mb-6">Réponse garantie sous 24h ouvrées</p>

                {inquirySent ? (
                  <div className="p-4 rounded-2xl bg-green-50 text-green-800 text-center text-sm font-bold">
                    ✓ Votre demande de devis a été transmise ! Nous vous contacterons très prochainement.
                  </div>
                ) : (
                  <form onSubmit={(e) => handleInquirySubmit(e, 'Devis')} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nom ou Entreprise</label>
                      <input
                        type="text"
                        required
                        value={inquiryName}
                        onChange={(e) => setInquiryName(e.target.value)}
                        placeholder="Ex: Entreprise Diop & Frères"
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Numéro de téléphone</label>
                      <input
                        type="tel"
                        required
                        value={inquiryPhone}
                        onChange={(e) => setInquiryPhone(e.target.value)}
                        placeholder="+221 ..."
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Détaillez votre projet</label>
                      <textarea
                        required
                        rows={3}
                        value={inquiryMessage}
                        onChange={(e) => setInquiryMessage(e.target.value)}
                        placeholder="Ex: Refonte de notre site et mise en place d'un système de gestion..."
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={inquiryLoading}
                      className="w-full py-3 rounded-xl bg-[#0f5257] text-white font-bold text-xs hover:bg-[#14a38b]"
                    >
                      {inquiryLoading ? 'Envoi…' : 'Envoyer ma demande'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ==================================================== */}
      {/* 4. MODÈLE CABINET MÉDICAL */}
      {/* ==================================================== */}
      {site.template_id === 'medical' && (
        <main className="flex-1">
          <section className="bg-sky-50 py-16 sm:py-24 border-b border-sky-100">
            <div className="mx-auto max-w-5xl px-5 text-center space-y-4">
              <span className="inline-block px-3.5 py-1 rounded-full bg-sky-200 text-sky-800 text-xs font-bold uppercase tracking-wider">
                {content.badge || 'Centre Médical Agréé'}
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 leading-tight">
                {content.heroTitle || site.title}
              </h1>
              <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
                {content.heroSubtitle || site.description}
              </p>
              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <a
                  href="#rdv"
                  className="px-6 py-3 rounded-full bg-sky-700 text-white font-bold text-sm hover:bg-sky-800 shadow-md"
                >
                  Prendre rendez-vous en ligne
                </a>
                {content.emergencyPhone && (
                  <a
                    href={`tel:${content.emergencyPhone}`}
                    className="px-6 py-3 rounded-full bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-md flex items-center gap-2"
                  >
                    <Phone className="size-4" /> Urgences : {content.emergencyPhone}
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* SPÉCIALITÉS */}
          <section className="py-16 mx-auto max-w-5xl px-5">
            <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-10">Pôles & Spécialités Médicales</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {content.specialties?.map((spec: any) => (
                <div key={spec.name} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <h3 className="font-bold text-lg text-sky-900">{spec.name}</h3>
                  <p className="text-xs text-slate-600">{spec.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* PRISE DE RDV */}
          <section id="rdv" className="py-16 bg-slate-50 border-t border-slate-200">
            <div className="mx-auto max-w-md px-5">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-2xl font-extrabold text-slate-900 text-center">Prendre Rendez-vous</h3>
                <p className="text-xs text-slate-500 text-center mt-1 mb-6">Un infirmier ou médecin vous rappelle</p>

                {inquirySent ? (
                  <div className="p-4 rounded-2xl bg-green-50 text-green-800 text-center text-sm font-bold">
                    ✓ Votre demande de consultation a été reçue !
                  </div>
                ) : (
                  <form onSubmit={(e) => handleInquirySubmit(e, 'Consultation Médicale')} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nom et Prénom du patient</label>
                      <input
                        type="text"
                        required
                        value={inquiryName}
                        onChange={(e) => setInquiryName(e.target.value)}
                        placeholder="Ex: Aminata Sarr"
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Numéro de téléphone</label>
                      <input
                        type="tel"
                        required
                        value={inquiryPhone}
                        onChange={(e) => setInquiryPhone(e.target.value)}
                        placeholder="+221 ..."
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Motif de consultation souhaité</label>
                      <textarea
                        required
                        rows={2}
                        value={inquiryMessage}
                        onChange={(e) => setInquiryMessage(e.target.value)}
                        placeholder="Ex: Consultation pédiatrique pour un nourrisson..."
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={inquiryLoading}
                      className="w-full py-3 rounded-xl bg-sky-700 text-white font-bold text-xs hover:bg-sky-800"
                    >
                      {inquiryLoading ? 'Envoi…' : 'Valider le rendez-vous'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ==================================================== */}
      {/* 5. MODÈLE IMMOBILIER */}
      {/* ==================================================== */}
      {site.template_id === 'realestate' && (
        <main className="flex-1">
          <section className="bg-emerald-950 text-white py-20">
            <div className="mx-auto max-w-5xl px-5 text-center space-y-4">
              <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                {content.badge || 'Immobilier Dakar'}
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
                {content.heroTitle || site.title}
              </h1>
              <p className="text-emerald-100 text-base sm:text-lg max-w-2xl mx-auto">
                {content.heroSubtitle || site.description}
              </p>
            </div>
          </section>

          {/* LISTE DES BIENS */}
          <section className="py-16 mx-auto max-w-6xl px-5">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-8">Biens Immobiliers Récents</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {content.properties?.map((prop: any) => (
                <div key={prop.id} className="rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-xs flex flex-col">
                  <div className="aspect-video bg-slate-100 relative overflow-hidden">
                    <img src={prop.image} alt={prop.title} className="w-full h-full object-cover" />
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                      {prop.type}
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <MapPin className="size-3" /> {prop.location}
                      </p>
                      <h3 className="font-extrabold text-base text-slate-900 mt-1">{prop.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{prop.rooms} · {prop.surface}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-extrabold text-base text-slate-900">{prop.price}</span>
                      <a
                        href={`https://wa.me/${site.contact_whatsapp?.replace(/\D/g, '') || '221784243420'}?text=${encodeURIComponent(`Bonjour, je souhaite visiter le bien : ${prop.title} (${prop.location})`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 rounded-full bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
                      >
                        Visiter
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* FOOTER DU SITE DU CLIENT */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-10 border-t border-slate-800">
        <div className="mx-auto max-w-6xl px-5 flex flex-col sm:flex-row gap-6 justify-between items-center">
          <div>
            <p className="font-bold text-white text-sm">{site.title}</p>
            <p className="mt-1">{site.address || 'Dakar, Sénégal'} · Tél : {site.contact_phone || '+221 78 424 34 20'}</p>
          </div>
          <div className="text-center sm:text-right">
            <p>© {new Date().getFullYear()} {site.title}. Tous droits réservés.</p>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white mt-1"
            >
              <span>Propulsé par <strong>Tekki Services</strong></span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* TIROIR PANIER (POUR E-COMMERCE) */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-5" />
                <h3 className="font-extrabold text-base text-slate-900">Mon Panier</h3>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 my-4 text-xs">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400">Votre panier est vide.</div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="py-3 flex items-center gap-3">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="size-14 rounded-xl object-cover bg-slate-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{item.product.name}</p>
                      <p className="text-slate-500 font-semibold">{item.product.price.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          setCart((prev) =>
                            prev
                              .map((i) =>
                                i.product.id === item.product.id
                                  ? { ...i, quantity: i.quantity - 1 }
                                  : i
                              )
                              .filter((i) => i.quantity > 0)
                          )
                        }
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="font-bold px-1.5">{item.quantity}</span>
                      <button
                        onClick={() =>
                          setCart((prev) =>
                            prev.map((i) =>
                              i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i
                            )
                          )
                        }
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-sm font-extrabold text-slate-900">
                  <span>Total commande :</span>
                  <span>{cartTotal.toLocaleString('fr-FR')} FCFA</span>
                </div>

                <div className="space-y-2 text-xs">
                  <input
                    type="text"
                    required
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                    placeholder="Votre nom complet"
                    className="w-full rounded-xl border border-slate-300 p-2.5"
                  />
                  <input
                    type="tel"
                    required
                    value={inquiryPhone}
                    onChange={(e) => setInquiryPhone(e.target.value)}
                    placeholder="Votre numéro Wave ou téléphone"
                    className="w-full rounded-xl border border-slate-300 p-2.5"
                  />
                </div>

                <a
                  href={generateWhatsAppOrderLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 rounded-full text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-90"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <MessageCircle className="size-4" /> Commander sur WhatsApp (Paiement Wave)
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
