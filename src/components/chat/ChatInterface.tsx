'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, Bot, Send, Copy, Check, Loader2 } from 'lucide-react';
import { LLMModel } from './ModelSelector';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatContext {
  selectedBox: { id: string; name: string } | null;
  selectedModel: LLMModel;
  selectedTags: string[];
  conversationHistory: Message[];
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  className?: string;
  context?: ChatContext;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  className = '',
  context
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 메시지 목록 스크롤 자동 조정
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 입력창 높이 자동 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // 메시지 전송
  const handleSendMessage = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  // 엔터 키로 전송
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 텍스트 복사
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    
    // 2초 후 복사 상태 초기화
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // 상태 메시지 생성
  const renderContextMessage = () => {
    if (!context || !context.selectedBox) return null;
    
    const boxInfo = context.selectedBox ? `${context.selectedBox.name} 박스` : '선택된 박스 없음';
    const modelInfo = `${context.selectedModel} 모델`;
    const tagInfo = context.selectedTags.length > 0 
      ? `태그: ${context.selectedTags.join(', ')}` 
      : '선택된 태그 없음';
    
    return (
      <div className="px-4 py-2 mb-4 bg-notion-gray-50 rounded-md text-xs text-notion-gray-700">
        <p>현재 컨텍스트: {boxInfo}, {modelInfo}</p>
        <p>{tagInfo}</p>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-md shadow-sm ${className}`}>
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {renderContextMessage()}
        
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-notion-gray-700">
            <Bot size={32} className="mb-2 text-tb-yellow" />
            <p className="text-center">
              선택한 박스와 태그 기반으로 질문해보세요.<br />
              개인화된 답변을 제공합니다.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`relative max-w-[80%] p-3 rounded-lg
                  ${msg.role === 'user' 
                    ? 'bg-tb-yellow bg-opacity-20 text-notion-black' 
                    : 'bg-notion-gray-50 text-notion-black'}`
                }
              >
                <div className="flex items-start mb-1">
                  <div className={`p-1 rounded-full mr-2 
                    ${msg.role === 'user' ? 'bg-tb-yellow' : 'bg-notion-gray-200'}`}
                  >
                    {msg.role === 'user' 
                      ? <User size={12} className="text-white" /> 
                      : <Bot size={12} className="text-notion-gray-700" />
                    }
                  </div>
                  <div className="text-xs text-notion-gray-700">
                    {msg.role === 'user' ? '사용자' : '어시스턴트'}
                  </div>
                  <div className="text-xs text-notion-gray-500 ml-auto">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <div className="whitespace-pre-wrap text-sm">
                  {msg.content}
                </div>
                
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => copyToClipboard(msg.content, msg.id)}
                    className="absolute top-2 right-2 p-1 text-notion-gray-500 hover:text-notion-gray-700 rounded-full hover:bg-notion-gray-100"
                    aria-label="복사"
                  >
                    {copiedId === msg.id ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg bg-notion-gray-50">
              <div className="flex items-center space-x-2">
                <div className="p-1 rounded-full bg-notion-gray-200">
                  <Bot size={12} className="text-notion-gray-700" />
                </div>
                <Loader2 size={16} className="text-notion-gray-700 animate-spin" />
                <span className="text-sm text-notion-gray-700">생각 중...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* 입력 영역 */}
      <div className="border-t border-notion-gray-200 p-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="w-full resize-none border border-notion-gray-200 rounded-md p-3 pr-12 min-h-[44px] max-h-[150px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-tb-yellow"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 bottom-2 p-2 rounded-full 
              ${input.trim() && !isLoading 
                ? 'text-tb-yellow hover:bg-tb-yellow hover:bg-opacity-10' 
                : 'text-notion-gray-400 cursor-not-allowed'}`
            }
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-2 text-xs text-notion-gray-500 text-right">
          Enter 키로 전송, Shift+Enter로 줄바꿈
        </div>
      </div>
    </div>
  );
}
