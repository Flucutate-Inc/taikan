import React from 'react';

type BadgeColor = 'teal' | 'orange' | 'blue' | 'gray';
type BadgeVariant = 'solid' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({ children, color = 'teal', variant = 'solid' }) => {
  const baseClasses = 'px-2 py-0.5 text-xs font-bold rounded';
  
  const styles: Record<BadgeColor, string> = {
    teal: variant === 'solid' ? 'bg-teal-500 text-white' : 'text-teal-600 border border-teal-500',
    orange: variant === 'solid' ? 'bg-orange-400 text-white' : 'text-orange-500 border border-orange-400',
    blue: variant === 'solid' ? 'bg-blue-500 text-white' : 'text-blue-500 border border-blue-500',
    gray: variant === 'solid' ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-600',
  };

  return <span className={`${baseClasses} ${styles[color]}`}>{children}</span>;
};

