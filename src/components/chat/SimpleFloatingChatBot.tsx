'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Paperclip } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { TagCloudItem } from '@/lib/searchApi';
import { Box } from './BoxSelector';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SimpleFloatingChatBotProps {
  position?: 'fixed' | 'absolute';
  theme?: 'light' | 'dark';
  size?: 'small' | 'normal';
  zIndex?: number;
  boxes?: Box[];
  tags?: TagCloudItem[];
  onQuery?: (query: string, context: any) => void;
  className?: string;
  title?: string;
}

export default function SimpleFloatingChatBot({
  position = 'fixed',
  theme = 'light',
  size = 'normal',
  zIndex = 50,
  boxes = [],
  tags = [],
  onQuery,
  className = '',
  title = 'TaggingBox 챗봇'
}: SimpleFloatingChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatbotRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 사이즈 스타일
  const sizeStyles = {
    small: 'w-72 h-96',
    normal: 'w-80 h-[450px]'
  };

  // 위치 스타일
  const positionStyles = {
    fixed: 'fixed bottom-5 right-5',
    absolute: 'absolute bottom-5 right-5'
  };

  // 테마 스타일
  const themeStyles = {
    light: 'bg-white text-notion-black border-notion-gray-200',
    dark: 'bg-notion-gray-900 text-white border-notion-gray-700'
  };

  // 스크롤 자동 조정
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 외부 클릭 시 챗봇 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatbotRef.current && !chatbotRef.current.contains(event.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 챗봇 열기/닫기
  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // 메시지 전송
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    if (onQuery) {
      try {
        // 간소화된 컨텍스트
        const context = {
          conversationHistory: [...messages, userMessage]
        };
        
        await onQuery(input, context);
        
        // 예시 응답 (실제로는 서버 응답으로 대체)
        setTimeout(() => {
          const botResponse: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: `안녕하세요! "${input}"에 대한 답변입니다. 도움이 필요하시면 언제든지 물어보세요.`,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, botResponse]);
          setIsLoading(false);
        }, 1000);
        
      } catch (error) {
        console.error('메시지 처리 오류:', error);
        setIsLoading(false);
        
        const errorMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: '죄송합니다. 요청을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } else {
      // onQuery가 없는 경우 더미 응답
      setTimeout(() => {
        const botResponse: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: `이것은 테스트 응답입니다. "${input}"에 대한 답변입니다.`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botResponse]);
        setIsLoading(false);
      }, 800);
    }
  };

  // 엔터키로 전송
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 한글 입력 중인지 확인 (isComposing이 true면 한글 조합 중)
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return; // 한글 조합 중이면 무시
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 입력창 자동 높이 조절
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div 
      ref={chatbotRef}
      className={`${positionStyles[position]} ${className}`}
      style={{ zIndex }}
    >
      {/* 채팅 버튼 */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="bg-tb-yellow text-notion-black rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200"
          aria-label="챗봇 열기"
        >
          <MessageSquare size={22} />
        </button>
      )}
      
      {/* 채팅 창 */}
      {isOpen && (
        <div className={`
          flex flex-col overflow-hidden rounded-lg shadow-xl border
          ${sizeStyles[size]} ${themeStyles[theme]}
        `}>
          {/* 헤더 */}
          <div className="flex items-center justify-between p-2 bg-tb-yellow text-notion-black">
            <h3 className="text-sm font-medium">{title}</h3>
            <button
              onClick={toggleChat}
              className="p-1 rounded-full hover:bg-yellow-200 transition-colors"
              aria-label="닫기"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* 메시지 영역 */}
          <div className="flex-1 p-3 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-notion-gray-500 text-center p-4">
                <MessageSquare size={24} className="mb-2 opacity-50" />
                <p className="text-sm">무엇이든 물어보세요!</p>
                <p className="text-xs mt-1">질문, 아이디어, 메모 등을 입력해주세요.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map(message => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] p-2 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-tb-yellow text-notion-black' 
                          : theme === 'light' ? 'bg-notion-gray-100' : 'bg-notion-gray-800'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className="text-right mt-1">
                        <span className="text-xs opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-notion-gray-100 p-2 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 rounded-full bg-notion-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-notion-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-notion-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          {/* 입력 영역 */}
          <div className="p-2 border-t border-inherit">
            <div className="flex items-end bg-notion-gray-50 dark:bg-notion-gray-800 rounded-lg overflow-hidden">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                className="flex-1 bg-transparent border-0 p-2 text-sm resize-none outline-none max-h-24"
                style={{ height: '36px' }}
                rows={1}
              />
              <div className="flex items-center p-1">
                <button
                  className="p-1 rounded-full text-notion-gray-500 hover:text-notion-blue transition-colors"
                  aria-label="파일 첨부"
                >
                  <Paperclip size={16} />
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className={`p-1 rounded-full transition-colors ${
                    input.trim() && !isLoading 
                      ? 'text-tb-yellow hover:text-yellow-600' 
                      : 'text-notion-gray-400'
                  }`}
                  aria-label="전송"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
