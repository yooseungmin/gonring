'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

interface UseCaseStepProps {
  text: string;
  isLast?: boolean;
}

function UseCaseStep({ text, isLast = false }: UseCaseStepProps) {
  return (
    <div className="flex items-center">
      <div className="bg-white p-2 rounded-md border border-notion-gray-200 shadow-sm">
        <span className="text-sm">{text}</span>
      </div>
      
      {!isLast && (
        <div className="mx-2">
          <ArrowRight size={16} className="text-notion-gray-500" />
        </div>
      )}
    </div>
  );
}

interface UseCaseExampleProps {
  title: string;
  example?: string;
  steps?: string[];
  icon?: string;
  className?: string;
  color?: 'yellow' | 'blue' | 'green' | 'purple' | 'default';
}

export default function UseCaseExample({
  title,
  example,
  steps,
  icon,
  className = '',
  color = 'default'
}: UseCaseExampleProps) {
  // Convert the example string into steps if not provided
  const processedSteps = steps || (example ? example.split('→').map(step => step.trim()) : []);
  
  // Background colors based on the color prop
  const bgColors = {
    yellow: 'bg-yellow-50 border-yellow-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    default: 'bg-white border-notion-gray-200'
  };

  return (
    <div className={`
      ${bgColors[color]} rounded-md p-4
      shadow-sm hover:shadow-md transition-all duration-200
      ${className}
    `}>
      <div className="flex items-center mb-3">
        {icon && <span className="text-xl mr-2">{icon}</span>}
        <h3 className="text-md font-medium text-notion-black">{title}</h3>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        {processedSteps.map((step, index) => (
          <UseCaseStep 
            key={index} 
            text={step} 
            isLast={index === processedSteps.length - 1} 
          />
        ))}
      </div>
    </div>
  );
}
