'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface BrandButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'highlight';
  size?: 'small' | 'medium' | 'large';
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function BrandButton({
  children,
  variant = 'primary',
  size = 'medium',
  icon: Icon,
  href,
  onClick,
  className = '',
  disabled = false
}: BrandButtonProps) {
  
  // 사이즈별 스타일
  const sizeStyles = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-5 py-2.5 text-lg'
  };
  
  // 변형별 스타일
  const variantStyles = {
    primary: 'bg-notion-black text-notion-white border border-notion-black hover:bg-notion-gray-800',
    secondary: 'bg-notion-gray-100 text-notion-black border border-notion-gray-200 hover:bg-notion-gray-200',
    outline: 'bg-transparent text-notion-black border border-notion-gray-300 hover:bg-notion-gray-50',
    ghost: 'bg-transparent text-notion-black hover:bg-notion-gray-50 border border-transparent',
    highlight: 'bg-tb-yellow text-tb-black border border-tb-yellow hover:opacity-90 font-medium'
  };
  
  // 비활성화된 경우 스타일
  const disabledStyle = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  // 공통 스타일
  const buttonStyles = `
    inline-flex items-center justify-center rounded-md transition-all duration-200
    ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyle} ${className}
  `;
  
  // 링크인 경우 Link 컴포넌트 반환
  if (href && !disabled) {
    return (
      <Link href={href} className={buttonStyles}>
        {Icon && <Icon className="mr-2" size={size === 'small' ? 16 : size === 'large' ? 20 : 18} />}
        {children}
      </Link>
    );
  }
  
  // 버튼인 경우
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={buttonStyles}
    >
      {Icon && <Icon className="mr-2" size={size === 'small' ? 16 : size === 'large' ? 20 : 18} />}
      {children}
    </button>
  );
}
