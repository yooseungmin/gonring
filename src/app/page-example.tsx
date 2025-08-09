// src/app/page.tsx 예시 - 메인 레이아웃을 사용하는 방법
import React from 'react';
import MainLayout from '../components/layout/MainLayout';

export default function Home() {
  // 이 예시에서는 사용자가 로그인했다고 가정합니다
  const mockUser = {
    isLoggedIn: true,
    isHubMember: true,
    userName: '홍길동',
    notificationCount: 3
  };

  return (
    <MainLayout
      isLoggedIn={mockUser.isLoggedIn}
      isHubMember={mockUser.isHubMember}
      userName={mockUser.userName}
      notificationCount={mockUser.notificationCount}
    >
      <div className="tb-flex tb-flex-col tb-gap-xl">
        <section>
          <h1 className="tb-heading-1 tb-mb-md">안녕하세요, {mockUser.userName}님!</h1>
          <p className="tb-body tb-mb-lg">태깅박스 Hub에 오신 것을 환영합니다.</p>
          
          <div className="tb-card tb-p-lg tb-mb-xl">
            <h2 className="tb-heading-3 tb-mb-md">시작하기</h2>
            <p className="tb-body-lg tb-mb-md">태깅박스 SDK와 API를 통해 웹사이트에 태깅 기능을 추가해보세요.</p>
            <div className="tb-flex tb-gap-md">
              <button className="tb-btn tb-btn-primary">SDK 설치하기</button>
              <button className="tb-btn tb-btn-secondary">API 문서 보기</button>
            </div>
          </div>
        </section>

        <section className="tb-mb-xl">
          <h2 className="tb-heading-2 tb-mb-lg">최근 업데이트</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 tb-gap-lg">
            {/* 업데이트 카드 1 */}
            <div className="tb-card tb-p-lg">
              <span className="tb-badge tb-badge-blue tb-mb-sm">새로운 기능</span>
              <h3 className="tb-heading-4 tb-mb-sm">Mini Console 베타 출시</h3>
              <p className="tb-body-sm tb-mb-md">간소화된 콘솔로 더 빠르게 태깅 기능을 관리해보세요.</p>
              <button className="tb-btn tb-btn-sm tb-btn-secondary">자세히 보기</button>
            </div>
            
            {/* 업데이트 카드 2 */}
            <div className="tb-card tb-p-lg">
              <span className="tb-badge tb-badge-green tb-mb-sm">성능 개선</span>
              <h3 className="tb-heading-4 tb-mb-sm">SDK 성능 최적화</h3>
              <p className="tb-body-sm tb-mb-md">새로운 버전의 SDK는 로딩 속도가 50% 향상되었습니다.</p>
              <button className="tb-btn tb-btn-sm tb-btn-secondary">자세히 보기</button>
            </div>
            
            {/* 업데이트 카드 3 */}
            <div className="tb-card tb-p-lg">
              <span className="tb-badge tb-badge-orange tb-mb-sm">이벤트</span>
              <h3 className="tb-heading-4 tb-mb-sm">개발자 밋업</h3>
              <p className="tb-body-sm tb-mb-md">8월 15일 태깅박스 개발자 밋업에 참여하세요.</p>
              <button className="tb-btn tb-btn-sm tb-btn-secondary">등록하기</button>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
