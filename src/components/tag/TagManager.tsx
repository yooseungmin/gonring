'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface TagManagerProps {
  tags: string[];
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
}

export function TagManager({
  tags = [],
  onAddTag,
  onRemoveTag,
  placeholder = '태그 입력...',
  maxTags = 10,
  className = '',
  disabled = false
}: TagManagerProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = () => {
    const tag = inputValue.trim().toLowerCase();
    if (!tag) return;
    
    if (tags.includes(tag)) {
      // 이미 존재하는 태그
      setInputValue('');
      return;
    }
    
    if (tags.length >= maxTags) {
      // 최대 태그 수 초과
      return;
    }
    
    if (onAddTag) {
      onAddTag(tag);
    }
    
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // 입력값이 없고 백스페이스를 누르면 마지막 태그 삭제
      if (onRemoveTag) {
        onRemoveTag(tags[tags.length - 1]);
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (onRemoveTag) {
      onRemoveTag(tag);
    }
  };

  return (
    <div className={`tag-manager ${className}`}>
      <div className="flex flex-wrap gap-2 p-2 border border-notion-gray-200 rounded-md bg-white shadow-sm">
        {tags.map((tag) => (
          <div 
            key={tag}
            className="flex items-center bg-notion-blue bg-opacity-10 text-notion-blue px-2 py-1 rounded-md text-sm border border-notion-blue border-opacity-20"
          >
            <span className="font-light">{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 text-notion-blue opacity-70 hover:opacity-100 transition-opacity duration-fast"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        
        {!disabled && tags.length < maxTags && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 outline-none min-w-[120px] text-sm font-light text-notion-black placeholder:text-notion-gray-500"
          />
        )}
        
        {!disabled && inputValue && (
          <button
            type="button"
            onClick={handleAddTag}
            className="p-1 text-notion-blue opacity-80 hover:opacity-100 transition-opacity duration-fast"
          >
            <Plus size={16} />
          </button>
        )}
        
        {tags.length >= maxTags && (
          <span className="text-xs text-notion-gray-500 ml-2 font-light">
            최대 {maxTags}개까지 태그를 추가할 수 있습니다.
          </span>
        )}
      </div>
    </div>
  );
}
