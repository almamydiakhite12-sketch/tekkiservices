import React from 'react';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  currentPath?: string;
}

export const Header: React.FC<HeaderProps> = ({ currentPath = '/' }) => {
  return (
    <header className="sticky top-0 z-30 bg-[#f6f1e7]/85 backdrop-blur-md border-b border-[#0d1b1e]/10">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <BrandLogo />
        <nav className="flex items-center gap-1 sm:gap-3 text-sm font-semibold">
          <a
            href="/#tarifs"
            className="hidden sm:inline px-3 py-2 rounded-lg hover:bg-[#0d1b1e]/5 text-[#0d1b1e] transition-colors"
          >
            Tarifs
          </a>
          <a
            href="/#contact"
            className="hidden sm:inline px-3 py-2 rounded-lg hover:bg-[#0d1b1e]/5 text-[#0d1b1e] transition-colors"
          >
            Contact
          </a>
          <a
            href="/mes-sites"
            className={`px-3 py-2 rounded-lg hover:bg-[#0d1b1e]/5 transition-colors font-bold ${
              currentPath.startsWith('/mes-sites') ? 'bg-[#0f5257]/10 text-[#0f5257]' : 'text-[#0d1b1e]'
            }`}
          >
            Mes Sites Web
          </a>
          <a
            href="/admin"
            className={`px-3 py-2 rounded-lg hover:bg-[#0d1b1e]/5 transition-colors ${
              currentPath === '/admin' ? 'bg-[#0d1b1e]/10 text-[#0f5257] font-bold' : 'text-[#0d1b1e]'
            }`}
          >
            Admin
          </a>
          <a
            href="/abonnement?plan=pro"
            className="px-4 py-2 rounded-full bg-[#0d1b1e] text-[#f6f1e7] hover:bg-[#0f5257] transition-all font-bold shadow-sm"
          >
            S'abonner
          </a>
        </nav>
      </div>
    </header>
  );
};
