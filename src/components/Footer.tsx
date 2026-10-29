import React from 'react';
import { BrandLogo } from './BrandLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0d1b1e] text-[#f6f1e7]/70 text-sm">
      <div className="mx-auto max-w-6xl px-5 py-10 flex flex-col sm:flex-row gap-6 justify-between">
        <div className="space-y-3">
          <BrandLogo light={true} />
          <p>Paiements sécurisés par Wave et Orange Money · Dakar, Sénégal</p>
          <p className="text-xs text-[#f6f1e7]/50">
            Propriétaire : Almamy Diakhité · Numéro officiel : +221 78 424 34 20
          </p>
        </div>
        <div className="space-y-1 sm:text-right">
          <a className="block hover:text-[#f6f1e7] transition-colors" href="mailto:almamydiakhite12@gmail.com">
            almamydiakhite12@gmail.com
          </a>
          <a className="block hover:text-[#f6f1e7] transition-colors" href="tel:+221784243420">
            +221 78 424 34 20
          </a>
          <p className="text-xs pt-1 text-[#f6f1e7]/40">© 2026 Tekki Services. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};
