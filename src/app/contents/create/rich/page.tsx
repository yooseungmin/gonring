'use client';

import { useState, useEffect } from 'react';
import { TagRecommender } from '../../../../components/tag/TagRecommender';
import { TagManager } from '../../../../components/tag/TagManager';
import { EditorMenuBar } from '../../../../components/editor/EditorMenuBar';

// 에디터 관련 컴포넌트 임포트
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';

export default function RichContentCreationPage() {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'저장됨' | '저장 중...' | '자동 저장 실패'>('저장됨');

  // 로컬 스토리지에서 임시 저장 데이터 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('rich_content_draft');
      if (savedData) {
        try {
          const { title, content, tags } = JSON.parse(savedData);
          setTitle(title || '');
          setEditorContent(content || '');
          setTags(tags || []);
        } catch (e) {
          console.error('임시 저장 데이터 불러오기 실패:', e);
        }
      }
    }
  }, []);

  // TipTap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '내용을 입력하세요...',
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Image,
      Link,
      Highlight,
    ],
    content: editorContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setEditorContent(html);
      
      // 자동 저장 처리
      autoSaveContent(title, html, tags);
    },
    editorProps: {
      attributes: {
        class: 'prose focus:outline-none max-w-full',
      }
    },
    // SSR 오류를 방지하기 위한 설정
    immediatelyRender: false,
  });
  
  // 자동 저장 함수
  const autoSaveContent = (currentTitle: string, currentContent: string, currentTags: string[]) => {
    if (typeof window === 'undefined') return;
    
    setAutoSaveStatus('저장 중...');
    
    try {
      localStorage.setItem('rich_content_draft', JSON.stringify({
        title: currentTitle,
        content: currentContent,
        tags: currentTags,
        lastSaved: new Date().toISOString()
      }));
      
      // 저장 상태 표시
      setAutoSaveStatus('저장됨');
    } catch (e) {
      console.error('자동 저장 실패:', e);
      setAutoSaveStatus('자동 저장 실패');
    }
  };
  
  // 제목이 변경될 때 자동 저장
  useEffect(() => {
    if (title) {
      autoSaveContent(title, editorContent, tags);
    }
  }, [title]);
  
  // 태그가 변경될 때 자동 저장
  useEffect(() => {
    if (tags.length > 0) {
      autoSaveContent(title, editorContent, tags);
    }
  }, [tags]);

  // 태그 추가 처리
  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  // 태그 삭제 처리
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // 콘텐츠 저장 처리
  const handleSave = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!editorContent.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    // 태그가 부족한 경우 경고
    if (tags.length < 2) {
      const confirmSave = window.confirm('태그가 2개 미만입니다. 태그를 추가하면 검색과 분류가 더 쉬워집니다. 그래도 저장하시겠습니까?');
      if (!confirmSave) return;
    }

    setIsSaving(true);

    try {
      // API 호출 로직 구현
      // const response = await api.createContent({
      //   title,
      //   content: editorContent,
      //   tags
      // });
      
      // 저장 성공 시 메시지 표시
      alert('콘텐츠가 성공적으로 저장되었습니다.');
      
      // 페이지 초기화 또는 리디렉션
    } catch (error) {
      console.error('콘텐츠 저장 중 오류 발생:', error);
      alert('콘텐츠 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">새 콘텐츠 작성</h1>
      
      {/* 제목 입력 */}
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">제목</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="제목을 입력하세요"
        />
      </div>
      
      {/* 에디터 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
        <div className="border rounded-md overflow-hidden">
          {!editor ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <EditorMenuBar editor={editor} />
              <div className="p-4 min-h-[300px]">
                <EditorContent editor={editor} />
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* 태그 추천 */}
      <div className="mb-4">
        <TagRecommender 
          content={editorContent} 
          maxTags={15}
          onTagSelect={handleAddTag}
          selectedTags={tags}
        />
      </div>
      
      {/* 태그 관리 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">태그</label>
        <TagManager
          tags={tags}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          maxTags={10}
          placeholder="태그 입력 후 Enter"
        />
        <p className="text-xs text-gray-500 mt-1">최대 10개까지 태그를 추가할 수 있습니다.</p>
      </div>
      
      {/* 저장 버튼 */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-500">
          {autoSaveStatus === '저장됨' && (
            <span className="flex items-center text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              자동 저장됨
            </span>
          )}
          {autoSaveStatus === '저장 중...' && (
            <span className="flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500 mr-1"></div>
              자동 저장 중...
            </span>
          )}
          {autoSaveStatus === '자동 저장 실패' && (
            <span className="flex items-center text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              자동 저장 실패
            </span>
          )}
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={() => {
              if (window.confirm('작성 중인 내용이 저장되지 않습니다. 정말 취소하시겠습니까?')) {
                // 취소 로직 (예: 목록 페이지로 이동)
                window.history.back();
              }
            }}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                저장 중...
              </>
            ) : (
              '저장하기'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
