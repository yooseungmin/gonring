'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import React, { useState } from 'react';
import { 
  Bold, Italic, List, ListOrdered, Link as LinkIcon, 
  Image as ImageIcon, Heading1, Heading2, Quote, 
  Code, Trash
} from 'lucide-react';

interface RichTextEditorProps {
  initialContent?: string;
  placeholder?: string;
  onChange: (html: string) => void;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  initialContent = '', 
  placeholder = '내용을 입력하세요...',
  onChange,
  className = ''
}) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none w-full max-w-full min-h-[200px] p-4',
        placeholder: placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  if (!editor) {
    return null;
  }

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link')
        .setLink({ href: linkUrl, target: '_blank' }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageInput(false);
    }
  };

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap items-center gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
          title="굵게"
        >
          <Bold size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
          title="기울임"
        >
          <Italic size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}`}
          title="제목 1"
        >
          <Heading1 size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
          title="제목 2"
        >
          <Heading2 size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
          title="글머리 기호 목록"
        >
          <List size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
          title="번호 매기기 목록"
        >
          <ListOrdered size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
          title="인용"
        >
          <Quote size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('codeBlock') ? 'bg-gray-200' : ''}`}
          title="코드 블록"
        >
          <Code size={18} />
        </button>
        <button
          onClick={() => setShowLinkInput(!showLinkInput)}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
          title="링크"
        >
          <LinkIcon size={18} />
        </button>
        <button
          onClick={() => setShowImageInput(!showImageInput)}
          className="p-2 rounded hover:bg-gray-200"
          title="이미지"
        >
          <ImageIcon size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          className="p-2 rounded hover:bg-gray-200"
          title="서식 지우기"
        >
          <Trash size={18} />
        </button>
      </div>

      {showLinkInput && (
        <div className="p-2 bg-gray-50 border-b border-gray-300 flex items-center">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="URL 입력 (https://...)"
            className="flex-grow p-2 border border-gray-300 rounded mr-2"
          />
          <button
            onClick={addLink}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            추가
          </button>
        </div>
      )}

      {showImageInput && (
        <div className="p-2 bg-gray-50 border-b border-gray-300 flex items-center">
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="이미지 URL 입력"
            className="flex-grow p-2 border border-gray-300 rounded mr-2"
          />
          <button
            onClick={addImage}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            추가
          </button>
        </div>
      )}

      {editor && (
        <EditorContent editor={editor} />
      )}
    </div>
  );
};

export default RichTextEditor;
