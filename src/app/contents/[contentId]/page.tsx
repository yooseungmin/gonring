'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { boxApi, contentApi, Content, Box } from '@/lib/boxContentApi';
import { Pencil, Trash, ArrowLeft, Tag as TagIcon } from 'lucide-react';
import Link from 'next/link';

export default function ContentDetailPage({ params }: { params: { contentId: string } }) {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  
  const [content, setContent] = useState<Content | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
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
      const contentResponse = await contentApi.getContent(params.contentId);
      
      if (contentResponse.success && contentResponse.data) {
        setContent(contentResponse.data);
        
        // 콘텐츠가 속한 박스 정보 가져오기
        if (contentResponse.data.box_id) {
          const boxResponse = await boxApi.getBox(contentResponse.data.box_id);
          
          if (boxResponse.success && boxResponse.data) {
            setBox(boxResponse.data);
          }
        }
      } else {
        setError(contentResponse.message || '콘텐츠 정보를 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      console.error('콘텐츠 상세 정보 로드 오류:', err);
      setError(err.message || '콘텐츠 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 콘텐츠 삭제
  const handleDeleteContent = async () => {
    try {
      const response = await contentApi.deleteContent(params.contentId);
      
      if (response.success) {
        // 삭제 성공 시 박스 페이지로 이동
        if (box) {
          router.push(`/boxes/${box.id}`);
        } else {
          router.push('/boxes');
        }
      } else {
        setError(response.message || '콘텐츠 삭제에 실패했습니다.');
        setShowDeleteModal(false);
      }
    } catch (err: any) {
      console.error('콘텐츠 삭제 오류:', err);
      setError(err.message || '콘텐츠 삭제 중 오류가 발생했습니다.');
      setShowDeleteModal(false);
    }
  };
  
  // 마크다운 또는 HTML 콘텐츠가 있으면 그것을 표시, 아니면 텍스트 콘텐츠
  const renderContent = () => {
    if (!content) return null;
    
    if (content.html_content) {
      return <div dangerouslySetInnerHTML={{ __html: content.html_content }} />;
    } else if (content.markdown_content) {
      // 마크다운 렌더링 로직 (실제 구현 시 마크다운 라이브러리 사용)
      return <pre className="whitespace-pre-wrap">{content.markdown_content}</pre>;
    } else {
      // 일반 텍스트 - 줄바꿈 유지
      return <pre className="whitespace-pre-wrap">{content.text_content}</pre>;
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
  
  if (error) {
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
  
  if (!content) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-yellow-700 mb-2">콘텐츠를 찾을 수 없습니다</h2>
          <p className="text-yellow-600 mb-4">요청하신 콘텐츠가 존재하지 않거나 접근 권한이 없습니다.</p>
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
      {/* 상단 버튼 */}
      <div className="mb-6">
        <button
          onClick={() => box ? router.push(`/boxes/${box.id}`) : router.push('/boxes')}
          className="flex items-center text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft size={16} className="mr-1" />
          {box ? `${box.name} 박스로 돌아가기` : '박스 목록으로 돌아가기'}
        </button>
      </div>
      
      {/* 콘텐츠 헤더 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {content.title || '제목 없음'}
              </h1>
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-4">
                  작성일: {new Date(content.created_at).toLocaleDateString()}
                </span>
                {content.updated_at && content.updated_at !== content.created_at && (
                  <span>
                    수정일: {new Date(content.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => router.push(`/contents/${params.contentId}/edit`)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                title="콘텐츠 편집"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                title="콘텐츠 삭제"
              >
                <Trash size={18} />
              </button>
            </div>
          </div>
          
          {/* 태그 표시 */}
          {content.tags && content.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {content.tags.map(tag => (
                <Link 
                  key={tag.id}
                  href={`/search?tags=${encodeURIComponent(tag.name)}`}
                  className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  <TagIcon size={14} className="mr-1" />
                  <span>{tag.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* 콘텐츠 본문 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden p-6">
        <div className="prose max-w-none">
          {renderContent()}
        </div>
      </div>
      
      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">콘텐츠 삭제 확인</h3>
            <p className="text-gray-600 mb-6">
              정말로 이 콘텐츠를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleDeleteContent}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
