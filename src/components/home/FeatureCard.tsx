'use client';

import React, { ReactNode } from 'react';
import Image from 'next/image';

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: string | ReactNode;
  imageSrc?: string;
  className?: string;
  color?: 'yellow' | 'blue' | 'green' | 'purple' | 'default';
}

export default function FeatureCard({
  title,
  description,
  icon,
  imageSrc,
  className = '',
  color = 'default'
}: FeatureCardProps) {
  // Background colors based on the color prop
  const bgColors = {
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    default: 'bg-white border-notion-gray-200'
  };

  // Icon background colors
  const iconBgColors = {
    yellow: 'bg-yellow-100',
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    default: 'bg-notion-gray-100'
  };

  return (
    <div className={`
      ${bgColors[color]} rounded-md p-6
      shadow-sm hover:shadow-md transition-all duration-200
      ${className}
    `}>
      {icon && typeof icon === 'string' && (
        <div className={`text-3xl mb-4 w-12 h-12 rounded-full ${iconBgColors[color]} flex items-center justify-center`}>
          {icon}
        </div>
      )}
      
      {icon && typeof icon !== 'string' && (
        <div className={`mb-4 w-12 h-12 rounded-full ${iconBgColors[color]} flex items-center justify-center`}>
          {icon}
        </div>
      )}
      
      {imageSrc && (
        <div className="mb-4">
          <Image 
            src={imageSrc} 
            alt={title} 
            width={120} 
            height={80} 
            className="rounded-md object-cover"
          />
        </div>
      )}
      
      <h3 className="text-lg font-medium text-notion-black mb-2">{title}</h3>
      <p className="text-sm text-notion-gray-700">{description}</p>
    </div>
  );
}
