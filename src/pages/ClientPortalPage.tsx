import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { SITE_TEMPLATES } from '../data/templates';
import {
  Globe,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Eye,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  CreditCard,
  LogOut,
  Smartphone,
  Sparkles,
  ShoppingBag,
  Utensils,
  Briefcase,
  Stethoscope,
  Home,
  X,
  Loader2,
  RefreshCw,
  ArrowRight,
  Check
} from 'lucide-react';
import type { UserSite, SiteTemplate } from '../types';

export const ClientPortalPage: React.FC = () => {
  // État authentification utilisateur
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Formulaire d'authentification abonné
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [phoneInput, setPhoneInput] = useState(() => localStorage.getItem('tekki_user_phone') || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState(() => localStorage.getItem('tekki_user_name') || '');
  const [emailInput, setEmailInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Sites de l'abonné
  const [sites, setSites] = useState<UserSite[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);

  // Modal Création de Site
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<SiteTemplate>(SITE_TEMPLATES[0]);
  const [siteTitle, setSiteTitle] = useState('');
  const [siteSlug, setSiteSlug] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [siteContactPhone, setSiteContactPhone] = useState('');
  const [siteContactWhatsapp, setSiteContactWhatsapp] = useState('');
  const [siteColor, setSiteColor] = useState('#0f5257');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Modal Édition de Site
  const [editingSite, setEditingSite] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContactWhatsapp, setEditContactWhatsapp] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editColor, setEditColor] = useState('#0f5257');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // Modal Confirmation Suppression
  const [siteToDelete, setSiteToDelete] = useState<UserSite | null>(null);

  // 1. Vérification session abonné
  const checkUserSession = async () => {
    try {
      setAuthLoading(true);
      const res = await fetch('/api/user/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  // 2. Charger les sites
  const fetchUserSites = async () => {
    if (!currentUser) return;
    setLoadingSites(true);
    try {
      const res = await fetch('/api/user/sites');
      if (res.ok) {
        const data = await res.json();
        setSites(data.sites || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSites(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUserSites();
    }
  }, [currentUser]);

  // Connexion abonné
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/user/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, password: passwordInput })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Identifiants invalides.');
      }

      localStorage.setItem('tekki_user_phone', data.user.phone);
      localStorage.setItem('tekki_user_name', data.user.name);
      localStorage.setItem('tekki_user_id', data.user.id);
      checkUserSession();
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Inscription abonné
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/user/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput,
          phone: phoneInput,
          email: emailInput || undefined,
          password: passwordInput
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'inscription.");
      }

      localStorage.setItem('tekki_user_phone', data.user.phone);
      localStorage.setItem('tekki_user_name', data.user.name);
      localStorage.setItem('tekki_user_id', data.user.id);
      checkUserSession();
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Déconnexion abonné
  const handleLogout = async () => {
    try {
      await fetch('/api/user/auth/logout', { method: 'POST' });
    } catch {}
    setCurrentUser(null);
  };

  // Création de site
  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/user/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          title: siteTitle.trim(),
          slug: siteSlug.trim(),
          description: siteDescription.trim() || undefined,
          contactPhone: siteContactPhone.trim() || currentUser?.user?.phone,
          contactWhatsapp: siteContactWhatsapp.trim() || currentUser?.user?.phone,
          primaryColor: siteColor,
          content: selectedTemplate.defaultContent
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création du site.');
      }

      setCreateModalOpen(false);
      setCreateStep(1);
      setSiteTitle('');
      setSiteSlug('');
      setSiteDescription('');
      fetchUserSites();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Sauvegarde des modifications d'un site
  const handleUpdateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/user/sites/${editingSite.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          contactPhone: editContactPhone,
          contactWhatsapp: editContactWhatsapp,
          address: editAddress,
          primaryColor: editColor,
          content: editingSite.content
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la mise à jour.');

      setEditSuccess(true);
      setTimeout(() => {
        setEditSuccess(false);
        setEditingSite(null);
        fetchUserSites();
      }, 1500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Suppression d'un site
  const handleDeleteSite = async (siteId: string) => {
    try {
      await fetch(`/api/user/sites/${siteId}`, { method: 'DELETE' });
      setSiteToDelete(null);
      fetchUserSites();
    } catch (err) {
      console.error(err);
    }
  };

  // Ouvrir l'éditeur d'un site
  const openEditModal = (site: UserSite) => {
    setEditingSite(site);
    setEditTitle(site.title);
    setEditDescription(site.description || '');
    setEditContactPhone(site.contact_phone || '');
    setEditContactWhatsapp(site.contact_whatsapp || '');
    setEditAddress(site.address || '');
    setEditColor(site.primary_color || '#0f5257');
  };

  const getTemplateIcon = (templateId: string) => {
    switch (templateId) {
      case 'ecommerce':
        return ShoppingBag;
      case 'restaurant':
        return Utensils;
      case 'agency':
        return Briefcase;
      case 'medical':
        return Stethoscope;
      case 'realestate':
        return Home;
      default:
        return Globe;
    }
  };

  // ==========================================
  // ÉTAPE 1 : FORMULAIRE DE CONNEXION / INSCRIPTION ABONNÉ
  // ==========================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f6f1e7] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 border-4 border-[#0f5257] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#0d1b1e]">Chargement de votre espace créateur…</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f6f1e7] text-[#0d1b1e]">
        <Header currentPath="/mes-sites" />

        <main className="grain flex-1 flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#0d1b1e]/15 p-8 shadow-2xl">
            <div className="text-center mb-6">
              <span className="inline-grid place-items-center size-12 rounded-2xl bg-[#0f5257] text-[#f6f1e7] font-display font-extrabold text-2xl -rotate-6 mb-3 shadow-md">
                T
              </span>
              <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Espace Créateur de Sites</h1>
              <p className="mt-1 text-xs text-[#3b4a4d]">
                Gérez vos sites web, vos modèles et votre abonnement mensuel Tekki Services.
              </p>
            </div>

            {/* ONGLET CONNEXION / INSCRIPTION */}
            <div className="flex rounded-xl bg-[#f6f1e7] p-1 mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  authMode === 'login' ? 'bg-white text-[#0d1b1e] shadow-sm' : 'text-[#3b4a4d]'
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  authMode === 'register' ? 'bg-white text-[#0d1b1e] shadow-sm' : 'text-[#3b4a4d]'
                }`}
              >
                Créer un compte
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#0d1b1e] mb-1">Numéro de téléphone</label>
                  <input
                    type="tel"
                    required
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+221 77 123 45 67"
                    className="w-full rounded-xl border border-[#0d1b1e]/20 p-3 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0d1b1e] mb-1">Mot de passe</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#0d1b1e]/20 p-3 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                  />
                  <p className="text-[10px] text-[#3b4a4d] mt-1">
                    Si vous venez de payer votre abonnement sans mot de passe, laissez vide ou entrez votre mot de passe souhaité.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3.5 rounded-full bg-[#0d1b1e] text-[#f6f1e7] font-bold text-xs hover:bg-[#0f5257] shadow-md transition-all disabled:opacity-40"
                >
                  {authSubmitting ? 'Connexion en cours…' : 'Accéder à mes sites'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#0d1b1e] mb-1">Nom complet</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Awa Ndiaye"
                    className="w-full rounded-xl border border-[#0d1b1e]/20 p-3 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0d1b1e] mb-1">Numéro Wave / OM (+221)</label>
                  <input
                    type="tel"
                    required
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+221 77 123 45 67"
                    className="w-full rounded-xl border border-[#0d1b1e]/20 p-3 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0d1b1e] mb-1">Adresse e-mail (optionnelle)</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="contact@mail.sn"
                    className="w-full rounded-xl border border-[#0d1b1e]/20 p-3 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0d1b1e] mb-1">Créer un mot de passe</label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Min. 6 caractères"
                    className="w-full rounded-xl border border-[#0d1b1e]/20 p-3 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3.5 rounded-full bg-[#0d1b1e] text-[#f6f1e7] font-bold text-xs hover:bg-[#0f5257] shadow-md transition-all disabled:opacity-40"
                >
                  {authSubmitting ? 'Création du compte…' : 'Créer mon compte créateur'}
                </button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-[#0d1b1e]/10 text-center">
              <p className="text-[11px] text-[#3b4a4d]">
                Pas encore abonné ?{' '}
                <a href="/abonnement" className="font-bold text-[#0f5257] underline">
                  Souscrire à une formule Wave ou Orange Money
                </a>
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // ==========================================
  // ÉTAPE 2 : TABLEAU DE BORD DE L'ABONNÉ
  // ==========================================
  const isSubscriptionActive = currentUser?.isSubscriptionActive;
  const daysRemaining = currentUser?.daysRemaining || 0;
  const subscription = currentUser?.subscription;
  const limits = currentUser?.limits;

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f1e7] text-[#0d1b1e]">
      <Header currentPath="/mes-sites" />

      <main className="grain flex-1 py-10">
        <div className="mx-auto max-w-6xl px-5 space-y-8">
          {/* CARTE ÉTAT DE L'ABONNEMENT MENSUEL */}
          <section className="rounded-3xl bg-white border border-[#0d1b1e]/10 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="size-10 rounded-2xl bg-[#0f5257] text-[#f6f1e7] font-bold text-base grid place-items-center shadow-xs">
                  {currentUser.user.name.charAt(0)}
                </span>
                <div>
                  <h1 className="text-xl font-extrabold text-[#0d1b1e]">
                    Bonjour, {currentUser.user.name}
                  </h1>
                  <p className="text-xs text-[#3b4a4d]">
                    Tél : {currentUser.user.phone} · Espace Créateur
                  </p>
                </div>
              </div>

              {/* BADGE D'ÉTAT D'ABONNEMENT */}
              <div className="flex items-center gap-2 pt-1">
                {isSubscriptionActive ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#14a38b]/15 text-[#0f5257] text-xs font-bold">
                    <CheckCircle2 className="size-4 text-[#14a38b]" />
                    Abonnement {subscription?.plan_name || 'Actif'} ({daysRemaining} jours restants)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                    <AlertTriangle className="size-4" />
                    Abonnement Expiré · Renouvellement requis
                  </span>
                )}

                <span className="text-xs text-[#3b4a4d]">
                  Limite : {sites.length} / {limits?.maxSites === 999 ? 'Illimité' : limits?.maxSites} site(s)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* BOUTON RENOUVELLEMENT */}
              <a
                href="/abonnement"
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
                  isSubscriptionActive
                    ? 'bg-[#f6f1e7] text-[#0d1b1e] hover:bg-[#0d1b1e]/10'
                    : 'bg-[#f2a541] text-[#0d1b1e] hover:bg-[#0d1b1e] hover:text-[#f6f1e7] animate-pulse'
                }`}
              >
                <CreditCard className="size-4" />
                {isSubscriptionActive ? 'Gérer mon forfait' : 'Renouveler par Wave / OM'}
              </a>

              <button
                onClick={handleLogout}
                className="p-2.5 rounded-full hover:bg-red-50 text-red-600 transition-colors"
                title="Se déconnecter"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </section>

          {/* BANDEAU DE BLOCAGE SI L'ABONNEMENT EST EXPIRÉ */}
          {!isSubscriptionActive && (
            <div className="rounded-3xl bg-red-50 border-2 border-red-300 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-6 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-extrabold text-sm text-red-900">
                    Accès restreint : Renouvellement mensuel requis
                  </h3>
                  <p className="text-xs text-red-700 mt-1">
                    Votre abonnement mensuel est arrivé à échéance. Pour créer de nouveaux sites ou modifier vos sites existants, vous devez renouveler votre formule via Wave ou Orange Money (+221 78 424 34 20).
                  </p>
                </div>
              </div>

              <a
                href="/abonnement"
                className="px-6 py-3 rounded-full bg-red-600 text-white font-bold text-xs hover:bg-red-700 shadow-md whitespace-nowrap"
              >
                Renouveler maintenant (Wave / OM)
              </a>
            </div>
          )}

          {/* SECTION MES SITES WEB */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-[#0d1b1e]">Mes Sites Web Publiés</h2>
                <p className="text-xs text-[#3b4a4d]">
                  Chaque site dispose d'une URL publique visible pour tout le monde sans connexion.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!isSubscriptionActive) {
                    alert(
                      'Votre abonnement mensuel est expiré. Veuillez renouveler avec Wave ou Orange Money pour créer un site.'
                    );
                    window.location.href = '/abonnement';
                    return;
                  }
                  setCreateModalOpen(true);
                }}
                className={`px-5 py-3 rounded-full text-xs font-bold flex items-center gap-2 shadow-md transition-all ${
                  isSubscriptionActive
                    ? 'bg-[#0d1b1e] text-[#f6f1e7] hover:bg-[#0f5257]'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Plus className="size-4" />
                Créer un nouveau site web
              </button>
            </div>

            {loadingSites ? (
              <div className="py-16 text-center text-xs text-[#3b4a4d]">Chargement de vos sites…</div>
            ) : sites.length === 0 ? (
              <div className="rounded-3xl bg-white border border-[#0d1b1e]/10 p-12 text-center space-y-4 shadow-xs">
                <Globe className="size-12 text-[#0f5257]/40 mx-auto" />
                <h3 className="text-lg font-bold text-[#0d1b1e]">Aucun site créé pour le moment</h3>
                <p className="text-xs text-[#3b4a4d] max-w-md mx-auto">
                  Choisissez parmi nos 5 modèles professionnels (E-commerce, Restaurant, Agence, Médical, Immobilier) et lancez votre présence en ligne en quelques clics.
                </p>
                <button
                  onClick={() => {
                    if (!isSubscriptionActive) {
                      window.location.href = '/abonnement';
                      return;
                    }
                    setCreateModalOpen(true);
                  }}
                  className="px-6 py-3 rounded-full bg-[#0f5257] text-[#f6f1e7] text-xs font-bold hover:bg-[#14a38b] transition-colors"
                >
                  Choisir un modèle et créer mon site
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sites.map((s) => {
                  const TemplateIcon = getTemplateIcon(s.template_id);
                  const publicUrl = `/s/${s.slug}`;

                  return (
                    <div
                      key={s.id}
                      className="rounded-3xl bg-white border border-[#0d1b1e]/10 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <span
                            className="p-2.5 rounded-2xl text-white font-bold"
                            style={{ backgroundColor: s.primary_color || '#0f5257' }}
                          >
                            <TemplateIcon className="size-5" />
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#14a38b]/15 text-[#0f5257]">
                            <span className="size-1.5 rounded-full bg-[#14a38b]" />
                            En ligne
                          </span>
                        </div>

                        <div>
                          <h3 className="font-extrabold text-lg text-[#0d1b1e] line-clamp-1">{s.title}</h3>
                          <p className="text-xs text-[#3b4a4d] line-clamp-2 mt-1">
                            {s.description || 'Site web créé avec Tekki Services'}
                          </p>
                        </div>

                        {/* LIEN PUBLIC MONDIAL */}
                        <div className="p-3 rounded-2xl bg-[#f6f1e7] text-xs space-y-1">
                          <span className="text-[10px] uppercase font-bold text-[#3b4a4d]">
                            Lien Public Visible pour Tous
                          </span>
                          <a
                            href={publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono font-bold text-[#0f5257] hover:underline flex items-center gap-1.5 truncate"
                          >
                            <span>{window.location.origin}{publicUrl}</span>
                            <ExternalLink className="size-3 shrink-0" />
                          </a>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-[#3b4a4d] pt-2">
                          <span className="flex items-center gap-1 font-semibold">
                            <Eye className="size-3.5" /> {s.views_count} visite(s)
                          </span>
                          <span>•</span>
                          <span className="capitalize">{s.template_id}</span>
                        </div>
                      </div>

                      {/* ACTIONS DU SITE */}
                      <div className="p-4 bg-[#f6f1e7]/40 border-t border-[#0d1b1e]/10 flex items-center justify-between gap-2">
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-white border border-[#0d1b1e]/15 text-xs font-bold text-[#0d1b1e] hover:bg-[#0d1b1e]/5 transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="size-3.5" /> Voir en ligne
                        </a>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-2 rounded-xl hover:bg-white text-[#0f5257] transition-colors"
                            title="Modifier le site"
                          >
                            <Edit3 className="size-4" />
                          </button>
                          <button
                            onClick={() => setSiteToDelete(s)}
                            className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition-colors"
                            title="Supprimer le site"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ==================================================== */}
      {/* MODAL CRÉATION DE SITE AVEC CHOIX DU MODÈLE */}
      {/* ==================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0d1b1e]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white border border-[#0d1b1e]/15 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#0d1b1e]/10">
              <div>
                <span className="text-[10px] font-bold text-[#0f5257] uppercase tracking-wider">
                  Étape {createStep} sur 2
                </span>
                <h3 className="text-xl font-extrabold text-[#0d1b1e]">
                  {createStep === 1 ? 'Choisissez votre modèle de site web' : 'Personnalisez votre site'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setCreateModalOpen(false);
                  setCreateStep(1);
                }}
                className="p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                {createError}
              </div>
            )}

            {/* ÉTAPE 1 : CHOIX DU MODÈLE DE SITE WEB */}
            {createStep === 1 && (
              <div className="space-y-6">
                <p className="text-xs text-[#3b4a4d]">
                  Sélectionnez le modèle fonctionnel le plus adapté à votre activité au Sénégal :
                </p>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SITE_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplate.id === tmpl.id;
                    const Icon = getTemplateIcon(tmpl.id);

                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setSelectedTemplate(tmpl)}
                        className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#0f5257] bg-[#0f5257]/5 shadow-sm'
                            : 'border-[#0d1b1e]/10 hover:border-[#0d1b1e]/30'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span
                              className="size-9 rounded-xl text-white grid place-items-center"
                              style={{ backgroundColor: tmpl.color }}
                            >
                              <Icon className="size-4" />
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {tmpl.category}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-[#0d1b1e]">{tmpl.name}</h4>
                          <p className="text-[11px] text-[#3b4a4d] line-clamp-2">{tmpl.tagline}</p>

                          <ul className="space-y-1 text-[10px] text-slate-600 pt-2 border-t border-slate-100">
                            {tmpl.features.slice(0, 3).map((f) => (
                              <li key={f} className="flex items-center gap-1.5 truncate">
                                <Check className="size-3 text-[#14a38b] shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-4 mt-2">
                          <button
                            type="button"
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                              isSelected
                                ? 'bg-[#0f5257] text-[#f6f1e7]'
                                : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected ? 'Modèle Sélectionné ✓' : 'Sélectionner'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSiteColor(selectedTemplate.color);
                      setCreateStep(2);
                    }}
                    className="px-6 py-2.5 rounded-full bg-[#0d1b1e] text-[#f6f1e7] text-xs font-bold hover:bg-[#0f5257] flex items-center gap-2"
                  >
                    <span>Continuer vers les réglages</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 2 : INFORMATIONS ET PUBLICATION DU SITE */}
            {createStep === 2 && (
              <form onSubmit={handleCreateSite} className="space-y-4 text-xs">
                <div className="p-3 rounded-2xl bg-[#0f5257]/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0f5257]">Modèle choisi :</span>
                    <span className="font-semibold">{selectedTemplate.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateStep(1)}
                    className="text-xs font-bold text-[#0f5257] underline"
                  >
                    Changer de modèle
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-[#0d1b1e] mb-1">
                    Titre ou Nom de votre entreprise *
                  </label>
                  <input
                    type="text"
                    required
                    value={siteTitle}
                    onChange={(e) => {
                      setSiteTitle(e.target.value);
                      if (!siteSlug) {
                        setSiteSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, '-')
                            .replace(/-+/g, '-')
                        );
                      }
                    }}
                    placeholder="Ex: Teranga Mode & Parfums"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0d1b1e] mb-1">
                    Adresse URL publique (Slug) *
                  </label>
                  <div className="flex rounded-xl border border-slate-300 overflow-hidden">
                    <span className="px-3 py-2.5 bg-slate-100 text-slate-500 font-mono text-xs border-r border-slate-200">
                      /s/
                    </span>
                    <input
                      type="text"
                      required
                      value={siteSlug}
                      onChange={(e) =>
                        setSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      }
                      placeholder="teranga-mode"
                      className="flex-1 px-3 py-2.5 text-xs outline-none font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Votre site sera visible par tout le monde à l'adresse :{' '}
                    <strong>{window.location.origin}/s/{siteSlug || 'votre-nom'}</strong>
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-[#0d1b1e] mb-1">
                    Numéro WhatsApp pour recevoir les commandes & demandes *
                  </label>
                  <input
                    type="tel"
                    required
                    value={siteContactWhatsapp}
                    onChange={(e) => setSiteContactWhatsapp(e.target.value)}
                    placeholder="+221 77 123 45 67"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0d1b1e] mb-1">
                    Description courte
                  </label>
                  <textarea
                    rows={2}
                    value={siteDescription}
                    onChange={(e) => setSiteDescription(e.target.value)}
                    placeholder="Ex: Vêtements traditionnels sénégalais et accessoires modernes livrés à Dakar."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  />
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCreateStep(1)}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700"
                  >
                    Retour
                  </button>

                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="px-6 py-2.5 rounded-full bg-[#0f5257] text-[#f6f1e7] font-bold text-xs hover:bg-[#14a38b] shadow-md disabled:opacity-40"
                  >
                    {createSubmitting ? 'Publication en cours…' : 'Créer et publier mon site web'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL ÉDITION DE SITE */}
      {/* ==================================================== */}
      {editingSite && (
        <div className="fixed inset-0 z-50 bg-[#0d1b1e]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateSite}
            className="w-full max-w-xl rounded-3xl bg-white border border-[#0d1b1e]/15 p-6 sm:p-8 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-[#0d1b1e]">
                Modifier le site : {editingSite.title}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSite(null)}
                className="p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            {editSuccess && (
              <div className="p-3 rounded-xl bg-green-50 text-green-800 font-bold">
                ✓ Modifications enregistrées avec succès !
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Titre du site</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Numéro WhatsApp</label>
                <input
                  type="tel"
                  value={editContactWhatsapp}
                  onChange={(e) => setEditContactWhatsapp(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Téléphone Appel</label>
                <input
                  type="tel"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Adresse physique / Quartier</label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Ex: Almadies, Dakar"
                className="w-full rounded-xl border border-slate-300 p-2.5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSite(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="px-6 py-2 rounded-xl bg-[#0f5257] text-[#f6f1e7] font-bold hover:bg-[#14a38b]"
              >
                {editSubmitting ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL CONFIRMATION SUPPRESSION */}
      {/* ==================================================== */}
      {siteToDelete && (
        <div className="fixed inset-0 z-50 bg-[#0d1b1e]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900">
              Supprimer le site web ?
            </h3>
            <p className="text-xs text-slate-600">
              Êtes-vous sûr de vouloir supprimer définitivement le site{' '}
              <strong>{siteToDelete.title}</strong> (/s/{siteToDelete.slug}) ? Il ne sera plus accessible sur Internet.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSiteToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteSite(siteToDelete.id)}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
