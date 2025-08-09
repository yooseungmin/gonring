'use client';

import React from 'react';

interface BrandTagProps {
  text: string;
  count?: number;
  variant?: 'default' | 'highlight' | 'outline';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function BrandTag({
  text,
  count,
  variant = 'default',
  size = 'medium',
  onClick,
  className = '',
  disabled = false
}: BrandTagProps) {
  
  // 사이즈별 스타일
  const sizeStyles = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-3 py-1 text-sm',
    large: 'px-3 py-1.5 text-base'
  };
  
  // 변형별 스타일
  const variantStyles = {
    default: 'bg-notion-gray-100 text-text-secondary border-notion-gray-200 hover:bg-notion-gray-200',
    highlight: 'bg-tb-yellow bg-opacity-20 text-tb-black border-tb-yellow hover:bg-opacity-30',
    outline: 'bg-transparent text-text-secondary border-notion-gray-400 hover:bg-notion-gray-50'
  };
  
  // 비활성화된 경우 스타일
  const disabledStyle = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  return (
    <button 
      className={`inline-flex items-center justify-center rounded-md border transition-colors duration-200
      ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyle} ${className}`}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
    >
      <span>{text}</span>
      {count !== undefined && (
        <span className="ml-1.5 opacity-70 text-xs">{count}</span>
      )}
    </button>
  );
}
