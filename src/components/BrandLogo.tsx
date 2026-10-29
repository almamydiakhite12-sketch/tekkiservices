import React from 'react';

interface BrandLogoProps {
  light?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ light = false, className = '' }) => {
  return (
    <a href="/" className={`flex items-center gap-2.5 group ${className}`}>
      <span className="grid place-items-center size-9 rounded-xl bg-[#0f5257] text-[#f6f1e7] font-display font-extrabold text-lg -rotate-6 group-hover:rotate-0 transition-transform shadow-sm">
        T
      </span>
      <span className={`font-display font-bold text-xl ${light ? 'text-[#f6f1e7]' : 'text-[#0d1b1e]'}`}>
        Tekki<span className="text-[#14a38b]">.</span>Services
      </span>
    </a>
  );
};
