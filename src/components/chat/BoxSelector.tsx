'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box as BoxIcon, ChevronDown, PlusCircle, FolderOpen, Check } from 'lucide-react';

export interface Box {
  id: string;
  name: string;
  description?: string;
  contentCount?: number;
}

interface BoxSelectorProps {
  boxes: Box[];
  selectedBox?: Box | null;
  onSelect: (box: Box) => void;
  onCreateNew?: () => void;
  className?: string;
  placeholder?: string;
}

export default function BoxSelector({
  boxes,
  selectedBox,
  onSelect,
  onCreateNew,
  className = '',
  placeholder = '박스 선택'
}: BoxSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 박스 필터링
  const filteredBoxes = searchTerm
    ? boxes.filter(box => 
        box.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (box.description && box.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : boxes;

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 박스 선택 처리
  const handleSelectBox = (box: Box) => {
    onSelect(box);
    setIsOpen(false);
    setSearchTerm('');
  };

  // 새 박스 생성 처리
  const handleCreateNew = () => {
    if (onCreateNew) {
      setIsOpen(false);
      onCreateNew();
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 border border-notion-gray-200 rounded-md bg-white hover:border-notion-gray-300 transition-colors"
      >
        <div className="flex items-center">
          <BoxIcon size={18} className="text-notion-gray-700 mr-2" />
          <span className="text-notion-black">
            {selectedBox ? selectedBox.name : placeholder}
          </span>
        </div>
        <ChevronDown size={16} className={`text-notion-gray-700 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-notion-gray-200 rounded-md shadow-lg z-10 max-h-80 overflow-y-auto">
          <div className="p-2 border-b border-notion-gray-200">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="박스 검색..."
              className="w-full p-2 border border-notion-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-tb-yellow"
            />
          </div>

          {filteredBoxes.length > 0 ? (
            <div className="py-2">
              {filteredBoxes.map((box) => (
                <button
                  key={box.id}
                  onClick={() => handleSelectBox(box)}
                  className={`w-full flex items-center justify-between px-3 py-2 hover:bg-notion-gray-50 transition-colors ${
                    selectedBox?.id === box.id ? 'bg-tb-yellow bg-opacity-10' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <FolderOpen size={16} className="text-notion-gray-700 mr-2" />
                    <div className="text-left">
                      <p className="text-notion-black">{box.name}</p>
                      {box.contentCount !== undefined && (
                        <p className="text-xs text-notion-gray-700">{box.contentCount}개 콘텐츠</p>
                      )}
                    </div>
                  </div>
                  {selectedBox?.id === box.id && (
                    <Check size={16} className="text-tb-yellow" />
                  )}
                </button>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="py-4 text-center text-notion-gray-700">
              검색 결과가 없습니다
            </div>
          ) : (
            <div className="py-4 text-center text-notion-gray-700">
              박스가 없습니다
            </div>
          )}

          {onCreateNew && (
            <button
              onClick={handleCreateNew}
              className="w-full flex items-center px-3 py-2 border-t border-notion-gray-200 hover:bg-notion-gray-50 text-tb-blue"
            >
              <PlusCircle size={16} className="mr-2" />
              새 박스 만들기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
