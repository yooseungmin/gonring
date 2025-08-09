'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { boxApi, Box, contentApi, ContentBrief } from '@/lib/boxContentApi';
import { Pencil, Trash, Plus, Share, ArrowLeft, FolderOpen, File } from 'lucide-react';
import Link from 'next/link';

export default function BoxDetailPage({ params }: { params: { boxId: string } }) {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  
  const [box, setBox] = useState<Box | null>(null);
  const [contents, setContents] = useState<ContentBrief[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // 로그인 확인
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [authLoading, isLoggedIn, router]);
  
  // Box 정보 및 콘텐츠 로드
  useEffect(() => {
    if (isLoggedIn && params.boxId) {
      loadBoxData();
    }
  }, [isLoggedIn, params.boxId]);
  
  const loadBoxData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Box 정보 가져오기
      const boxResponse = await boxApi.getBox(params.boxId);
      
      if (boxResponse.success && boxResponse.data) {
        setBox(boxResponse.data);
        
        // Box의 콘텐츠 목록 가져오기
        const contentsResponse = await contentApi.getBoxContents(params.boxId);
        
        if (contentsResponse.success && contentsResponse.data) {
          setContents(contentsResponse.data);
        }
      } else {
        setError(boxResponse.message || '박스 정보를 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      console.error('박스 상세 정보 로드 오류:', err);
      setError(err.message || '박스 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Box 삭제
  const handleDeleteBox = async () => {
    try {
      const response = await boxApi.deleteBox(params.boxId);
      
      if (response.success) {
        router.push('/boxes');
      } else {
        setError(response.message || '박스 삭제에 실패했습니다.');
        setShowDeleteModal(false);
      }
    } catch (err: any) {
      console.error('박스 삭제 오류:', err);
      setError(err.message || '박스 삭제 중 오류가 발생했습니다.');
      setShowDeleteModal(false);
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
  
  if (!box) {
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
    <div className="container mx-auto px-4 py-8">
      {/* 상단 버튼 */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/boxes')}
          className="flex items-center text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft size={16} className="mr-1" />
          박스 목록으로 돌아가기
        </button>
      </div>
      
      {/* 박스 헤더 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{box.name}</h1>
              <p className="text-gray-500 mb-4">{box.description || '설명 없음'}</p>
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-4">
                  {box.is_public ? '공개' : '비공개'} 박스
                </span>
                <span className="mr-4">
                  콘텐츠 {box.content_count}개
                </span>
                <span>
                  하위 박스 {box.child_box_count}개
                </span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => router.push(`/boxes/${params.boxId}/edit`)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                title="박스 편집"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                title="박스 삭제"
              >
                <Trash size={18} />
              </button>
              <button
                onClick={() => {/* 공유 기능 추가 예정 */}}
                className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                title="박스 공유"
              >
                <Share size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 컨텐츠 섹션 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">콘텐츠</h2>
          <button
            onClick={() => router.push(`/contents/create?boxId=${params.boxId}`)}
            className="flex items-center text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} className="mr-1" />
            새 콘텐츠 추가
          </button>
        </div>
        
        {contents.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <File size={40} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">아직 콘텐츠가 없습니다</h3>
            <p className="text-gray-500 mb-6">이 박스에 새로운 콘텐츠를 추가해보세요.</p>
            <button
              onClick={() => router.push(`/contents/create?boxId=${params.boxId}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-flex items-center hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} className="mr-1" />
              새 콘텐츠 추가
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {contents.map((content) => (
                <li key={content.id} className="hover:bg-gray-50">
                  <Link href={`/contents/${content.id}`} className="block p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {content.title || '제목 없음'}
                        </h3>
                        <p className="text-gray-500 text-sm line-clamp-2">
                          {content.text_preview || '내용 없음'}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(content.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        태그 {content.tag_count}개
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* 하위 박스 섹션 (구현 예정) */}
      
      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">박스 삭제 확인</h3>
            <p className="text-gray-600 mb-6">
              정말로 <strong>{box.name}</strong> 박스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 콘텐츠도 함께 삭제됩니다.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleDeleteBox}
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
