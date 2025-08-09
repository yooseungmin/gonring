'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { boxApi, contentApi, Content, Tag } from '@/lib/boxContentApi';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { ArrowLeft, Plus, X, Tag as TagIcon, Save } from 'lucide-react';

export default function EditContentPage({ params }: { params: { contentId: string } }) {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  
  const [title, setTitle] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [boxId, setBoxId] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 로그인 확인
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [authLoading, isLoggedIn, router]);
  
  // 콘텐츠 정보 로드
  useEffect(() => {
    if (isLoggedIn && params.contentId) {
      loadContentData();
    }
  }, [isLoggedIn, params.contentId]);
  
  const loadContentData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 콘텐츠 정보 가져오기
      const response = await contentApi.getContent(params.contentId);
      
      if (response.success && response.data) {
        const content = response.data;
        setTitle(content.title || '');
        setHtmlContent(content.html_content || '');
        if (content.box_id) {
          setBoxId(content.box_id);
        }
        if (content.tags) {
          setTags(content.tags);
        }
      } else {
        setError(response.message || '콘텐츠 정보를 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      console.error('콘텐츠 정보 로드 오류:', err);
      setError(err.message || '콘텐츠 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 태그 추천 요청
  const handleRecommendTags = async () => {
    if (!title && !htmlContent) return;
    
    try {
      const response = await contentApi.recommendTags({
        title: title,
        text_content: htmlContent.replace(/<[^>]*>/g, '') // HTML 태그 제거
      });
      
      if (response.success && response.data) {
        // 이미 추가된 태그는 제외
        const existingTagIds = tags.map(tag => tag.id);
        const newSuggestions = response.data.filter(
          tag => !existingTagIds.includes(tag.id)
        );
        setTagSuggestions(newSuggestions);
      }
    } catch (err) {
      console.error('태그 추천 오류:', err);
    }
  };
  
  // 태그 추가
  const addTag = (tag?: Tag) => {
    if (tag) {
      // 기존 태그 목록에 없는 경우만 추가
      if (!tags.some(t => t.id === tag.id)) {
        setTags([...tags, tag]);
      }
      // 추천 목록에서 제거
      setTagSuggestions(tagSuggestions.filter(t => t.id !== tag.id));
    } else if (newTag.trim()) {
      // 새 태그 추가 (ID는 임시로 생성)
      const tempTag: Tag = {
        id: `temp-${Date.now()}`,
        name: newTag.trim(),
        created_at: new Date().toISOString()
      };
      setTags([...tags, tempTag]);
      setNewTag('');
    }
  };
  
  // 태그 제거
  const removeTag = (tagId: string) => {
    setTags(tags.filter(tag => tag.id !== tagId));
  };
  
  // 콘텐츠 저장
  const handleSave = async () => {
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const contentData = {
        title: title,
        html_content: htmlContent,
        box_id: boxId,
        tags: tags.map(tag => tag.name) // 백엔드에서는 태그 이름만 받음
      };
      
      const response = await contentApi.updateContent(params.contentId, contentData);
      
      if (response.success) {
        router.push(`/contents/${params.contentId}`);
      } else {
        setError(response.message || '콘텐츠 저장에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('콘텐츠 저장 오류:', err);
      setError(err.message || '콘텐츠 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 상단 버튼 */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => router.push(`/contents/${params.contentId}`)}
          className="flex items-center text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft size={16} className="mr-1" />
          콘텐츠로 돌아가기
        </button>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center px-4 py-2 rounded-lg ${
            isSaving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              저장 중...
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              변경사항 저장
            </>
          )}
        </button>
      </div>
      
      {/* 오류 메시지 */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {/* 제목 입력 */}
      <div className="mb-6">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          제목
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="콘텐츠 제목을 입력하세요"
        />
      </div>
      
            {/* 에디터 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                내용
              </label>
              <RichTextEditor
                initialContent={htmlContent}
                onChange={setHtmlContent}
                placeholder="콘텐츠 내용을 입력하세요..."
                className="min-h-[300px]"
              />
            </div>      {/* 태그 관리 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            태그
          </label>
          <button
            onClick={handleRecommendTags}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            태그 추천 받기
          </button>
        </div>
        
        {/* 태그 입력 */}
        <div className="flex mb-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            className="flex-grow p-2 border border-gray-300 rounded-l-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="새 태그 입력"
          />
          <button
            onClick={() => addTag()}
            className="bg-blue-600 text-white px-4 rounded-r-lg hover:bg-blue-700"
          >
            <Plus size={16} />
          </button>
        </div>
        
        {/* 현재 태그 목록 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                <TagIcon size={14} className="mr-1" />
                <span>{tag.name}</span>
                <button
                  onClick={() => removeTag(tag.id)}
                  className="ml-1 text-blue-800 hover:text-blue-900"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* 태그 추천 결과 */}
        {tagSuggestions.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-2">추천 태그:</p>
            <div className="flex flex-wrap gap-2">
              {tagSuggestions.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => addTag(tag)}
                  className="flex items-center bg-gray-100 hover:bg-blue-50 text-gray-800 px-3 py-1 rounded-full text-sm"
                >
                  <Plus size={14} className="mr-1" />
                  <span>{tag.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
