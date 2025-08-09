'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mic, Keyboard, Tag as TagIcon, MessageSquare } from 'lucide-react';
import TagCloud from '@/components/tag/TagCloud';
import { searchApi, TagCloudItem } from '@/lib/searchApi';
import TaggingBoxLogo from '@/components/brand/TaggingBoxLogo';
import LargeMemoInput from '@/components/home/LargeMemoInput';
import VoiceRecorder from '@/components/home/VoiceRecorder';
import SmartFloatingChatBot from '@/components/chat/SmartFloatingChatBot';
import PWAInstallBanner from '@/components/home/PWAInstallBanner';
import { Box } from '@/components/chat/BoxSelector';

export default function HomePage() {
  const router = useRouter();
  const [popularTags, setPopularTags] = useState<TagCloudItem[]>([]);
  const [recentBoxes, setRecentBoxes] = useState<Box[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  
  // 박스와 태그 데이터 로드
  useEffect(() => {
    const loadPopularTags = async () => {
      try {
        const response = await searchApi.getTagCloud(15); // 상위 15개 태그만 가져오기
        if (response.success) {
          setPopularTags(response.data.tags);
        }
      } catch (error) {
        console.error('태그 로딩 오류:', error);
      }
    };
    
    // 최근 박스 로드 (예시 데이터)
    const mockRecentBoxes = [
      { id: 'box1', name: '연구 프로젝트', contentCount: 15 },
      { id: 'box2', name: '학습 자료', contentCount: 8 },
      { id: 'box3', name: '논문 모음', contentCount: 12 },
    ];
    
    const loadData = async () => {
      setIsLoading(true);
      await loadPopularTags();
      setRecentBoxes(mockRecentBoxes); // 실제 API 연동 시 변경
      setIsLoading(false);
    };
    
    loadData();
  }, []);
  
  // 메모 제출 처리
  const handleMemoSubmit = (text: string) => {
    // 메모 생성 페이지로 이동하면서 초기 내용 전달
    router.push(`/contents/create/rich?initial=${encodeURIComponent(text)}`);
  };
  
  // 음성 녹음 결과 처리
  const handleVoiceResult = (text: string) => {
    handleMemoSubmit(text);
  };
  
  // 태그 클릭 처리
  const handleTagClick = (tagName: string) => {
    router.push(`/search?tags=${encodeURIComponent(tagName)}`);
  };
  
  // 입력 방식 전환
  const toggleInputMode = () => {
    setShowVoiceInput(!showVoiceInput);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* PWA Install Banner */}
      <PWAInstallBanner />
      
      {/* 로고 및 헤더 */}
      <header className="flex flex-col items-center mb-10">
        <div className="mb-4 w-48 animate-float">
          <TaggingBoxLogo type="normal" size="large" linkToHome={false} />
        </div>
        <h1 className="text-2xl font-normal text-notion-black text-center mb-1">
          우리들의 성장 계좌
        </h1>
        <p className="text-notion-gray-700 text-center mb-6">
          Our Growth Account
        </p>
      </header>
      
      {/* 메인 입력 영역 */}
      <section className="mb-12">
        {showVoiceInput ? (
          <div className="google-search-container animate-fadeIn">
            <VoiceRecorder 
              onTextResult={handleVoiceResult} 
              className="p-6 shadow-lg rounded-xl google-input-shadow"
            />
          </div>
        ) : (
          <div className="google-search-container animate-fadeIn">
            <LargeMemoInput
              placeholder="오늘 배운 내용을 기록하세요"
              onSubmit={handleMemoSubmit}
              className="google-input-shadow focus-expand"
              autoFocus
            />
          </div>
        )}
        
        {/* 입력 방식 전환 버튼 */}
        <div className="input-actions">
          <button 
            onClick={toggleInputMode} 
            className="input-action-button"
          >
            {showVoiceInput ? (
              <>
                <Keyboard size={16} className="mr-2" />
                텍스트 입력
              </>
            ) : (
              <>
                <Mic size={16} className="mr-2" />
                음성 입력
              </>
            )}
          </button>
        </div>
      </section>
      
      {/* 최근 활동 및 태그 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* 최근 박스 */}
        <div>
          <h2 className="text-lg font-medium text-notion-black mb-4 flex items-center">
            <span className="mr-2">📦</span> 최근 메모
          </h2>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center bg-notion-gray-50 rounded-md">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-notion-blue"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBoxes.map(box => (
                <Link
                  key={box.id}
                  href={`/boxes/${box.id}`}
                  className="recent-item-card block"
                >
                  <h3 className="text-notion-black font-medium">{box.name}</h3>
                  <p className="text-sm text-notion-gray-700">{box.contentCount}개 콘텐츠</p>
                </Link>
              ))}
            </div>
          )}
        </div>
        
        {/* 인기 태그 */}
        <div>
          <h2 className="text-lg font-medium text-notion-black mb-4 flex items-center">
            <TagIcon size={18} className="mr-2" /> 자주 사용하는 태그
          </h2>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center bg-notion-gray-50 rounded-md">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-notion-blue"></div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-md border border-notion-gray-200">
              {popularTags.length > 0 ? (
                <TagCloud tags={popularTags} onTagClick={handleTagClick} />
              ) : (
                <p className="text-notion-gray-700 text-center py-4">아직 태그가 없습니다.</p>
              )}
            </div>
          )}
        </div>
      </section>
      
      {/* 플로팅 챗봇 */}
      <SmartFloatingChatBot 
        boxes={recentBoxes}
        tags={popularTags}
        position="fixed"
        size="normal"
        theme="light"
        zIndex={50}
        title="TaggingBox 어시스턴트"
      />
    </div>
  );
}
