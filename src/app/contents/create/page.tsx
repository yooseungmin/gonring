'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { boxApi, contentApi, ContentCreate, TagCreate } from '@/lib/boxContentApi';
import { Pencil, X, Tag as TagIcon, Loader2 } from 'lucide-react';
import RichTextEditor from '@/components/editor/RichTextEditor';

export default function CreateContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boxId = searchParams.get('boxId');
  
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState<ContentCreate>({
    title: '',
    text_content: '',
    html_content: '',
    tags: []
  });
  
  const [boxInfo, setBoxInfo] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 태그 추천 상태
  const [tagInput, setTagInput] = useState('');
  const [recommendedTags, setRecommendedTags] = useState<TagCreate[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  
  // 로그인 확인
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [authLoading, isLoggedIn, router]);
  
  // Box ID 확인
  useEffect(() => {
    if (!boxId) {
      router.push('/boxes');
      return;
    }
    
    if (isLoggedIn) {
      loadBoxInfo();
    }
  }, [isLoggedIn, boxId]);
  
  // Box 정보 로드
  const loadBoxInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await boxApi.getBox(boxId!);
      
      if (response.success && response.data) {
        setBoxInfo({
          id: response.data.id,
          name: response.data.name
        });
      } else {
        setError(response.message || '박스 정보를 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      console.error('박스 정보 로드 오류:', err);
      setError(err.message || '박스 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 입력 값 변경 처리
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 컨텐츠가 변경될 때마다 태그 추천 (텍스트가 충분히 길 경우)
    if (name === 'text_content' && value.length > 50) {
      handleRecommendTags(value);
    }
  };
  
  // HTML 내용 변경 처리
  const handleHtmlChange = (html: string) => {
    // HTML 내용이 변경될 때 text_content도 함께 업데이트 (태그 제거)
    const textContent = html.replace(/<[^>]*>/g, '');
    
    setFormData(prev => ({
      ...prev,
      html_content: html,
      text_content: textContent
    }));
    
    // 내용이 충분히 길 경우 태그 추천
    if (textContent.length > 50) {
      handleRecommendTags(textContent);
    }
  };
  
  // 태그 추천 요청
  const handleRecommendTags = async (text: string) => {
    setIsRecommending(true);
    
    try {
      const response = await contentApi.recommendTags({
        text,
        count: 10,
        min_score: 0.5
      });
      
      if (response.success && response.data && response.data.tags) {
        setRecommendedTags(response.data.tags);
      }
    } catch (err) {
      console.error('태그 추천 오류:', err);
    } finally {
      setIsRecommending(false);
    }
  };
  
  // 태그 추가
  const addTag = (tag: TagCreate) => {
    // 이미 존재하는 태그인지 확인
    const exists = formData.tags?.some(t => t.name === tag.name);
    
    if (!exists) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag]
      }));
    }
    
    setTagInput('');
  };
  
  // 수동 태그 추가
  const handleAddTag = () => {
    if (tagInput.trim()) {
      addTag({ name: tagInput.trim() });
    }
  };
  
  // 태그 제거
  const removeTag = (tagName: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag.name !== tagName) || []
    }));
  };
  
  // 콘텐츠 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!boxId) {
      setError('박스 ID가 필요합니다.');
      return;
    }
    
    if (!formData.text_content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const response = await contentApi.createContent(boxId, formData);
      
      if (response.success && response.data) {
        // 생성 성공 시 Box 상세 페이지로 이동
        router.push(`/boxes/${boxId}`);
      } else {
        setError(response.message || '콘텐츠 생성에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('콘텐츠 생성 오류:', err);
      setError(err.message || '콘텐츠 생성 중 오류가 발생했습니다.');
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
  
  if (error && !boxInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">오류 발생</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/boxes')}
            className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200"
          >
            박스 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }
  
  if (!boxInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-700 mb-2">박스를 찾을 수 없습니다</h2>
          <p className="text-yellow-600 mb-4">요청하신 박스가 존재하지 않거나 접근 권한이 없습니다.</p>
          <button
            onClick={() => router.push('/boxes')}
            className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200"
          >
            박스 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">새 콘텐츠 추가</h1>
        <p className="text-gray-500">
          <span className="font-medium">{boxInfo.name}</span> 박스에 새 콘텐츠를 추가합니다.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            {/* 제목 입력 */}
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                제목 (선택사항)
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="제목을 입력하세요 (선택사항)"
              />
            </div>
            
            {/* 내용 입력 */}
            <div className="space-y-2">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                내용*
              </label>
              <RichTextEditor
                onChange={handleHtmlChange}
                className="min-h-[300px]"
              />
            </div>
            
            {/* 태그 섹션 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  태그
                </label>
                
                {/* 현재 태그 목록 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.tags && formData.tags.length > 0 ? (
                    formData.tags.map(tag => (
                      <div 
                        key={tag.name}
                        className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        <span>{tag.name}</span>
                        <button 
                          type="button"
                          onClick={() => removeTag(tag.name)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">태그가 없습니다. 아래에서 추가하세요.</p>
                  )}
                </div>
                
                {/* 태그 입력 */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="태그 입력"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200"
                  >
                    추가
                  </button>
                </div>
              </div>
              
              {/* 추천 태그 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">추천 태그</h3>
                  {isRecommending && (
                    <span className="flex items-center text-xs text-gray-500">
                      <Loader2 size={14} className="mr-1 animate-spin" />
                      태그 분석 중...
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {recommendedTags.length > 0 ? (
                    recommendedTags.map(tag => (
                      <button
                        key={tag.name}
                        type="button"
                        onClick={() => addTag(tag)}
                        className="flex items-center bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-3 py-1 rounded-full text-sm transition-colors"
                      >
                        <TagIcon size={14} className="mr-1" />
                        {tag.name}
                        {tag.score && <span className="ml-1 text-xs text-gray-500">({Math.round(tag.score * 100)}%)</span>}
                      </button>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">
                      {formData.text_content.length > 10 
                        ? '추천 태그가 없습니다. 더 많은 내용을 입력하세요.' 
                        : '내용을 입력하면 태그를 추천해드립니다.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push(`/boxes/${boxId}`)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg text-white ${
                isSaving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSaving ? '저장 중...' : '콘텐츠 저장'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
