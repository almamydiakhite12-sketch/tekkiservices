import React from 'react';

interface PaymentBadgeProps {
  method: 'wave' | 'orange_money' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const PaymentBadge: React.FC<PaymentBadgeProps> = ({ method, size = 'sm', showLabel = false }) => {
  const isWave = method === 'wave';
  const bgColor = isWave ? '#1dc4ff' : '#ff7900';
  const label = isWave ? 'Wave' : 'Orange Money';
  const shortText = isWave ? 'W' : 'OM';

  const sizeClasses = {
    sm: 'size-6 text-[10px]',
    md: 'size-8 text-xs',
    lg: 'size-11 text-sm'
  }[size];

  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`grid place-items-center shrink-0 rounded-lg font-extrabold text-white shadow-sm ${sizeClasses}`}
        style={{ backgroundColor: bgColor }}
      >
        {shortText}
      </span>
      {showLabel && <span className="font-bold text-sm text-[#0d1b1e]">{label}</span>}
    </span>
  );
};
