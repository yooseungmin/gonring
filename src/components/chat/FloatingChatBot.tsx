'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Minimize2, Maximize2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import BoxSelector, { Box } from './BoxSelector';
import ModelSelector, { LLMModel } from './ModelSelector';
import TagSelector from './TagSelector';
import ChatInterface, { Message, ChatContext } from './ChatInterface';
import { TagCloudItem } from '@/lib/searchApi';

interface FloatingChatBotProps {
  position?: 'fixed' | 'absolute';
  theme?: 'light' | 'dark' | 'auto';
  size?: 'compact' | 'normal' | 'large';
  zIndex?: number;
  boxes: Box[];
  tags: TagCloudItem[];
  onBoxSelect?: (boxId: string) => void;
  onModelSelect?: (model: LLMModel) => void;
  onTagSelect?: (tags: string[]) => void;
  onQuery?: (query: string, context: ChatContext) => void;
  className?: string;
}

export default function FloatingChatBot({
  position = 'fixed',
  theme = 'light',
  size = 'normal',
  zIndex = 50,
  boxes = [],
  tags = [],
  onBoxSelect,
  onModelSelect,
  onTagSelect,
  onQuery,
  className = ''
}: FloatingChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [selectedModel, setSelectedModel] = useState<LLMModel>('gpt-4');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const chatbotRef = useRef<HTMLDivElement>(null);

  // 크기에 따른 스타일
  const sizeStyles = {
    compact: 'w-80 h-96',
    normal: 'w-96 h-[500px]',
    large: 'w-[450px] h-[600px]'
  };

  // 위치 스타일
  const positionStyles = {
    fixed: 'fixed bottom-5 right-5',
    absolute: 'absolute bottom-5 right-5'
  };

  // 테마 스타일
  const themeStyles = {
    light: 'bg-white text-notion-black',
    dark: 'bg-notion-black text-white',
    auto: 'bg-white text-notion-black dark:bg-notion-black dark:text-white'
  };

  // 외부 클릭 시 채팅창 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatbotRef.current && !chatbotRef.current.contains(event.target as Node)) {
        // 열려있는 상태에서만 닫기 (버튼 클릭 시에는 닫지 않음)
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

  // 박스 선택 처리
  const handleBoxSelect = (box: Box) => {
    setSelectedBox(box);
    if (onBoxSelect) {
      onBoxSelect(box.id);
    }
  };

  // 모델 선택 처리
  const handleModelSelect = (model: LLMModel) => {
    setSelectedModel(model);
    if (onModelSelect) {
      onModelSelect(model);
    }
  };

  // 태그 선택 처리
  const handleTagSelect = (tags: string[]) => {
    setSelectedTags(tags);
    if (onTagSelect) {
      onTagSelect(tags);
    }
  };

  // 메시지 전송 처리
  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;
    
    // 현재 시간 기준 사용자 메시지 추가
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    if (onQuery) {
      try {
        // 채팅 컨텍스트 구성
        const context: ChatContext = {
          selectedBox,
          selectedModel,
          selectedTags,
          conversationHistory: [...messages, userMessage]
        };
        
        // 실제 구현에서는 서버에서 응답을 기다림
        await onQuery(message, context);
        
        // 예시 응답 (실제로는 서버 응답으로 대체)
        setTimeout(() => {
          const botResponse: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: `이것은 테스트 응답입니다. "${message}"에 대한 답변으로, ${selectedBox?.name || '선택된 박스 없음'} 박스의 컨텍스트와 ${selectedTags.join(', ') || '선택된 태그 없음'} 태그를 참고했습니다.`,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, botResponse]);
          setIsLoading(false);
        }, 1500);
        
      } catch (error) {
        console.error('메시지 처리 오류:', error);
        setIsLoading(false);
        
        // 오류 메시지 추가
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
          content: `이것은 테스트 응답입니다. "${message}"에 대한 답변입니다.`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botResponse]);
        setIsLoading(false);
      }, 1000);
    }
  };

  // 채팅창 초기화
  const resetChat = () => {
    setMessages([]);
    setSelectedTags([]);
    setSelectedBox(null);
  };

  // 채팅창 토글
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // 채팅창 확장/축소 토글
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div 
      ref={chatbotRef}
      className={`${positionStyles[position]} ${themeStyles[theme]} ${className}`}
      style={{ zIndex }}
    >
      {/* 채팅 버튼 */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="bg-tb-yellow text-notion-black rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200"
          aria-label="챗봇 열기"
        >
          <MessageSquare size={24} />
        </button>
      )}
      
      {/* 채팅 창 */}
      {isOpen && (
        <div className={`
          flex flex-col overflow-hidden rounded-lg shadow-xl border border-notion-gray-200
          ${sizeStyles[size]}
        `}>
          {/* 헤더 */}
          <div className="flex items-center justify-between p-3 bg-tb-yellow text-notion-black">
            <h3 className="font-medium">TaggingBox 챗봇</h3>
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleCollapse}
                className="p-1 rounded-full hover:bg-yellow-200 transition-colors"
                aria-label={isCollapsed ? "확장" : "최소화"}
              >
                {isCollapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
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
          
          {/* 내용 */}
          <div className={`flex-1 overflow-hidden ${isCollapsed ? 'hidden' : 'flex flex-col'}`}>
            {/* 설정 영역 */}
            <div className="p-3 border-b border-notion-gray-200 space-y-3">
              {/* 박스 선택기 */}
              <BoxSelector
                boxes={boxes}
                selectedBox={selectedBox}
                onSelect={handleBoxSelect}
                placeholder="박스 선택 (선택사항)"
              />
              
              {/* 모델 선택기 */}
              <ModelSelector
                selectedModel={selectedModel}
                onSelect={handleModelSelect}
              />
              
              {/* 태그 선택기 */}
              <TagSelector
                tags={tags}
                selectedTags={selectedTags}
                onSelect={handleTagSelect}
                maxSelected={5}
                maxVisibleTags={10}
              />
            </div>
            
            {/* 채팅 인터페이스 */}
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                context={{
                  selectedBox,
                  selectedModel,
                  selectedTags,
                  conversationHistory: messages
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
