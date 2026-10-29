import React, { useState, useEffect } from 'react';
import { HomePage } from './pages/HomePage';
import { AbonnementPage } from './pages/AbonnementPage';
import { AdminPage } from './pages/AdminPage';
import { ClientPortalPage } from './pages/ClientPortalPage';
import { PublicSitePage } from './pages/PublicSitePage';
import { SupportWidget } from './components/SupportWidget';
import { AnalyticsTracker } from './components/AnalyticsTracker';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);

    // Intercepter les clics sur les balises <a> pour une navigation SPA fluide
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Laisser passer les ancres d'URL externe, mailto, tel, ou ancres pures (#...)
      if (
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        target.getAttribute('target') === '_blank'
      ) {
        return;
      }

      // Si c'est un lien interne (ex: /s/..., /mes-sites, /admin, /abonnement?plan=pro, /)
      if (href.startsWith('/')) {
        e.preventDefault();
        window.history.pushState({}, '', href);
        handleLocationChange();
        window.scrollTo(0, 0);
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      document.removeEventListener('click', handleAnchorClick);
    };
  }, []);

  // Déterminer la page à afficher
  let PageComponent = HomePage;
  if (currentPath.startsWith('/s/')) {
    PageComponent = PublicSitePage;
  } else if (currentPath.startsWith('/mes-sites') || currentPath.startsWith('/espace-client')) {
    PageComponent = ClientPortalPage;
  } else if (currentPath.startsWith('/admin')) {
    PageComponent = AdminPage;
  } else if (currentPath.startsWith('/abonnement')) {
    PageComponent = AbonnementPage;
  }

  // Masquer le widget support sur les sites clients publics et sur l'admin
  const showSupportWidget = !currentPath.startsWith('/admin') && !currentPath.startsWith('/s/');

  return (
    <>
      <AnalyticsTracker />
      <PageComponent />
      {showSupportWidget && <SupportWidget />}
    </>
  );
}
