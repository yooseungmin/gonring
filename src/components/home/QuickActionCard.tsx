'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface QuickActionCardProps {
  icon: string;
  title: string;
  description: string;
  action: string;
  color?: 'yellow' | 'blue' | 'green' | 'purple';
  className?: string;
}

export default function QuickActionCard({
  icon,
  title,
  description,
  action,
  color = 'yellow',
  className = '',
}: QuickActionCardProps) {
  // 색상 변형 스타일
  const colorStyles = {
    yellow: 'border-l-tb-yellow bg-tb-yellow bg-opacity-5 hover:bg-opacity-10',
    blue: 'border-l-tb-blue bg-tb-blue bg-opacity-5 hover:bg-opacity-10',
    green: 'border-l-notion-green bg-notion-green bg-opacity-5 hover:bg-opacity-10',
    purple: 'border-l-purple-500 bg-purple-500 bg-opacity-5 hover:bg-opacity-10',
  };

  return (
    <Link 
      href={action}
      className={`
        flex flex-col p-5 rounded-md border border-notion-gray-200
        border-l-4 shadow-sm transition-all duration-200 
        ${colorStyles[color]} ${className}
      `}
    >
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-3">{icon}</span>
        <h3 className="font-normal text-lg text-notion-black">{title}</h3>
      </div>
      <p className="text-sm text-notion-gray-700 mb-3">{description}</p>
      <div className="mt-auto">
        <span className="inline-flex items-center text-sm font-medium text-notion-black">
          바로 시작하기 <ArrowRight size={14} className="ml-1" />
        </span>
      </div>
    </Link>
  );
}
