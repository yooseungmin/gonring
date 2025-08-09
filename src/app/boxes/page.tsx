'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { boxApi, Box } from '@/lib/boxContentApi';
import { Plus, FolderOpen, Lock, Unlock, MoreHorizontal } from 'lucide-react';

export default function BoxesPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentBoxId, setParentBoxId] = useState<string | null>(null);
  const [parentBoxPath, setParentBoxPath] = useState<{ id: string, name: string }[]>([]);

  // 로그인 확인
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [authLoading, isLoggedIn, router]);

  // Box 목록 로드
  useEffect(() => {
    if (isLoggedIn) {
      loadBoxes();
    }
  }, [isLoggedIn, parentBoxId]);

  const loadBoxes = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await boxApi.getMyBoxes(parentBoxId);
      
      if (response.success && response.data) {
        setBoxes(response.data);
      } else {
        setError(response.message || 'Box 목록을 가져오는데 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Box 목록 로드 오류:', err);
      setError(err.message || 'Box 목록을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 상위 Box로 이동
  const navigateToParent = async () => {
    if (parentBoxPath.length === 0) return;
    
    const newPath = [...parentBoxPath];
    newPath.pop(); // 현재 Box 제거
    
    if (newPath.length === 0) {
      // 최상위로 이동
      setParentBoxId(null);
      setParentBoxPath([]);
    } else {
      // 상위 Box로 이동
      const parentBox = newPath[newPath.length - 1];
      setParentBoxId(parentBox.id);
      setParentBoxPath(newPath);
    }
  };

  // Box 클릭 시 해당 Box로 이동
  const handleBoxClick = (box: Box) => {
    setParentBoxId(box.id);
    setParentBoxPath([...parentBoxPath, { id: box.id, name: box.name }]);
  };

  // Box 생성 페이지로 이동
  const handleCreateBox = () => {
    router.push(`/boxes/create${parentBoxId ? `?parentId=${parentBoxId}` : ''}`);
  };

  if (authLoading) {
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">내 박스</h1>
          <div className="flex items-center mt-2 text-sm text-gray-500">
            {/* 경로 표시 */}
            <button 
              onClick={() => {
                setParentBoxId(null);
                setParentBoxPath([]);
              }}
              className="hover:text-blue-600"
            >
              홈
            </button>
            
            {parentBoxPath.map((box, index) => (
              <div key={box.id} className="flex items-center">
                <span className="mx-2">/</span>
                <button 
                  onClick={() => {
                    setParentBoxId(box.id);
                    setParentBoxPath(parentBoxPath.slice(0, index + 1));
                  }}
                  className="hover:text-blue-600"
                >
                  {box.name}
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <button
          onClick={handleCreateBox}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-1" />
          새 박스 만들기
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {parentBoxId && (
        <button
          onClick={navigateToParent}
          className="mb-4 flex items-center text-gray-600 hover:text-blue-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          상위 폴더로 이동
        </button>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 h-40 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : boxes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FolderOpen size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">아직 박스가 없습니다</h3>
          <p className="text-gray-500 mb-6">새 박스를 만들어 정보를 정리해보세요.</p>
          <button
            onClick={handleCreateBox}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-flex items-center hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} className="mr-1" />
            새 박스 만들기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {boxes.map((box) => (
            <div 
              key={box.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleBoxClick(box)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-1">{box.name}</h2>
                  <div className="text-gray-400">
                    {box.is_public ? <Unlock size={18} /> : <Lock size={18} />}
                  </div>
                </div>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{box.description || '설명 없음'}</p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <div>콘텐츠 {box.content_count}개</div>
                  <div>하위 박스 {box.child_box_count}개</div>
                </div>
              </div>
              <div className="px-6 py-3 bg-gray-50 flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  {new Date(box.created_at).toLocaleDateString()}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/boxes/${box.id}`);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
