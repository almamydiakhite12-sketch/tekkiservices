import { useEffect } from 'react';

export const AnalyticsTracker = () => {
  useEffect(() => {
    try {
      // Récupérer ou initialiser le session_id
      let sessionId = localStorage.getItem('tekki_session_id');
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('tekki_session_id', sessionId);
      }

      // Détecter l'appareil
      const width = window.innerWidth;
      const deviceType = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

      // Détecter le navigateur
      const ua = navigator.userAgent;
      let browser = 'autre';
      if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Chrome')) browser = 'Chrome';
      else if (ua.includes('Safari')) browser = 'Safari';
      else if (ua.includes('Edge')) browser = 'Edge';

      const userPhone = localStorage.getItem('tekki_user_phone');
      const userId = localStorage.getItem('tekki_user_id');

      // Envoyer le suivi de visite
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          path: window.location.pathname + window.location.search,
          referrer: document.referrer || undefined,
          deviceType,
          browser,
          userId: userId || undefined
        })
      }).catch(() => {});

      // Envoyer le heartbeat utilisateur si connu
      if (userId || userPhone) {
        fetch('/api/users/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, phone: userPhone })
        }).catch(() => {});
      }
    } catch {
      // Ignorer les erreurs silencieusement
    }
  }, []);

  return null;
};
