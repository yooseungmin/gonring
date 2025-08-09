'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

interface UserJourneyStepProps {
  number: number;
  title: string;
  description: string;
  icon?: React.ReactNode;
  isLast?: boolean;
}

export function UserJourneyStep({
  number,
  title,
  description,
  icon,
  isLast = false
}: UserJourneyStepProps) {
  return (
    <div className="flex flex-col relative">
      {/* Step Number Badge */}
      <div className="flex items-center">
        <div className="w-8 h-8 rounded-full bg-tb-yellow flex items-center justify-center text-gray-800 font-medium text-sm z-10">
          {number}
        </div>
        
        {/* Connector Line */}
        {!isLast && (
          <div className="flex-1 mx-2">
            <ArrowRight className="text-tb-yellow" />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="mt-3">
        <h3 className="text-lg font-medium mb-1 flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </h3>
        <p className="text-notion-gray-700 text-sm">{description}</p>
      </div>
    </div>
  );
}

interface UserJourneySectionProps {
  title: string;
  description?: string;
  steps: {
    title: string;
    description: string;
    icon?: React.ReactNode;
  }[];
  className?: string;
}

export default function UserJourneySection({
  title,
  description,
  steps,
  className = ''
}: UserJourneySectionProps) {
  return (
    <div className={`bg-white border border-notion-gray-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-xl font-medium mb-2">{title}</h3>
      {description && <p className="text-notion-gray-700 mb-6">{description}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step, index) => (
          <UserJourneyStep
            key={index}
            number={index + 1}
            title={step.title}
            description={step.description}
            icon={step.icon}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
