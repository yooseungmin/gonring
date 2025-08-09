'use client';

import { Editor } from '@tiptap/react';
import React from 'react';
import { ImageUploadButton } from './ImageUploadButton';

interface EditorMenuBarProps {
  editor: Editor | null;
}

export const EditorMenuBar: React.FC<EditorMenuBarProps> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  // 현재 선택된 항목에 따라 활성화 클래스 지정
  const getButtonClass = (isActive: boolean) => {
    return `p-2 rounded-md ${
      isActive 
        ? 'bg-blue-100 text-blue-700' 
        : 'text-gray-600 hover:bg-gray-100'
    }`;
  };

  return (
    <div className="editor-menu-bar border-b p-1 mb-2 flex flex-wrap gap-1 bg-gray-50 rounded-t-md">
      {/* 제목 스타일 */}
      <div className="flex mr-2">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={getButtonClass(editor.isActive('heading', { level: 1 }))}
          title="제목 1"
        >
          <span className="font-bold text-lg">H1</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={getButtonClass(editor.isActive('heading', { level: 2 }))}
          title="제목 2"
        >
          <span className="font-bold">H2</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={getButtonClass(editor.isActive('heading', { level: 3 }))}
          title="제목 3"
        >
          <span className="font-semibold">H3</span>
        </button>
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={getButtonClass(editor.isActive('paragraph'))}
          title="본문"
        >
          <span>P</span>
        </button>
      </div>

      <div className="border-r border-gray-300 h-8 mx-1"></div>

      {/* 텍스트 스타일링 */}
      <div className="flex mr-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={getButtonClass(editor.isActive('bold'))}
          title="굵게"
        >
          <span className="font-bold">B</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={getButtonClass(editor.isActive('italic'))}
          title="기울임"
        >
          <span className="italic">I</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={getButtonClass(editor.isActive('highlight'))}
          title="강조"
        >
          <span className="bg-yellow-200 px-1">H</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={getButtonClass(editor.isActive('strike'))}
          title="취소선"
        >
          <span className="line-through">S</span>
        </button>
      </div>

      <div className="border-r border-gray-300 h-8 mx-1"></div>

      {/* 리스트 */}
      <div className="flex mr-2">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={getButtonClass(editor.isActive('bulletList'))}
          title="글머리 기호"
        >
          • 목록
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={getButtonClass(editor.isActive('orderedList'))}
          title="번호 매기기"
        >
          1. 목록
        </button>
      </div>

      <div className="border-r border-gray-300 h-8 mx-1"></div>

      {/* 링크 */}
      <div className="flex mr-2">
        <button
          onClick={() => {
            const url = window.prompt('URL을 입력하세요:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={getButtonClass(editor.isActive('link'))}
          title="링크"
        >
          링크
        </button>
        {editor.isActive('link') && (
          <button
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="p-2 text-red-600 hover:bg-red-100 rounded-md"
            title="링크 제거"
          >
            링크 제거
          </button>
        )}
      </div>

      <div className="border-r border-gray-300 h-8 mx-1"></div>

      {/* 이미지 업로드 */}
      <div className="flex mr-2">
        <ImageUploadButton editor={editor} />
      </div>

      <div className="border-r border-gray-300 h-8 mx-1"></div>

      {/* 기타 도구 */}
      <div className="flex">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
          title="실행 취소"
          disabled={!editor.can().undo()}
        >
          ↩️
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
          title="다시 실행"
          disabled={!editor.can().redo()}
        >
          ↪️
        </button>
      </div>
    </div>
  );
};
