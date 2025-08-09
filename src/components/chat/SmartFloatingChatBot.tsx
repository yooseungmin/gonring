'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Settings, Tag, Box, ChevronDown, ChevronUp } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { TagCloudItem } from '@/lib/searchApi';
import { Box as BoxType } from './BoxSelector';
import { LLMModel } from './ModelSelector';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatContext {
  selectedBox: BoxType | null;
  selectedTags: string[];
  conversationHistory: Message[];
}

interface SmartFloatingChatBotProps {
  position?: 'fixed' | 'absolute';
  theme?: 'light' | 'dark';
  size?: 'small' | 'normal' | 'large';
  zIndex?: number;
  boxes?: BoxType[];
  tags?: TagCloudItem[];
  onQuery?: (query: string, context: ChatContext) => void;
  className?: string;
  title?: string;
}

export default function SmartFloatingChatBot({
  position = 'fixed',
  theme = 'light',
  size = 'normal',
  zIndex = 50,
  boxes = [],
  tags = [],
  onQuery,
  className = '',
  title = 'TaggingBox 챗봇'
}: SmartFloatingChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBox, setSelectedBox] = useState<BoxType | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const chatbotRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 사이즈 스타일
  const sizeStyles = {
    small: 'w-72 h-96',
    normal: 'w-80 h-[450px]',
    large: 'w-96 h-[500px]'
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

  // 설정 패널 토글
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // 박스 선택 처리
  const handleBoxSelect = (box: BoxType | null) => {
    setSelectedBox(box);
  };

  // 태그 선택 토글
  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
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
        // 컨텍스트 구성
        const context: ChatContext = {
          selectedBox,
          selectedTags,
          conversationHistory: [...messages, userMessage]
        };
        
        await onQuery(input, context);
        
        // 예시 응답 (실제로는 서버 응답으로 대체)
        setTimeout(() => {
          const contextInfo = [];
          if (selectedBox) contextInfo.push(`박스: ${selectedBox.name}`);
          if (selectedTags.length > 0) contextInfo.push(`태그: ${selectedTags.join(', ')}`);
          
          const contextMessage = contextInfo.length > 0 
            ? `\n\n(${contextInfo.join(', ')} 컨텍스트 기반 응답)` 
            : '';
          
          const botResponse: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: `안녕하세요! "${input}"에 대한 답변입니다. 도움이 필요하시면 언제든지 물어보세요.${contextMessage}`,
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
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleSettings}
                className="p-1 rounded-full hover:bg-yellow-200 transition-colors"
                aria-label="설정"
              >
                <Settings size={14} />
              </button>
              <button
                onClick={toggleChat}
                className="p-1 rounded-full hover:bg-yellow-200 transition-colors"
                aria-label="닫기"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          {/* 설정 패널 */}
          {showSettings && (
            <div className="p-2 border-b border-inherit">
              {/* 박스 선택 */}
              <div className="mb-2">
                <label className="text-xs font-medium mb-1 flex items-center">
                  <Box size={12} className="mr-1" /> 지식 박스 선택
                </label>
                <select 
                  className="w-full text-sm p-1 border rounded bg-transparent"
                  value={selectedBox?.id || ''}
                  onChange={(e) => {
                    const boxId = e.target.value;
                    const box = boxes.find(b => b.id === boxId) || null;
                    handleBoxSelect(box);
                  }}
                >
                  <option value="">선택 안함</option>
                  {boxes.map(box => (
                    <option key={box.id} value={box.id}>
                      {box.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* 태그 선택 */}
              <div>
                <label className="text-xs font-medium mb-1 flex items-center">
                  <Tag size={12} className="mr-1" /> 태그 선택 (최대 3개)
                </label>
                <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto">
                  {tags.length > 0 ? (
                    tags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.name)}
                        className={`text-xs px-2 py-1 rounded-full transition-colors ${
                          selectedTags.includes(tag.name)
                            ? 'bg-tb-yellow text-notion-black'
                            : theme === 'light' 
                              ? 'bg-notion-gray-100 text-notion-gray-700 hover:bg-notion-gray-200'
                              : 'bg-notion-gray-800 text-notion-gray-300 hover:bg-notion-gray-700'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-notion-gray-500">사용 가능한 태그가 없습니다</p>
                  )}
                </div>
              </div>
              
              {/* 선택된 태그 표시 */}
              {selectedTags.length > 0 && (
                <div className="mt-2 pt-2 border-t border-inherit">
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map(tag => (
                      <div key={tag} className="flex items-center text-xs px-2 py-1 bg-tb-yellow rounded-full text-notion-black">
                        {tag}
                        <button 
                          onClick={() => toggleTag(tag)}
                          className="ml-1 hover:text-red-600"
                          aria-label={`${tag} 태그 제거`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 메시지 영역 */}
          <div className="flex-1 p-3 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-notion-gray-500 text-center p-4">
                <MessageSquare size={24} className="mb-2 opacity-50" />
                <p className="text-sm">무엇이든 물어보세요!</p>
                <p className="text-xs mt-1">질문, 아이디어, 메모 등을 입력해주세요.</p>
                {(selectedBox || selectedTags.length > 0) && (
                  <div className="mt-3 text-xs p-2 bg-notion-gray-100 dark:bg-notion-gray-800 rounded-lg">
                    {selectedBox && <p>📦 {selectedBox.name}</p>}
                    {selectedTags.length > 0 && (
                      <p className="mt-1">🏷️ {selectedTags.join(', ')}</p>
                    )}
                  </div>
                )}
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
            
            {/* 컨텍스트 표시 */}
            {(selectedBox || selectedTags.length > 0) && (
              <div className="flex items-center text-xs text-notion-gray-500 mt-1 px-2">
                <span>
                  {selectedBox && `📦 ${selectedBox.name}`}
                  {selectedBox && selectedTags.length > 0 && ' • '}
                  {selectedTags.length > 0 && `🏷️ ${selectedTags.join(', ')}`}
                </span>
                <button 
                  onClick={toggleSettings}
                  className="ml-1 hover:text-tb-yellow"
                  aria-label="설정 변경"
                >
                  {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
