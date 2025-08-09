'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { boxApi, Box, BoxUpdate } from '@/lib/boxContentApi';

export default function EditBoxPage({ params }: { params: { boxId: string } }) {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  
  const [originalBox, setOriginalBox] = useState<Box | null>(null);
  const [formData, setFormData] = useState<BoxUpdate>({
    name: '',
    description: '',
    is_public: true
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 로그인 확인
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [authLoading, isLoggedIn, router]);
  
  // Box 정보 로드
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
      const response = await boxApi.getBox(params.boxId);
      
      if (response.success && response.data) {
        setOriginalBox(response.data);
        setFormData({
          name: response.data.name,
          description: response.data.description || '',
          is_public: response.data.is_public
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
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checkbox.checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    try {
      // Box 업데이트 API 호출
      const response = await boxApi.updateBox(params.boxId, formData);
      
      if (response.success && response.data) {
        // 업데이트 성공 시 상세 페이지로 이동
        router.push(`/boxes/${params.boxId}`);
      } else {
        setError(response.message || '박스 업데이트에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('박스 업데이트 오류:', err);
      setError(err.message || '박스 업데이트 중 오류가 발생했습니다.');
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
  
  if (error && !originalBox) {
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
  
  if (!originalBox) {
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
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">박스 편집</h1>
        <p className="text-gray-500">
          박스 정보를 수정합니다.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              박스 이름*
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="박스 이름을 입력하세요"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              설명
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="박스에 대한 설명을 입력하세요 (선택사항)"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_public"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700">
              공개 박스 (모든 사용자가 볼 수 있음)
            </label>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push(`/boxes/${params.boxId}`)}
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
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
