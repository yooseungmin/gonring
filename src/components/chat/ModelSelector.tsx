'use client';

import React from 'react';
import { Bot } from 'lucide-react';

export type LLMModel = 'gpt-4' | 'claude' | 'gemini';

interface ModelOption {
  id: LLMModel;
  name: string;
  description: string;
  icon?: React.ReactNode;
}

interface ModelSelectorProps {
  selectedModel: LLMModel;
  onSelect: (model: LLMModel) => void;
  className?: string;
}

export default function ModelSelector({
  selectedModel,
  onSelect,
  className = ''
}: ModelSelectorProps) {
  // 모델 옵션 정의
  const modelOptions: ModelOption[] = [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      description: 'OpenAI의 최신 LLM',
      icon: <Bot className="text-green-600" />
    },
    {
      id: 'claude',
      name: 'Claude',
      description: 'Anthropic의 정확한 언어 모델',
      icon: <Bot className="text-purple-600" />
    },
    {
      id: 'gemini',
      name: 'Gemini',
      description: 'Google의 강력한 다중 모달 모델',
      icon: <Bot className="text-blue-600" />
    }
  ];

  return (
    <div className={`bg-white rounded-md ${className}`}>
      <div className="flex space-x-1 p-1 bg-notion-gray-50 rounded-md">
        {modelOptions.map((model) => (
          <button
            key={model.id}
            onClick={() => onSelect(model.id)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors
              ${selectedModel === model.id 
                ? 'bg-white shadow-sm text-notion-black' 
                : 'text-notion-gray-700 hover:bg-notion-gray-100'}`
            }
          >
            <div className="flex items-center justify-center">
              {model.icon && <span className="mr-1">{model.icon}</span>}
              <span>{model.name}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-2 text-xs text-center text-notion-gray-700">
        {modelOptions.find(m => m.id === selectedModel)?.description}
      </div>
    </div>
  );
}
