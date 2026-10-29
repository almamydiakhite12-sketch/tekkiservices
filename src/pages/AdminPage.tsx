import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  BarChart3,
  MessageSquare,
  Bell,
  FileText,
  Settings,
  LogOut,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  UserCheck,
  UserX,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  Send,
  Lock,
  Mail,
  Phone,
  ShieldAlert,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Globe
} from 'lucide-react';
import { PaymentBadge } from '../components/PaymentBadge';
import type {
  AdminUser,
  DashboardStats,
  User,
  Subscription,
  Payment,
  Conversation,
  Message,
  AdminNotification,
  ActivityLog,
  Plan
} from '../types';

export const AdminPage: React.FC = () => {
  // État d'authentification
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Formulaire d'initialisation
  const [setupName, setSetupName] = useState('Almamy Diakhité');
  const [setupEmail, setSetupEmail] = useState('almamydiakhite12@gmail.com');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSubmitting, setSetupSubmitting] = useState(false);

  // Formulaire de connexion
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Navigation dans le dashboard admin
  type TabType =
    | 'dashboard'
    | 'users'
    | 'subscriptions'
    | 'payments'
    | 'sites'
    | 'analytics'
    | 'active-users'
    | 'messages'
    | 'notifications'
    | 'logs'
    | 'settings';
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Données
  const [dashboardData, setDashboardData] = useState<{
    stats: DashboardStats;
    recentPayments: Payment[];
    revenueTrend: { day: string; total: number }[];
  } | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [adminSites, setAdminSites] = useState<any[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [activeUsersList, setActiveUsersList] = useState<User[]>([]);
  const [settingsData, setSettingsData] = useState<any>(null);

  // Filtres & recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals et détails
  const [selectedUserDetail, setSelectedUserDetail] = useState<{
    user: User;
    subscriptions: Subscription[];
    payments: Payment[];
  } | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Messagerie active
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [convMessages, setConvMessages] = useState<Message[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Notifications dropdown
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Copier le lien
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Vérification de l'état d'authentification initial
  const checkAuth = async () => {
    try {
      setAuthLoading(true);
      const setupRes = await fetch('/api/admin/setup-status');
      const setupData = await setupRes.json();
      setIsInitialized(setupData.isInitialized);

      if (setupData.isInitialized) {
        const meRes = await fetch('/api/admin/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentAdmin(meData.admin);
        } else {
          setCurrentAdmin(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // 2. Chargement des données de l'onglet actif
  const refreshTabData = async () => {
    if (!currentAdmin) return;

    try {
      // Toujours rafraîchir le compteur de notifications
      fetch('/api/admin/notifications')
        .then((r) => r.json())
        .then((d) => {
          setNotifications(d.notifications || []);
          setUnreadNotifsCount(d.unreadCount || 0);
        })
        .catch(() => {});

      if (activeTab === 'dashboard') {
        const res = await fetch('/api/admin/dashboard');
        if (res.ok) {
          const data = await res.json();
          setDashboardData(data);
        }
      } else if (activeTab === 'users') {
        const query = new URLSearchParams();
        if (searchQuery) query.set('search', searchQuery);
        if (statusFilter) query.set('status', statusFilter);
        const res = await fetch(`/api/admin/users?${query}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } else if (activeTab === 'subscriptions') {
        const query = new URLSearchParams();
        if (searchQuery) query.set('search', searchQuery);
        if (statusFilter) query.set('status', statusFilter);
        const res = await fetch(`/api/admin/subscriptions?${query}`);
        if (res.ok) {
          const data = await res.json();
          setSubscriptions(data.subscriptions || []);
        }
      } else if (activeTab === 'payments') {
        const query = new URLSearchParams();
        if (searchQuery) query.set('search', searchQuery);
        if (statusFilter) query.set('status', statusFilter);
        const res = await fetch(`/api/admin/payments?${query}`);
        if (res.ok) {
          const data = await res.json();
          setPayments(data.payments || []);
        }
      } else if (activeTab === 'sites') {
        const res = await fetch('/api/admin/sites');
        if (res.ok) {
          const data = await res.json();
          setAdminSites(data.sites || []);
        }
      } else if (activeTab === 'analytics') {
        const res = await fetch('/api/admin/analytics');
        if (res.ok) {
          const data = await res.json();
          setAnalyticsData(data);
        }
      } else if (activeTab === 'active-users') {
        const res = await fetch('/api/admin/active-users');
        if (res.ok) {
          const data = await res.json();
          setActiveUsersList(data.users || []);
        }
      } else if (activeTab === 'messages') {
        const res = await fetch('/api/admin/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);
          if (data.conversations?.length > 0 && !activeConvId) {
            setActiveConvId(data.conversations[0].id);
          }
        }
      } else if (activeTab === 'logs') {
        const query = new URLSearchParams();
        if (searchQuery) query.set('search', searchQuery);
        const res = await fetch(`/api/admin/logs?${query}`);
        if (res.ok) {
          const data = await res.json();
          setActivityLogs(data.logs || []);
        }
      } else if (activeTab === 'settings') {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          setSettingsData(data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshTabData();
  }, [activeTab, currentAdmin, searchQuery, statusFilter]);

  // Polling des messages dans la conversation ouverte
  useEffect(() => {
    if (!activeConvId || activeTab !== 'messages') return;

    const fetchConv = async () => {
      try {
        const res = await fetch(`/api/admin/conversations/${activeConvId}`);
        if (res.ok) {
          const data = await res.json();
          setConvMessages(data.messages || []);
        }
      } catch {}
    };

    fetchConv();
    const interval = setInterval(fetchConv, 3000);
    return () => clearInterval(interval);
  }, [activeConvId, activeTab]);

  // Initialisation Master Admin
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupPassword !== setupConfirm) {
      setSetupError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (setupPassword.length < 8) {
      setSetupError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    setSetupSubmitting(true);
    setSetupError(null);

    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: setupName.trim(),
          email: setupEmail.trim(),
          password: setupPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'initialisation.");
      }

      // Se connecter directement
      const loginRes = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: setupEmail.trim(),
          password: setupPassword
        })
      });
      const loginData = await loginRes.json();
      if (loginRes.ok) {
        setCurrentAdmin(loginData.admin);
        setIsInitialized(true);
      }
    } catch (err: any) {
      setSetupError(err.message);
    } finally {
      setSetupSubmitting(false);
    }
  };

  // Connexion Admin
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Identifiants invalides.');
      }

      setCurrentAdmin(data.admin);
      setActiveTab('dashboard');
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Déconnexion Admin
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    setCurrentAdmin(null);
  };

  // Actions Utilisateurs
  const handleSuspendUser = async (userId: string) => {
    await fetch(`/api/admin/users/${userId}/suspend`, { method: 'POST' });
    refreshTabData();
    if (selectedUserDetail) setSelectedUserDetail(null);
  };

  const handleReactivateUser = async (userId: string) => {
    await fetch(`/api/admin/users/${userId}/reactivate`, { method: 'POST' });
    refreshTabData();
    if (selectedUserDetail) setSelectedUserDetail(null);
  };

  const handleDeleteUser = async (userId: string) => {
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    setUserToDelete(null);
    setSelectedUserDetail(null);
    refreshTabData();
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await fetch(`/api/admin/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingUser.name, email: editingUser.email })
    });
    setEditingUser(null);
    refreshTabData();
  };

  // Actions Abonnements
  const handleExtendSub = async (subId: string) => {
    await fetch(`/api/admin/subscriptions/${subId}/extend`, { method: 'POST' });
    refreshTabData();
  };

  const handleSuspendSub = async (subId: string) => {
    await fetch(`/api/admin/subscriptions/${subId}/suspend`, { method: 'POST' });
    refreshTabData();
  };

  const handleReactivateSub = async (subId: string) => {
    await fetch(`/api/admin/subscriptions/${subId}/reactivate`, { method: 'POST' });
    refreshTabData();
  };

  // Actions Paiements
  const handleRefundPayment = async (paymentId: string) => {
    if (!confirm('Confirmez-vous le remboursement de cette transaction ?')) return;
    await fetch(`/api/admin/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Remboursement demandé par client' })
    });
    refreshTabData();
  };

  // Actions Sites Web Abonnés
  const handleToggleAdminSitePublish = async (siteId: string) => {
    try {
      const res = await fetch(`/api/admin/sites/${siteId}/toggle-publish`, { method: 'POST' });
      if (res.ok) {
        refreshTabData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAdminSite = async (siteId: string, siteTitle: string) => {
    if (!confirm(`Confirmez-vous la suppression du site "${siteTitle}" ?`)) return;
    try {
      const res = await fetch(`/api/admin/sites/${siteId}`, { method: 'DELETE' });
      if (res.ok) {
        refreshTabData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Envoi de réponse dans le support chat
  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !activeConvId) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/admin/conversations/${activeConvId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() })
      });
      if (res.ok) {
        setReplyContent('');
        const cRes = await fetch(`/api/admin/conversations/${activeConvId}`);
        if (cRes.ok) {
          const d = await cRes.json();
          setConvMessages(d.messages || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Marquer toutes les notifications comme lues
  const handleMarkAllNotifsRead = async () => {
    await fetch('/api/admin/notifications/read-all', { method: 'POST' });
    setUnreadNotifsCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
  };

  // Sauvegarde des paramètres
  const [saveSettingsStatus, setSaveSettingsStatus] = useState<string | null>(null);
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsData) return;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: settingsData.settings,
          plans: settingsData.plans
        })
      });
      if (res.ok) {
        setSaveSettingsStatus('Paramètres enregistrés avec succès !');
        setTimeout(() => setSaveSettingsStatus(null), 3000);
      }
    } catch {
      setSaveSettingsStatus('Erreur lors de la sauvegarde.');
    }
  };

  // Formater les montants
  const formatMoney = (amount?: number) => {
    if (amount === undefined || amount === null) return '0 FCFA';
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  };

  // ==========================================
  // ÉCRAN 1 : INITIALISATION MASTER ADMIN
  // ==========================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f6f1e7] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 border-4 border-[#0f5257] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#0d1b1e]">Chargement de l'espace administration…</p>
        </div>
      </div>
    );
  }

  if (isInitialized === false) {
    return (
      <div className="min-h-screen bg-[#f6f1e7] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white border border-[#0d1b1e]/15 p-8 shadow-2xl">
          <div className="text-center mb-6">
            <span className="inline-grid place-items-center size-12 rounded-2xl bg-[#0f5257] text-[#f6f1e7] font-display font-extrabold text-2xl -rotate-6 mb-3 shadow-md">
              T
            </span>
            <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Initialisation Administrateur</h1>
            <p className="mt-1 text-xs text-[#3b4a4d]">
              Créez votre compte super-administrateur sécurisé pour Tekki Services.
            </p>
          </div>

          {setupError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {setupError}
            </div>
          )}

          <form onSubmit={handleSetup} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-[#0d1b1e] mb-1">Nom complet du propriétaire</label>
              <input
                type="text"
                required
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                className="w-full rounded-xl border border-[#0d1b1e]/20 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0d1b1e] mb-1">Adresse e-mail administrateur</label>
              <input
                type="email"
                required
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                className="w-full rounded-xl border border-[#0d1b1e]/20 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0d1b1e] mb-1">Mot de passe fort (min. 8 caractères)</label>
              <input
                type="password"
                required
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-[#0d1b1e]/20 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0d1b1e] mb-1">Confirmer le mot de passe</label>
              <input
                type="password"
                required
                value={setupConfirm}
                onChange={(e) => setSetupConfirm(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-[#0d1b1e]/20 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={setupSubmitting}
                className="w-full rounded-xl bg-[#0d1b1e] text-[#f6f1e7] py-3 font-bold hover:bg-[#0f5257] transition-colors shadow-md disabled:opacity-40"
              >
                {setupSubmitting ? 'Création en cours…' : 'Initialiser mon accès Admin'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // ÉCRAN 2 : CONNEXION ADMINISTRATEUR
  // ==========================================
  if (!currentAdmin) {
    return (
      <div className="min-h-screen bg-[#f6f1e7] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white border border-[#0d1b1e]/15 p-8 shadow-2xl">
          <div className="text-center mb-6">
            <span className="inline-grid place-items-center size-12 rounded-2xl bg-[#0f5257] text-[#f6f1e7] font-display font-extrabold text-2xl -rotate-6 mb-3 shadow-md">
              T
            </span>
            <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Espace Privé Administrateur</h1>
            <p className="mt-1 text-xs text-[#3b4a4d]">
              Accès strictement réservé au propriétaire de Tekki Services.
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <ShieldAlert className="size-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-[#0d1b1e] mb-1">Email administrateur</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="almamydiakhite12@gmail.com"
                className="w-full rounded-xl border border-[#0d1b1e]/20 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0d1b1e] mb-1">Mot de passe</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-[#0d1b1e]/20 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loginSubmitting}
                className="w-full rounded-xl bg-[#0d1b1e] text-[#f6f1e7] py-3 font-bold hover:bg-[#0f5257] transition-colors shadow-md disabled:opacity-40"
              >
                {loginSubmitting ? 'Vérification sécurisée…' : 'Se connecter'}
              </button>
            </div>

            <div className="text-center pt-2">
              <a href="/" className="text-xs text-[#3b4a4d] hover:text-[#0d1b1e] font-semibold">
                ← Retour au site public
              </a>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // ÉCRAN 3 : TABLEAU DE BORD ADMINISTRATEUR COMPLET
  // ==========================================
  return (
    <div className="min-h-screen bg-[#f6f1e7] text-[#0d1b1e] flex flex-col">
      {/* BARRE SUPÉRIEURE ADMIN */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#0d1b1e]/10 px-4 sm:px-6 h-16 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[#0d1b1e] hover:bg-[#0d1b1e]/5"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <a href="/" className="flex items-center gap-2 group">
            <span className="grid place-items-center size-8 rounded-xl bg-[#0f5257] text-[#f6f1e7] font-bold text-sm">
              T
            </span>
            <span className="font-display font-extrabold text-lg hidden sm:inline">
              Tekki<span className="text-[#14a38b]">.</span>Admin
            </span>
          </a>
        </div>

        <div className="flex items-center gap-3">
          {/* LIEN VERS LE SITE PUBLIC */}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#3b4a4d] hover:text-[#0d1b1e] px-3 py-1.5 rounded-lg border border-[#0d1b1e]/15"
          >
            <span>Voir le site</span>
            <ExternalLink className="size-3" />
          </a>

          {/* NOTIFICATIONS DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="relative p-2 rounded-xl hover:bg-[#0d1b1e]/5 text-[#0d1b1e] transition-colors"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1 right-1 grid place-items-center size-4 rounded-full bg-[#f2a541] text-[#0d1b1e] text-[10px] font-black">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-[#0d1b1e]/15 p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-[#0d1b1e]/10">
                  <h3 className="font-bold text-sm">Notifications en direct</h3>
                  {unreadNotifsCount > 0 && (
                    <button
                      onClick={handleMarkAllNotifsRead}
                      className="text-xs text-[#0f5257] hover:underline font-semibold"
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#0d1b1e]/5 my-2">
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[#3b4a4d]">Aucune donnée disponible</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`py-2.5 px-2 rounded-xl text-xs ${n.is_read ? 'opacity-70' : 'bg-[#0f5257]/5 font-semibold'}`}
                      >
                        <p className="font-bold text-[#0d1b1e]">{n.title}</p>
                        <p className="text-[#3b4a4d] mt-0.5">{n.message}</p>
                        <span className="text-[10px] text-[#3b4a4d]/70 mt-1 block">
                          {new Date(n.created_at).toLocaleString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PROFIL ADMIN */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#0d1b1e]/10">
            <div className="size-8 rounded-full bg-[#0f5257] text-[#f6f1e7] font-bold text-xs grid place-items-center">
              {currentAdmin.name.charAt(0)}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold leading-tight text-[#0d1b1e]">{currentAdmin.name}</p>
              <p className="text-[10px] text-[#3b4a4d]">Super Admin</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-red-600 hover:bg-red-50 ml-1 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL AVEC SIDEBAR */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVIGATION (Desktop) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#0d1b1e]/10 flex flex-col transition-transform md:static md:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 flex-1 space-y-1 overflow-y-auto">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#0f5257] text-[#f6f1e7] shadow-sm'
                  : 'text-[#3b4a4d] hover:bg-[#0d1b1e]/5 hover:text-[#0d1b1e]'
              }`}
            >
              <LayoutDashboard className="size-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('users');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-[#0f5257] text-[#f6f1e7] shadow-sm'
                  : 'text-[#3b4a4d] hover:bg-[#0d1b1e]/5 hover:text-[#0d1b1e]'
              }`}
            >
              <Users className="size-4" />
              <span>Utilisateurs</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('subscriptions');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'subscriptions'
                  ? 'bg-[#0f5257] text-[#f6f1e7] shadow-sm'
                  : 'text-[#3b4a4d] hover:bg-[#0d1b1e]/5 hover:text-[#0d1b1e]'
              }`}
            >
              <CreditCard className="size-4" />
              <span>Abonnements</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('payments');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'payments'
                  ? 'bg-[#0f5257] text-[#f6f1e7] shadow-sm'
                  : 'text-[#3b4a4d] hover:bg-[#0d1b1e]/5 hover:text-[#0d1b1e]'
              }`}
            >
              <Receipt className="size-4" />
              <span>Paiements</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('sites');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'sites'
                  ? 'bg-[#0f5257] text-[#f6f1e7] shadow-sm'
                  : 'text-[#3b4a4d] hover:bg-[#0d1b1e]/5 hover:text-[#0d1b1e]'
              }`}
            >
              <Globe className="size-4" />
              <span>Sites Web Créés</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('analytics');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-[#0f5257] text-[#f6f1e7] shadow-sm'
                  : 'text-[#3b4a4d] hover:bg-[#0d1b1e]/5 hover:text-[#0d1b1e]'
              }`}
            >
              <BarChart3 className="size-4" />
              <span>Visites & Analytics</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('active-users');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'active-users'
                  ? 'bg-[#0f5257] text-[#f6f1e7] shadow-sm'
                  : 'text-[#3b4a4d] hover:bg-[#0d1b1e]/5 hover:text-[#0d1b1e]'
              }`}
            >
              <UserCheck className="size-4" />
              <span>Utilisateurs Actifs</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('messages');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'messages'
                  ? 'bg-[#0f5257] text-[#f6f1e7] shadow-sm'
                  : 'text-[#3b4a4d] hover:bg-[#0d1b1e]/5 hover:text-[#0d1b1e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="size-4" />
                <span>Messagerie</span>
              </div>
              {conversations.some((c) => c.unread_admin_count > 0) && (
                <span className="size-2 rounded-full bg-[#f2a541]" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('notifications');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'notifications'
                  ? 'bg-[#0f5257] text-[#f6f1e7] shadow-sm'
                  : 'text-[#3b4a4d] hover:bg-[#0d1b1e]/5 hover:text-[#0d1b1e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="size-4" />
                <span>Notifications</span>
              </div>
              {unreadNotifsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#f2a541] text-[#0d1b1e] text-[10px] font-black">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('logs');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'logs'
                  ? 'bg-[#0f5257] text-[#f6f1e7] shadow-sm'
                  : 'text-[#3b4a4d] hover:bg-[#0d1b1e]/5 hover:text-[#0d1b1e]'
              }`}
            >
              <FileText className="size-4" />
              <span>Logs & Audit</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('settings');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#0f5257] text-[#f6f1e7] shadow-sm'
                  : 'text-[#3b4a4d] hover:bg-[#0d1b1e]/5 hover:text-[#0d1b1e]'
              }`}
            >
              <Settings className="size-4" />
              <span>Paramètres</span>
            </button>
          </div>

          <div className="p-4 border-t border-[#0d1b1e]/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="size-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>

        {/* ZONE DE CONTENU ONGLET */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* ==================================================== */}
          {/* 1. DASHBOARD OVERVIEW */}
          {/* ==================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Tableau de bord</h1>
                  <p className="text-xs text-[#3b4a4d]">
                    Données réelles issues de la base de données Tekki Services.
                  </p>
                </div>
                <button
                  onClick={refreshTabData}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#0d1b1e]/15 text-xs font-bold hover:bg-[#f6f1e7] transition-colors self-start"
                >
                  <RefreshCw className="size-3.5" /> Actualiser
                </button>
              </div>

              {/* STATS CARDS */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* REVENUS TOTAUX */}
                <div className="rounded-2xl bg-white p-5 border border-[#0d1b1e]/10 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#3b4a4d] uppercase tracking-wider">
                      Revenus Totaux
                    </span>
                    <span className="p-2 rounded-xl bg-[#14a38b]/15 text-[#0f5257]">
                      <Receipt className="size-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-[#0d1b1e]">
                    {formatMoney(dashboardStats(dashboardData)?.revenue.total)}
                  </p>
                  <p className="text-[11px] text-[#3b4a4d] mt-1">
                    Aujourd'hui : {formatMoney(dashboardStats(dashboardData)?.revenue.today)}
                  </p>
                </div>

                {/* ABONNEMENTS ACTIFS */}
                <div className="rounded-2xl bg-white p-5 border border-[#0d1b1e]/10 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#3b4a4d] uppercase tracking-wider">
                      Abonnements Actifs
                    </span>
                    <span className="p-2 rounded-xl bg-[#0f5257]/10 text-[#0f5257]">
                      <CreditCard className="size-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-[#0d1b1e]">
                    {dashboardStats(dashboardData)?.subscriptions.active || 0}
                  </p>
                  <p className="text-[11px] text-[#3b4a4d] mt-1">
                    Expirés : {dashboardStats(dashboardData)?.subscriptions.expired || 0}
                  </p>
                </div>

                {/* UTILISATEURS */}
                <div className="rounded-2xl bg-white p-5 border border-[#0d1b1e]/10 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#3b4a4d] uppercase tracking-wider">
                      Total Utilisateurs
                    </span>
                    <span className="p-2 rounded-xl bg-[#f2a541]/15 text-[#0d1b1e]">
                      <Users className="size-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-[#0d1b1e]">
                    {dashboardStats(dashboardData)?.users.total || 0}
                  </p>
                  <p className="text-[11px] text-[#3b4a4d] mt-1">
                    Actifs : {dashboardStats(dashboardData)?.users.active || 0} · Nouveaux :{' '}
                    {dashboardStats(dashboardData)?.users.newToday || 0}
                  </p>
                </div>

                {/* VISITEURS */}
                <div className="rounded-2xl bg-white p-5 border border-[#0d1b1e]/10 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#3b4a4d] uppercase tracking-wider">
                      Visiteurs Aujourd'hui
                    </span>
                    <span className="p-2 rounded-xl bg-[#1dc4ff]/20 text-[#0d1b1e]">
                      <BarChart3 className="size-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-[#0d1b1e]">
                    {dashboardStats(dashboardData)?.visitors.today || 0}
                  </p>
                  <p className="text-[11px] text-[#3b4a4d] mt-1">
                    Ce mois-ci : {dashboardStats(dashboardData)?.visitors.month || 0}
                  </p>
                </div>
              </div>

              {/* DERNIERS PAIEMENTS RÉELS */}
              <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
                <section className="rounded-3xl bg-white border border-[#0d1b1e]/10 p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-[#0d1b1e]">Derniers paiements</h2>
                    <button
                      onClick={() => setActiveTab('payments')}
                      className="text-xs font-semibold text-[#0f5257] hover:underline"
                    >
                      Voir tout →
                    </button>
                  </div>

                  {!dashboardData?.recentPayments || dashboardData.recentPayments.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#3b4a4d]">Aucune donnée disponible</div>
                  ) : (
                    <ul className="divide-y divide-[#0d1b1e]/5">
                      {dashboardData.recentPayments.map((p) => (
                        <li key={p.id} className="py-3 flex items-center gap-3">
                          <PaymentBadge method={p.payment_method} size="lg" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate text-[#0d1b1e]">{p.user_name}</p>
                            <p className="text-xs text-[#3b4a4d]">
                              {p.id} · {new Date(p.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold tabular-nums text-sm text-[#0d1b1e]">
                              {formatMoney(p.amount)}
                            </p>
                            <span
                              className={`text-[11px] font-semibold ${
                                p.status === 'successful'
                                  ? 'text-[#14a38b]'
                                  : p.status === 'pending'
                                    ? 'text-[#f2a541]'
                                    : 'text-red-600'
                              }`}
                            >
                              {p.status}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* COORDONNÉES OFFICIELLES MARCHAND */}
                <section className="rounded-3xl bg-[#0f5257] text-[#f6f1e7] p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h2 className="text-base font-bold">Compte Marchand Wave & OM</h2>
                    <p className="mt-1 text-xs text-[#f6f1e7]/75">
                      Numéro officiel configuré pour la réception des fonds de vos abonnés.
                    </p>

                    <div className="mt-6 space-y-3">
                      <div className="p-4 rounded-2xl bg-white/10 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#f2a541] tracking-wider">
                          Numéro Propriétaire
                        </span>
                        <p className="font-display font-extrabold text-xl">+221 78 424 34 20</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/10 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#f2a541] tracking-wider">
                          Bénéficiaire Officiel
                        </span>
                        <p className="font-bold text-sm">Almamy Diakhité · Dakar, Sénégal</p>
                        <p className="text-xs text-[#f6f1e7]/80">almamydiakhite12@gmail.com</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-[#f6f1e7]/80">
                    <span>Intégration directe Sénégal</span>
                    <span className="font-bold text-[#14a38b]">● Actif</span>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 2. GESTION DES UTILISATEURS */}
          {/* ==================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Utilisateurs</h1>
                  <p className="text-xs text-[#3b4a4d]">
                    Consultez, filtrez et gérez les utilisateurs réels de la plateforme.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="size-4 absolute left-3 top-2.5 text-[#3b4a4d]" />
                    <input
                      type="text"
                      placeholder="Rechercher nom, téléphone…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 rounded-xl bg-white border border-[#0d1b1e]/15 text-xs focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="py-2 px-3 rounded-xl bg-white border border-[#0d1b1e]/15 text-xs focus:outline-none"
                  >
                    <option value="">Tous statuts</option>
                    <option value="active">Actif</option>
                    <option value="suspended">Suspendu</option>
                  </select>
                </div>
              </div>

              {/* TABLE DES UTILISATEURS */}
              <div className="rounded-3xl bg-white border border-[#0d1b1e]/10 overflow-hidden shadow-xs">
                {users.length === 0 ? (
                  <div className="py-16 text-center text-xs text-[#3b4a4d]">Aucune donnée disponible</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f6f1e7] text-[#3b4a4d] border-b border-[#0d1b1e]/10 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-4">Utilisateur</th>
                          <th className="p-4">Téléphone</th>
                          <th className="p-4">Formule</th>
                          <th className="p-4">Statut</th>
                          <th className="p-4">Inscription</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0d1b1e]/5">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-[#0d1b1e]/2 transition-colors">
                            <td className="p-4 font-bold text-[#0d1b1e]">{u.name}</td>
                            <td className="p-4 font-mono text-[#3b4a4d]">{u.phone}</td>
                            <td className="p-4">
                              <span className="font-semibold">{u.plan_name || 'Aucun'}</span>
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.status === 'active'
                                    ? 'bg-[#14a38b]/15 text-[#0f5257]'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {u.status === 'active' ? 'Actif' : 'Suspendu'}
                              </span>
                            </td>
                            <td className="p-4 text-[#3b4a4d]">
                              {new Date(u.created_at).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="p-4 text-right space-x-1">
                              <button
                                onClick={async () => {
                                  const r = await fetch(`/api/admin/users/${u.id}`);
                                  if (r.ok) {
                                    const d = await r.json();
                                    setSelectedUserDetail(d);
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-[#0d1b1e]/5 text-[#0f5257]"
                                title="Voir profil"
                              >
                                <Eye className="size-4" />
                              </button>
                              {u.status === 'active' ? (
                                <button
                                  onClick={() => handleSuspendUser(u.id)}
                                  className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-700"
                                  title="Suspendre"
                                >
                                  <UserX className="size-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivateUser(u.id)}
                                  className="p-1.5 rounded-lg hover:bg-green-50 text-green-700"
                                  title="Réactiver"
                                >
                                  <UserCheck className="size-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setEditingUser(u)}
                                className="p-1.5 rounded-lg hover:bg-[#0d1b1e]/5 text-[#3b4a4d]"
                                title="Modifier"
                              >
                                <Edit2 className="size-4" />
                              </button>
                              <button
                                onClick={() => setUserToDelete(u)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                                title="Supprimer"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 3. GESTION DES ABONNEMENTS */}
          {/* ==================================================== */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Abonnements</h1>
                  <p className="text-xs text-[#3b4a4d]">
                    Gestion des forfaits actifs, expirations et renouvellements.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="py-2 px-3 rounded-xl bg-white border border-[#0d1b1e]/15 text-xs focus:outline-none"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="active">Actif</option>
                    <option value="expired">Expiré</option>
                    <option value="suspended">Suspendu</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-[#0d1b1e]/10 overflow-hidden shadow-xs">
                {subscriptions.length === 0 ? (
                  <div className="py-16 text-center text-xs text-[#3b4a4d]">Aucune donnée disponible</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f6f1e7] text-[#3b4a4d] border-b border-[#0d1b1e]/10 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-4">Utilisateur</th>
                          <th className="p-4">Forfait</th>
                          <th className="p-4">Prix</th>
                          <th className="p-4">Paiement</th>
                          <th className="p-4">Statut</th>
                          <th className="p-4">Date Début</th>
                          <th className="p-4">Expiration</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0d1b1e]/5">
                        {subscriptions.map((s) => (
                          <tr key={s.id} className="hover:bg-[#0d1b1e]/2 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-[#0d1b1e]">{s.user_name}</p>
                              <p className="text-[10px] text-[#3b4a4d]">{s.user_phone}</p>
                            </td>
                            <td className="p-4 font-bold">{s.plan_name}</td>
                            <td className="p-4 tabular-nums">{formatMoney(s.plan_price)}</td>
                            <td className="p-4">
                              {s.payment_method ? (
                                <PaymentBadge method={s.payment_method as any} size="sm" showLabel />
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.status === 'active'
                                    ? 'bg-[#14a38b]/15 text-[#0f5257]'
                                    : s.status === 'expired'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {s.status}
                              </span>
                            </td>
                            <td className="p-4 text-[#3b4a4d]">
                              {new Date(s.start_date).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="p-4 font-semibold text-[#0d1b1e]">
                              {new Date(s.expires_date).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="p-4 text-right space-x-1">
                              <button
                                onClick={() => handleExtendSub(s.id)}
                                className="px-2.5 py-1 rounded-full bg-[#0f5257] text-[#f6f1e7] font-bold text-[10px] hover:bg-[#14a38b] transition-colors"
                                title="Prolonger de 30 jours"
                              >
                                +30j
                              </button>
                              {s.status === 'active' ? (
                                <button
                                  onClick={() => handleSuspendSub(s.id)}
                                  className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-bold text-[10px]"
                                  title="Suspendre"
                                >
                                  Suspendre
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivateSub(s.id)}
                                  className="px-2 py-1 rounded-full bg-green-100 text-green-800 font-bold text-[10px]"
                                  title="Réactiver"
                                >
                                  Réactiver
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 4. GESTION DES PAIEMENTS */}
          {/* ==================================================== */}
          {activeTab === 'payments' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Paiements</h1>
                  <p className="text-xs text-[#3b4a4d]">
                    Historique complet et traçabilité des transactions Wave et Orange Money.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="py-2 px-3 rounded-xl bg-white border border-[#0d1b1e]/15 text-xs focus:outline-none"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="successful">Réussi</option>
                    <option value="pending">En attente</option>
                    <option value="failed">Échoué</option>
                    <option value="refunded">Remboursé</option>
                  </select>
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-[#0d1b1e]/10 overflow-hidden shadow-xs">
                {payments.length === 0 ? (
                  <div className="py-16 text-center text-xs text-[#3b4a4d]">Aucune donnée disponible</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f6f1e7] text-[#3b4a4d] border-b border-[#0d1b1e]/10 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-4">ID Transaction</th>
                          <th className="p-4">Utilisateur</th>
                          <th className="p-4">Moyen</th>
                          <th className="p-4">Montant</th>
                          <th className="p-4">Bénéficiaire</th>
                          <th className="p-4">Statut</th>
                          <th className="p-4">Date</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0d1b1e]/5">
                        {payments.map((p) => (
                          <tr key={p.id} className="hover:bg-[#0d1b1e]/2 transition-colors">
                            <td className="p-4 font-mono font-bold text-[#0d1b1e]">{p.id}</td>
                            <td className="p-4">
                              <p className="font-bold text-[#0d1b1e]">{p.user_name}</p>
                              <p className="text-[10px] text-[#3b4a4d]">{p.phone}</p>
                            </td>
                            <td className="p-4">
                              <PaymentBadge method={p.payment_method} size="sm" showLabel />
                            </td>
                            <td className="p-4 font-bold tabular-nums">{formatMoney(p.amount)}</td>
                            <td className="p-4 text-[#3b4a4d] font-mono text-[10px]">
                              {p.recipient_phone}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.status === 'successful'
                                    ? 'bg-[#14a38b]/15 text-[#0f5257]'
                                    : p.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : p.status === 'refunded'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="p-4 text-[#3b4a4d]">
                              {new Date(p.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-4 text-right">
                              {p.status === 'successful' && (
                                <button
                                  onClick={() => handleRefundPayment(p.id)}
                                  className="text-[10px] font-bold text-red-600 hover:underline"
                                >
                                  Rembourser
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 5. VISITES & ANALYTICS INTERNE */}
          {/* ==================================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div>
                <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Visites & Analytics</h1>
                <p className="text-xs text-[#3b4a4d]">
                  Statistiques internes collectées sans cookies tiers ni traceurs invasifs.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white p-5 border border-[#0d1b1e]/10 shadow-xs">
                  <span className="text-xs font-bold text-[#3b4a4d] uppercase tracking-wider">
                    Visiteurs en temps réel (15 min)
                  </span>
                  <p className="mt-2 text-3xl font-extrabold text-[#14a38b]">
                    {analyticsData?.activeNow || 0}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 border border-[#0d1b1e]/10 shadow-xs">
                  <span className="text-xs font-bold text-[#3b4a4d] uppercase tracking-wider">
                    Pages vues cumulées
                  </span>
                  <p className="mt-2 text-3xl font-extrabold text-[#0d1b1e]">
                    {analyticsData?.dailyVisits?.reduce((acc: number, d: any) => acc + d.pageviews, 0) || 0}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 border border-[#0d1b1e]/10 shadow-xs">
                  <span className="text-xs font-bold text-[#3b4a4d] uppercase tracking-wider">
                    Appareil dominant
                  </span>
                  <p className="mt-2 text-2xl font-extrabold text-[#0d1b1e] capitalize">
                    {analyticsData?.devices?.[0]?.device_type || 'Mobile'}
                  </p>
                </div>
              </div>

              {/* TOP PAGES & VISITES */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-3xl bg-white border border-[#0d1b1e]/10 p-6 shadow-xs">
                  <h2 className="text-base font-bold text-[#0d1b1e] mb-4">Pages les plus consultées</h2>
                  {!analyticsData?.topPages || analyticsData.topPages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#3b4a4d]">Aucune donnée disponible</div>
                  ) : (
                    <ul className="divide-y divide-[#0d1b1e]/5">
                      {analyticsData.topPages.map((tp: any) => (
                        <li key={tp.path} className="py-2.5 flex items-center justify-between text-xs">
                          <span className="font-mono font-semibold text-[#0d1b1e]">{tp.path}</span>
                          <span className="font-bold text-[#0f5257]">{tp.views} vues</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-3xl bg-white border border-[#0d1b1e]/10 p-6 shadow-xs">
                  <h2 className="text-base font-bold text-[#0d1b1e] mb-4">Historique des 30 derniers jours</h2>
                  {!analyticsData?.dailyVisits || analyticsData.dailyVisits.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#3b4a4d]">Aucune donnée disponible</div>
                  ) : (
                    <ul className="divide-y divide-[#0d1b1e]/5 max-h-72 overflow-y-auto">
                      {analyticsData.dailyVisits.map((dv: any) => (
                        <li key={dv.date} className="py-2.5 flex items-center justify-between text-xs">
                          <span className="text-[#3b4a4d]">{dv.date}</span>
                          <span className="font-bold text-[#0d1b1e]">
                            {dv.visitors} visiteurs ({dv.pageviews} vues)
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 6. UTILISATEURS ACTIFS (HEARTBEAT) */}
          {/* ==================================================== */}
          {activeTab === 'active-users' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div>
                <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Utilisateurs Actifs</h1>
                <p className="text-xs text-[#3b4a4d]">
                  Statut en ligne/hors ligne calculé en temps réel par sessions et heartbeats.
                </p>
              </div>

              <div className="rounded-3xl bg-white border border-[#0d1b1e]/10 overflow-hidden shadow-xs">
                {activeUsersList.length === 0 ? (
                  <div className="py-16 text-center text-xs text-[#3b4a4d]">Aucune donnée disponible</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f6f1e7] text-[#3b4a4d] border-b border-[#0d1b1e]/10 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-4">Utilisateur</th>
                          <th className="p-4">Téléphone</th>
                          <th className="p-4">Présence</th>
                          <th className="p-4">Dernière activité</th>
                          <th className="p-4">Abonnement actuel</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0d1b1e]/5">
                        {activeUsersList.map((u) => (
                          <tr key={u.id} className="hover:bg-[#0d1b1e]/2 transition-colors">
                            <td className="p-4 font-bold text-[#0d1b1e]">{u.name}</td>
                            <td className="p-4 font-mono text-[#3b4a4d]">{u.phone}</td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.is_online
                                    ? 'bg-[#14a38b]/15 text-[#0f5257]'
                                    : 'bg-[#0d1b1e]/5 text-[#3b4a4d]'
                                }`}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${
                                    u.is_online ? 'bg-[#14a38b] animate-pulse' : 'bg-[#3b4a4d]'
                                  }`}
                                />
                                {u.is_online ? 'En ligne' : 'Hors ligne'}
                              </span>
                            </td>
                            <td className="p-4 text-[#3b4a4d]">
                              {u.last_seen_at
                                ? new Date(u.last_seen_at).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'Jamais'}
                            </td>
                            <td className="p-4 font-semibold text-[#0d1b1e]">
                              {u.plan_name ? `${u.plan_name} (${u.sub_status || 'actif'})` : 'Aucun'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 7. MESSAGERIE ADMIN <-> UTILISATEURS */}
          {/* ==================================================== */}
          {activeTab === 'messages' && (
            <div className="space-y-4 max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Messagerie Directe</h1>
                  <p className="text-xs text-[#3b4a4d]">
                    Échanges en temps réel avec vos clients et visiteurs.
                  </p>
                </div>
              </div>

              <div className="flex-1 grid md:grid-cols-[300px_1fr] bg-white rounded-3xl border border-[#0d1b1e]/10 overflow-hidden shadow-xs">
                {/* LISTE DES CONVERSATIONS */}
                <div className="border-r border-[#0d1b1e]/10 flex flex-col bg-[#f6f1e7]/20">
                  <div className="p-3 border-b border-[#0d1b1e]/10 text-xs font-bold text-[#0d1b1e]">
                    Conversations ({conversations.length})
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-[#0d1b1e]/5">
                    {conversations.length === 0 ? (
                      <div className="py-12 text-center text-xs text-[#3b4a4d]">
                        Aucune donnée disponible
                      </div>
                    ) : (
                      conversations.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveConvId(c.id)}
                          className={`w-full p-3.5 text-left transition-all flex items-start gap-3 ${
                            activeConvId === c.id ? 'bg-[#0f5257]/10' : 'hover:bg-[#0d1b1e]/5'
                          }`}
                        >
                          <div className="size-8 rounded-full bg-[#0f5257] text-[#f6f1e7] font-bold text-xs grid place-items-center shrink-0">
                            {c.user_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-xs truncate text-[#0d1b1e]">{c.user_name}</p>
                              {c.unread_admin_count > 0 && (
                                <span className="size-2 rounded-full bg-[#f2a541]" />
                              )}
                            </div>
                            <p className="text-[11px] text-[#3b4a4d] truncate mt-0.5">
                              {c.last_message || 'Pas de message'}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* FIL DE DISCUSSION */}
                <div className="flex flex-col bg-white">
                  {activeConvId ? (
                    <>
                      <div className="p-4 border-b border-[#0d1b1e]/10 flex items-center justify-between bg-white">
                        <div>
                          <p className="font-bold text-sm text-[#0d1b1e]">
                            {conversations.find((c) => c.id === activeConvId)?.user_name}
                          </p>
                          <p className="text-xs text-[#3b4a4d]">
                            {conversations.find((c) => c.id === activeConvId)?.user_phone || 'Visiteur web'}
                          </p>
                        </div>
                      </div>

                      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f6f1e7]/30">
                        {convMessages.length === 0 ? (
                          <div className="py-12 text-center text-xs text-[#3b4a4d]">
                            Aucun message dans ce fil.
                          </div>
                        ) : (
                          convMessages.map((m) => {
                            const isAdmin = m.sender_type === 'admin';
                            return (
                              <div
                                key={m.id}
                                className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                              >
                                <div
                                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                                    isAdmin
                                      ? 'bg-[#0f5257] text-[#f6f1e7] rounded-tr-sm'
                                      : 'bg-white text-[#0d1b1e] border border-[#0d1b1e]/10 rounded-tl-sm'
                                  }`}
                                >
                                  <p className="text-[10px] opacity-75 font-bold mb-0.5">
                                    {isAdmin ? 'Vous (Admin)' : m.sender_name}
                                  </p>
                                  <p className="whitespace-pre-wrap">{m.content}</p>
                                </div>
                                <span className="text-[9px] text-[#3b4a4d]/60 mt-0.5">
                                  {new Date(m.created_at).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <form
                        onSubmit={handleSendAdminReply}
                        className="p-3 border-t border-[#0d1b1e]/10 flex gap-2 bg-white"
                      >
                        <input
                          type="text"
                          required
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Écrivez votre réponse au client…"
                          className="flex-1 rounded-xl border border-[#0d1b1e]/20 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                        />
                        <button
                          type="submit"
                          disabled={isSendingReply || !replyContent.trim()}
                          className="px-4 py-2 rounded-xl bg-[#0f5257] text-[#f6f1e7] font-bold text-xs hover:bg-[#14a38b] transition-colors disabled:opacity-40"
                        >
                          {isSendingReply ? 'Envoi…' : 'Envoyer'}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-[#3b4a4d]">
                      Sélectionnez une conversation pour afficher l'échange.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 8. NOTIFICATIONS */}
          {/* ==================================================== */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Centre de Notifications</h1>
                  <p className="text-xs text-[#3b4a4d]">
                    Alertes administratives : nouveaux paiements, expirations, inscriptions.
                  </p>
                </div>
                {unreadNotifsCount > 0 && (
                  <button
                    onClick={handleMarkAllNotifsRead}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#0d1b1e]/15 text-xs font-bold text-[#0f5257] hover:bg-[#f6f1e7]"
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>

              <div className="rounded-3xl bg-white border border-[#0d1b1e]/10 divide-y divide-[#0d1b1e]/5 overflow-hidden shadow-xs">
                {notifications.length === 0 ? (
                  <div className="py-16 text-center text-xs text-[#3b4a4d]">Aucune donnée disponible</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 flex items-start gap-4 transition-colors ${
                        n.is_read ? 'opacity-80' : 'bg-[#0f5257]/5'
                      }`}
                    >
                      <div className="size-8 rounded-full bg-[#0f5257]/10 text-[#0f5257] grid place-items-center shrink-0">
                        <Bell className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-[#0d1b1e]">{n.title}</p>
                        <p className="text-xs text-[#3b4a4d] mt-0.5">{n.message}</p>
                        <span className="text-[10px] text-[#3b4a4d]/60 mt-1 block">
                          {new Date(n.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 9. JOURNAL D'ACTIVITÉ (LOGS) */}
          {/* ==================================================== */}
          {activeTab === 'logs' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Journal d'activité (Audit Logs)</h1>
                  <p className="text-xs text-[#3b4a4d]">
                    Traçabilité complète des actions administratives et de sécurité.
                  </p>
                </div>
                <div className="relative">
                  <Search className="size-4 absolute left-3 top-2.5 text-[#3b4a4d]" />
                  <input
                    type="text"
                    placeholder="Filtrer par action, IP…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl bg-white border border-[#0d1b1e]/15 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-[#0d1b1e]/10 overflow-hidden shadow-xs">
                {activityLogs.length === 0 ? (
                  <div className="py-16 text-center text-xs text-[#3b4a4d]">Aucune donnée disponible</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f6f1e7] text-[#3b4a4d] border-b border-[#0d1b1e]/10 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-4">Action</th>
                          <th className="p-4">Auteur</th>
                          <th className="p-4">Détails</th>
                          <th className="p-4">Adresse IP</th>
                          <th className="p-4">Résultat</th>
                          <th className="p-4">Date & Heure</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0d1b1e]/5">
                        {activityLogs.map((l) => (
                          <tr key={l.id} className="hover:bg-[#0d1b1e]/2 transition-colors">
                            <td className="p-4 font-mono font-bold text-[#0d1b1e]">{l.action}</td>
                            <td className="p-4 text-[#3b4a4d]">{l.admin_email || 'Système'}</td>
                            <td className="p-4 text-[#0d1b1e] max-w-xs truncate">{l.details}</td>
                            <td className="p-4 font-mono text-[10px] text-[#3b4a4d]">{l.ip_address || '-'}</td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  l.result === 'success'
                                    ? 'bg-[#14a38b]/15 text-[#0f5257]'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {l.result}
                              </span>
                            </td>
                            <td className="p-4 text-[#3b4a4d]">
                              {new Date(l.created_at).toLocaleString('fr-FR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 10. PARAMÈTRES SAAS & PASSERELLES */}
          {/* ==================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div>
                <h1 className="text-2xl font-extrabold text-[#0d1b1e]">Paramètres du SaaS</h1>
                <p className="text-xs text-[#3b4a4d]">
                  Configurez vos forfaits, vos coordonnées marchandes et vos clés de paiement.
                </p>
              </div>

              {saveSettingsStatus && (
                <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-xs font-bold">
                  {saveSettingsStatus}
                </div>
              )}

              {settingsData && (
                <form onSubmit={handleSaveSettings} className="space-y-8">
                  {/* COORDONNÉES MARCHANDES OFFICIELLES */}
                  <div className="rounded-3xl bg-white p-6 border border-[#0d1b1e]/10 shadow-xs space-y-4">
                    <h2 className="text-base font-bold text-[#0d1b1e]">
                      1. Coordonnées marchandes du propriétaire
                    </h2>
                    <p className="text-xs text-[#3b4a4d]">
                      Affichées aux abonnés sur la page de paiement et utilisées pour la réception des fonds.
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-[#0d1b1e] mb-1">
                          Numéro Wave & Orange Money
                        </label>
                        <input
                          type="text"
                          value={settingsData.settings.owner_phone || '+221 78 424 34 20'}
                          onChange={(e) =>
                            setSettingsData({
                              ...settingsData,
                              settings: { ...settingsData.settings, owner_phone: e.target.value }
                            })
                          }
                          className="w-full rounded-xl border border-[#0d1b1e]/20 p-2.5 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#0d1b1e] mb-1">Email du propriétaire</label>
                        <input
                          type="email"
                          value={settingsData.settings.owner_email || 'almamydiakhite12@gmail.com'}
                          onChange={(e) =>
                            setSettingsData({
                              ...settingsData,
                              settings: { ...settingsData.settings, owner_email: e.target.value }
                            })
                          }
                          className="w-full rounded-xl border border-[#0d1b1e]/20 p-2.5 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CONFIGURATION WAVE */}
                  <div className="rounded-3xl bg-white p-6 border border-[#0d1b1e]/10 shadow-xs space-y-4">
                    <div className="flex items-center gap-2">
                      <PaymentBadge method="wave" size="sm" />
                      <h2 className="text-base font-bold text-[#0d1b1e]">2. Passerelle Wave Sénégal</h2>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-[#0d1b1e] mb-1">Environnement Wave</label>
                        <select
                          value={settingsData.settings.wave_environment || 'sandbox'}
                          onChange={(e) =>
                            setSettingsData({
                              ...settingsData,
                              settings: { ...settingsData.settings, wave_environment: e.target.value }
                            })
                          }
                          className="w-full rounded-xl border border-[#0d1b1e]/20 p-2.5"
                        >
                          <option value="sandbox">Sandbox (Tests)</option>
                          <option value="production">Production (Réel)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-[#0d1b1e] mb-1">Clé API Wave</label>
                        <input
                          type="password"
                          placeholder="wave_ci_live_..."
                          value={settingsData.settings.wave_api_key || ''}
                          onChange={(e) =>
                            setSettingsData({
                              ...settingsData,
                              settings: { ...settingsData.settings, wave_api_key: e.target.value }
                            })
                          }
                          className="w-full rounded-xl border border-[#0d1b1e]/20 p-2.5"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-bold text-[#0d1b1e] mb-1">
                          Secret Webhook Wave (pour signature HMAC)
                        </label>
                        <input
                          type="password"
                          placeholder="wave_whsec_..."
                          value={settingsData.settings.wave_webhook_secret || ''}
                          onChange={(e) =>
                            setSettingsData({
                              ...settingsData,
                              settings: { ...settingsData.settings, wave_webhook_secret: e.target.value }
                            })
                          }
                          className="w-full rounded-xl border border-[#0d1b1e]/20 p-2.5"
                        />
                      </div>

                      <div className="sm:col-span-2 p-3 rounded-xl bg-[#1dc4ff]/10 text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-[#0d1b1e]">URL de Webhook Wave à renseigner chez Wave :</p>
                          <p className="font-mono text-[11px] text-[#3b4a4d]">
                            {window.location.origin}/api/webhooks/wave
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(`${window.location.origin}/api/webhooks/wave`, 'wave_url')
                          }
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#0d1b1e]/15 font-bold text-[10px] hover:bg-[#f6f1e7]"
                        >
                          {copiedKey === 'wave_url' ? 'Copié !' : 'Copier'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CONFIGURATION ORANGE MONEY */}
                  <div className="rounded-3xl bg-white p-6 border border-[#0d1b1e]/10 shadow-xs space-y-4">
                    <div className="flex items-center gap-2">
                      <PaymentBadge method="orange" size="sm" />
                      <h2 className="text-base font-bold text-[#0d1b1e]">3. Passerelle Orange Money Sénégal</h2>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-[#0d1b1e] mb-1">Environnement OM</label>
                        <select
                          value={settingsData.settings.orange_environment || 'sandbox'}
                          onChange={(e) =>
                            setSettingsData({
                              ...settingsData,
                              settings: { ...settingsData.settings, orange_environment: e.target.value }
                            })
                          }
                          className="w-full rounded-xl border border-[#0d1b1e]/20 p-2.5"
                        >
                          <option value="sandbox">Sandbox (Tests)</option>
                          <option value="production">Production (Réel)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-[#0d1b1e] mb-1">Client ID Orange</label>
                        <input
                          type="text"
                          placeholder="client_id_..."
                          value={settingsData.settings.orange_client_id || ''}
                          onChange={(e) =>
                            setSettingsData({
                              ...settingsData,
                              settings: { ...settingsData.settings, orange_client_id: e.target.value }
                            })
                          }
                          className="w-full rounded-xl border border-[#0d1b1e]/20 p-2.5"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#0d1b1e] mb-1">Client Secret Orange</label>
                        <input
                          type="password"
                          placeholder="client_secret_..."
                          value={settingsData.settings.orange_client_secret || ''}
                          onChange={(e) =>
                            setSettingsData({
                              ...settingsData,
                              settings: { ...settingsData.settings, orange_client_secret: e.target.value }
                            })
                          }
                          className="w-full rounded-xl border border-[#0d1b1e]/20 p-2.5"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#0d1b1e] mb-1">Merchant Key Orange</label>
                        <input
                          type="text"
                          placeholder="code_marchand_..."
                          value={settingsData.settings.orange_merchant_key || ''}
                          onChange={(e) =>
                            setSettingsData({
                              ...settingsData,
                              settings: { ...settingsData.settings, orange_merchant_key: e.target.value }
                            })
                          }
                          className="w-full rounded-xl border border-[#0d1b1e]/20 p-2.5"
                        />
                      </div>

                      <div className="sm:col-span-2 p-3 rounded-xl bg-[#ff7900]/10 text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-[#0d1b1e]">
                            URL de Webhook Orange Money à renseigner :
                          </p>
                          <p className="font-mono text-[11px] text-[#3b4a4d]">
                            {window.location.origin}/api/webhooks/orange-money
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(`${window.location.origin}/api/webhooks/orange-money`, 'om_url')
                          }
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#0d1b1e]/15 font-bold text-[10px] hover:bg-[#f6f1e7]"
                        >
                          {copiedKey === 'om_url' ? 'Copié !' : 'Copier'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CONFIGURATION DES FORFAITS */}
                  <div className="rounded-3xl bg-white p-6 border border-[#0d1b1e]/10 shadow-xs space-y-4">
                    <h2 className="text-base font-bold text-[#0d1b1e]">4. Tarifs et forfaits</h2>

                    <div className="space-y-4">
                      {settingsData.plans?.map((plan: Plan, index: number) => (
                        <div
                          key={plan.id}
                          className="p-4 rounded-2xl bg-[#f6f1e7] border border-[#0d1b1e]/10 grid sm:grid-cols-3 gap-3 text-xs"
                        >
                          <div>
                            <label className="block font-bold text-[#0d1b1e] mb-1">Nom du forfait</label>
                            <input
                              type="text"
                              value={plan.name}
                              onChange={(e) => {
                                const newPlans = [...settingsData.plans];
                                newPlans[index].name = e.target.value;
                                setSettingsData({ ...settingsData, plans: newPlans });
                              }}
                              className="w-full rounded-xl border border-[#0d1b1e]/20 p-2 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-[#0d1b1e] mb-1">Prix (FCFA / mois)</label>
                            <input
                              type="number"
                              value={plan.price}
                              onChange={(e) => {
                                const newPlans = [...settingsData.plans];
                                newPlans[index].price = parseInt(e.target.value, 10) || 0;
                                setSettingsData({ ...settingsData, plans: newPlans });
                              }}
                              className="w-full rounded-xl border border-[#0d1b1e]/20 p-2 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-[#0d1b1e] mb-1">Accroche</label>
                            <input
                              type="text"
                              value={plan.tagline}
                              onChange={(e) => {
                                const newPlans = [...settingsData.plans];
                                newPlans[index].tagline = e.target.value;
                                setSettingsData({ ...settingsData, plans: newPlans });
                              }}
                              className="w-full rounded-xl border border-[#0d1b1e]/20 p-2 bg-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-full bg-[#0d1b1e] text-[#f6f1e7] font-bold text-xs hover:bg-[#0f5257] transition-all shadow-md"
                    >
                      Enregistrer les modifications
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* ONGLET 5 : SITES WEB DES ABONNÉS */}
          {/* ==================================================== */}
          {activeTab === 'sites' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-[#0d1b1e]">Sites Web des Abonnés</h2>
                  <p className="text-xs text-[#3b4a4d]">
                    Gérez et modérez les sites créés par les utilisateurs, accessibles publiquement à l'adresse /s/:slug.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-full bg-[#0f5257]/10 text-[#0f5257] text-xs font-bold">
                    {adminSites.length} site{adminSites.length > 1 ? 's' : ''} au total
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    {adminSites.filter((s) => s.is_published).length} en ligne
                  </span>
                </div>
              </div>

              {/* STATS RAPIDES SITES */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-[#0d1b1e]/10 shadow-xs">
                  <span className="text-[11px] font-bold text-[#3b4a4d] uppercase">Sites créés</span>
                  <div className="text-2xl font-black text-[#0d1b1e] mt-1">{adminSites.length}</div>
                  <span className="text-[10px] text-[#3b4a4d]">Par tous les abonnés</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#0d1b1e]/10 shadow-xs">
                  <span className="text-[11px] font-bold text-[#3b4a4d] uppercase">Sites Publiés</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {adminSites.filter((s) => s.is_published).length}
                  </div>
                  <span className="text-[10px] text-emerald-700">Visibles sur Internet</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#0d1b1e]/10 shadow-xs">
                  <span className="text-[11px] font-bold text-[#3b4a4d] uppercase">Total Vues</span>
                  <div className="text-2xl font-black text-[#0f5257] mt-1">
                    {adminSites.reduce((acc, s) => acc + (s.views_count || 0), 0)}
                  </div>
                  <span className="text-[10px] text-[#3b4a4d]">Visites cumulées</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#0d1b1e]/10 shadow-xs">
                  <span className="text-[11px] font-bold text-[#3b4a4d] uppercase">Modèles Utilisés</span>
                  <div className="text-2xl font-black text-[#f26419] mt-1">
                    {new Set(adminSites.map((s) => s.template_id || s.template)).size} / 5
                  </div>
                  <span className="text-[10px] text-[#3b4a4d]">E-com, Resto, Agence…</span>
                </div>
              </div>

              {/* BARRE DE FILTRE */}
              <div className="p-4 rounded-2xl bg-white border border-[#0d1b1e]/10 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#3b4a4d]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par titre, slug, abonné ou téléphone..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#0d1b1e]/15 text-xs bg-[#f6f1e7]/30 focus:outline-none focus:ring-2 focus:ring-[#0f5257]"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-[#0d1b1e]/15 text-xs bg-white text-[#0d1b1e] font-semibold focus:outline-none"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="published">En ligne uniquement</option>
                    <option value="draft">Brouillon uniquement</option>
                  </select>
                </div>
              </div>

              {/* LISTE DES SITES */}
              {adminSites.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white border border-[#0d1b1e]/10 space-y-3">
                  <Globe className="size-12 mx-auto text-[#3b4a4d]/40" />
                  <h3 className="text-base font-bold text-[#0d1b1e]">Aucun site web créé pour le moment</h3>
                  <p className="text-xs text-[#3b4a4d] max-w-md mx-auto">
                    Dès que vos abonnés actifs créeront leurs sites depuis leur Espace Client (/mes-sites), ils apparaîtront ici pour modération et consultation.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-[#0d1b1e]/10 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f6f1e7] text-[#0d1b1e] font-bold uppercase tracking-wider border-b border-[#0d1b1e]/10">
                        <tr>
                          <th className="p-4">Site & Lien Public</th>
                          <th className="p-4">Modèle</th>
                          <th className="p-4">Abonné (Propriétaire)</th>
                          <th className="p-4">Statut Abonnement</th>
                          <th className="p-4">Vues</th>
                          <th className="p-4">Publication</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#0d1b1e]/10">
                        {adminSites
                          .filter((site) => {
                            if (!searchQuery) return true;
                            const q = searchQuery.toLowerCase();
                            return (
                              site.title?.toLowerCase().includes(q) ||
                              site.slug?.toLowerCase().includes(q) ||
                              site.user_name?.toLowerCase().includes(q) ||
                              site.user_phone?.toLowerCase().includes(q)
                            );
                          })
                          .filter((site) => {
                            if (!statusFilter) return true;
                            if (statusFilter === 'published') return site.is_published === 1;
                            if (statusFilter === 'draft') return site.is_published === 0;
                            return true;
                          })
                          .map((site) => {
                            const isSubActive = site.sub_status === 'active' && new Date(site.sub_expires_date) > new Date();
                            const templateLabels: Record<string, { label: string; color: string }> = {
                              ecommerce: { label: 'Boutique E-commerce', color: 'bg-blue-100 text-blue-800' },
                              restaurant: { label: 'Restaurant & Traiteur', color: 'bg-amber-100 text-amber-800' },
                              agency: { label: 'Agence & Services', color: 'bg-purple-100 text-purple-800' },
                              medical: { label: 'Cabinet & Santé', color: 'bg-emerald-100 text-emerald-800' },
                              realestate: { label: 'Immobilier & Résidences', color: 'bg-indigo-100 text-indigo-800' },
                            };
                            const tmplKey = site.template_id || site.template;
                            const tmpl = templateLabels[tmplKey] || { label: tmplKey, color: 'bg-gray-100 text-gray-800' };

                            return (
                              <tr key={site.id} className="hover:bg-[#f6f1e7]/40 transition-colors">
                                <td className="p-4">
                                  <div className="font-bold text-[#0d1b1e] text-sm flex items-center gap-1.5">
                                    <Globe className="size-4 text-[#0f5257] shrink-0" />
                                    <span>{site.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="font-mono text-[11px] text-[#3b4a4d]">
                                      /s/{site.slug}
                                    </span>
                                    <button
                                      onClick={() => handleCopy(`${window.location.origin}/s/${site.slug}`, `site-${site.id}`)}
                                      className="text-[#3b4a4d] hover:text-[#0d1b1e]"
                                      title="Copier le lien public"
                                    >
                                      {copiedKey === `site-${site.id}` ? (
                                        <Check className="size-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="size-3" />
                                      )}
                                    </button>
                                  </div>
                                </td>

                                <td className="p-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${tmpl.color}`}>
                                    {tmpl.label}
                                  </span>
                                </td>

                                <td className="p-4">
                                  <div className="font-bold text-[#0d1b1e]">{site.user_name || 'Utilisateur inconnu'}</div>
                                  <div className="text-[#3b4a4d] text-[11px]">{site.user_phone}</div>
                                  <div className="text-[10px] text-[#0f5257] font-semibold mt-0.5">
                                    {site.plan_name ? `Forfait ${site.plan_name}` : 'Sans forfait'}
                                  </div>
                                </td>

                                <td className="p-4">
                                  {isSubActive ? (
                                    <div>
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                        <CheckCircle2 className="size-3" /> Actif (à jour)
                                      </span>
                                      <div className="text-[10px] text-[#3b4a4d] mt-1">
                                        Renouvellement : {new Date(site.sub_expires_date).toLocaleDateString('fr-FR')}
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                                        <AlertTriangle className="size-3" /> Expiré / Non payé
                                      </span>
                                      <div className="text-[10px] text-red-600 font-semibold mt-0.5">
                                        Édition bloquée
                                      </div>
                                    </div>
                                  )}
                                </td>

                                <td className="p-4">
                                  <div className="inline-flex items-center gap-1.5 font-bold text-[#0d1b1e]">
                                    <Eye className="size-3.5 text-[#3b4a4d]" />
                                    <span>{site.views_count || 0}</span>
                                  </div>
                                </td>

                                <td className="p-4">
                                  <button
                                    onClick={() => handleToggleAdminSitePublish(site.id)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                                      site.is_published
                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                    title="Cliquer pour changer la publication"
                                  >
                                    <span className={`size-1.5 rounded-full ${site.is_published ? 'bg-emerald-600' : 'bg-gray-400'}`} />
                                    {site.is_published ? 'En ligne' : 'Brouillon'}
                                  </button>
                                </td>

                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <a
                                      href={`/s/${site.slug}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-2 rounded-xl bg-[#0f5257]/10 text-[#0f5257] hover:bg-[#0f5257] hover:text-[#f6f1e7] transition-all"
                                      title="Ouvrir le site public"
                                    >
                                      <ExternalLink className="size-4" />
                                    </a>
                                    <button
                                      onClick={() => handleDeleteAdminSite(site.id, site.title)}
                                      className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                                      title="Supprimer le site"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ==================================================== */}
      {/* MODAL : DÉTAIL D'UN UTILISATEUR */}
      {/* ==================================================== */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-[#0d1b1e]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white border border-[#0d1b1e]/15 p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#0d1b1e]/10">
              <div>
                <h3 className="text-xl font-extrabold text-[#0d1b1e]">
                  {selectedUserDetail.user.name}
                </h3>
                <p className="text-xs text-[#3b4a4d]">
                  Inscrit le {new Date(selectedUserDetail.user.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="p-1 rounded-lg hover:bg-[#0d1b1e]/5"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-[#f6f1e7]">
                <span className="text-[#3b4a4d]">Téléphone :</span>
                <p className="font-bold text-[#0d1b1e] mt-0.5">{selectedUserDetail.user.phone}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#f6f1e7]">
                <span className="text-[#3b4a4d]">Adresse e-mail :</span>
                <p className="font-bold text-[#0d1b1e] mt-0.5">
                  {selectedUserDetail.user.email || 'Non renseigné'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#f6f1e7]">
                <span className="text-[#3b4a4d]">Statut du compte :</span>
                <p className="font-bold text-[#0d1b1e] mt-0.5 capitalize">
                  {selectedUserDetail.user.status}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#f6f1e7]">
                <span className="text-[#3b4a4d]">Formule actuelle :</span>
                <p className="font-bold text-[#0f5257] mt-0.5">
                  {selectedUserDetail.user.plan_name || 'Aucun abonnement actif'}
                </p>
              </div>
            </div>

            {/* HISTORIQUE DES PAIEMENTS */}
            <div>
              <h4 className="font-bold text-xs text-[#0d1b1e] mb-2 uppercase tracking-wider">
                Historique des paiements ({selectedUserDetail.payments.length})
              </h4>
              {selectedUserDetail.payments.length === 0 ? (
                <p className="text-xs text-[#3b4a4d]">Aucun paiement enregistré.</p>
              ) : (
                <ul className="divide-y divide-[#0d1b1e]/10 text-xs">
                  {selectedUserDetail.payments.map((p) => (
                    <li key={p.id} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold">{p.id}</span>
                        <span className="text-[#3b4a4d] ml-2">via {p.payment_method}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{formatMoney(p.amount)}</span>
                        <span
                          className={`ml-2 font-bold ${
                            p.status === 'successful' ? 'text-[#14a38b]' : 'text-yellow-600'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-4 border-t border-[#0d1b1e]/10 flex justify-end gap-2">
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 rounded-xl bg-[#0d1b1e] text-[#f6f1e7] text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL : CONFIRMATION SUPPRESSION UTILISATEUR */}
      {/* ==================================================== */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-[#0d1b1e]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#0d1b1e]/15 p-6 shadow-2xl space-y-4">
            <div className="size-12 rounded-2xl bg-red-100 text-red-700 grid place-items-center">
              <AlertTriangle className="size-6" />
            </div>
            <h3 className="text-lg font-extrabold text-[#0d1b1e]">
              Confirmer la suppression ?
            </h3>
            <p className="text-xs text-[#3b4a4d]">
              Êtes-vous sûr de vouloir supprimer définitivement le compte de{' '}
              <strong>{userToDelete.name}</strong> ({userToDelete.phone}) ? Ses abonnements seront également résiliés.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl border border-[#0d1b1e]/15 text-xs font-bold text-[#0d1b1e]"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteUser(userToDelete.id)}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL : MODIFICATION UTILISATEUR */}
      {/* ==================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-[#0d1b1e]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateUser}
            className="w-full max-w-md rounded-3xl bg-white border border-[#0d1b1e]/15 p-6 shadow-2xl space-y-4 text-xs"
          >
            <h3 className="text-lg font-extrabold text-[#0d1b1e]">
              Modifier les informations
            </h3>
            <div>
              <label className="block font-bold text-[#0d1b1e] mb-1">Nom complet</label>
              <input
                type="text"
                required
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                className="w-full rounded-xl border border-[#0d1b1e]/20 p-2.5 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0d1b1e] mb-1">Adresse e-mail</label>
              <input
                type="email"
                value={editingUser.email || ''}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                className="w-full rounded-xl border border-[#0d1b1e]/20 p-2.5 text-xs focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl border border-[#0d1b1e]/15 font-bold text-[#0d1b1e]"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#0f5257] text-[#f6f1e7] font-bold hover:bg-[#14a38b]"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// Helper stats
function dashboardStats(data: any): DashboardStats | null {
  return data?.stats || null;
}
