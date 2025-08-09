'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { boxApi, BoxCreate } from '@/lib/boxContentApi';

export default function CreateBoxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get('parentId');
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState<BoxCreate>({
    name: '',
    description: '',
    is_public: true,
    parent_id: parentId || null
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 로그인 확인
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [authLoading, isLoggedIn, router]);
  
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
    setIsLoading(true);
    setError(null);
    
    try {
      // Box 생성 API 호출
      const response = await boxApi.createBox(formData);
      
      if (response.success && response.data) {
        // 생성 성공 시 박스 목록 페이지로 이동
        router.push('/boxes');
      } else {
        setError(response.message || '박스 생성에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('박스 생성 오류:', err);
      setError(err.message || '박스 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
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
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">새 박스 만들기</h1>
        <p className="text-gray-500">
          박스는 콘텐츠를 체계적으로 구성하는 데 도움이 됩니다.
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
          
          {parentId && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">
                상위 박스 내에 새 박스를 생성합니다.
              </p>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg text-white ${
              isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? '생성 중...' : '박스 생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
