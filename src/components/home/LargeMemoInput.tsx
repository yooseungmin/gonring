'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Image, X, Loader2 } from 'lucide-react';
import BrandButton from '@/components/brand/BrandButton';

interface LargeMemoInputProps {
  placeholder?: string;
  initialValue?: string;
  onSubmit?: (value: string) => void;
  onVoiceInput?: () => void;
  isLoading?: boolean;
  className?: string;
  showImageUpload?: boolean;
  autoFocus?: boolean;
}

export default function LargeMemoInput({
  placeholder = '오늘 배운 내용을 기록하세요',
  initialValue = '',
  onSubmit,
  onVoiceInput,
  isLoading = false,
  className = '',
  showImageUpload = false,
  autoFocus = false
}: LargeMemoInputProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // 입력창 높이 자동 조절
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && onSubmit && !isLoading) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 한글 입력 중인지 확인 (isComposing이 true면 한글 조합 중)
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return; // 한글 조합 중이면 무시
    }
    
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 이미지 업로드 처리는 실제 구현 시 추가
    console.log(e.target.files);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`bg-white rounded-md shadow-lg p-3 ${className}`}>
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full min-h-[100px] resize-none border border-notion-gray-200 rounded-md p-4 focus:outline-none focus:ring-2 focus:ring-tb-yellow text-notion-black"
          disabled={isLoading}
        />
        {value && !isLoading && (
          <button
            onClick={() => setValue('')}
            className="absolute top-2 right-2 text-notion-gray-500 hover:text-notion-gray-700 p-1 rounded-full"
            aria-label="내용 지우기"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex justify-between items-center mt-3">
        <div className="flex space-x-2">
          <button
            onClick={onVoiceInput}
            className="p-2 rounded-full text-notion-gray-700 hover:bg-notion-gray-100 transition-colors"
            aria-label="음성 입력"
          >
            <Mic size={20} />
          </button>
          {showImageUpload && (
            <>
              <button
                onClick={handleImageClick}
                className="p-2 rounded-full text-notion-gray-700 hover:bg-notion-gray-100 transition-colors"
                aria-label="이미지 첨부"
              >
                <Image size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </>
          )}
        </div>

        <BrandButton
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          size="small"
          className="bg-tb-yellow hover:bg-tb-yellow-dark"
          icon={isLoading ? Loader2 : Send}
        >
          {isLoading ? '처리 중...' : '기록하기'}
        </BrandButton>
      </div>
    </div>
  );
}
