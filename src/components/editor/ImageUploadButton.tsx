'use client';

import { Editor } from '@tiptap/react';
import React, { useRef } from 'react';

interface ImageUploadButtonProps {
  editor: Editor | null;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({ editor }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) {
    return null;
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        // 이미지를 에디터에 삽입
        editor.chain().focus().setImage({ src: result }).run();
      }
    };
    reader.readAsDataURL(file);
    
    // 파일 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <button
        onClick={openFileDialog}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
        title="이미지 업로드"
      >
        🖼️ 이미지
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
};
