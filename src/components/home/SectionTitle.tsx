'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface SectionTitleProps {
  title: string;
  viewAllLink?: string;
  viewAllText?: string;
  className?: string;
}

export default function SectionTitle({
  title,
  viewAllLink,
  viewAllText = '모두 보기',
  className = '',
}: SectionTitleProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <h2 className="text-xl font-light text-notion-black">{title}</h2>
      
      {viewAllLink && (
        <Link 
          href={viewAllLink} 
          className="text-notion-blue hover:underline text-sm flex items-center transition-all duration-fast"
        >
          {viewAllText} <ArrowRight size={14} className="ml-1" />
        </Link>
      )}
    </div>
  );
}
