'use client';

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Highlighter, Archive, TrendingUp } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";

export default function LandingPage() {
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  return (
    <MainLayout isLoggedIn={false} isHubMember={false}>
      {/* 히어로(Hero) 섹션 */}
      <section className="bg-gray-50 relative overflow-hidden">
        {/* 배경 이미지가 있을 경우 아래 주석을 제거하고 사용
        <div className="absolute inset-0 z-0">
          <Image 
            src="/images/normal_b.png" 
            alt="Background" 
            layout="fill" 
            objectFit="cover"
            priority
          />
        </div>
        */}
        <div className="tb-container relative z-10 tb-py-2xl min-h-[80vh] tb-flex tb-flex-col tb-items-center tb-justify-center">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial="hidden"
            animate="visible"
            variants={staggerChildren}
          >
            <motion.h1 
              className="tb-heading-1 tb-font-bold text-5xl md:text-6xl lg:text-7xl mb-6"
              variants={fadeInUp}
            >
              OUR GROWTH ACCOUNT
            </motion.h1>
            
            <motion.p 
              className="tb-body-lg tb-mb-xl text-xl md:text-2xl tb-text-gray-600"
              variants={fadeInUp}
            >
              우리의 성장 계좌, 태깅박스
            </motion.p>
            
            <motion.div variants={fadeInUp}>
              <Link href="/register" className="tb-btn tb-btn-primary tb-btn-xl">
                Hub 가입하고 시작하기
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* 웨이브 디자인 요소 (선택 사항) */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
            <path 
              fill="#FFFFFF" 
              fillOpacity="1" 
              d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,218.7C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            ></path>
          </svg>
        </div>
      </section>

      {/* 기능 소개 섹션 (3단계 프로세스) */}
      <section className="tb-py-2xl tb-bg-white">
        <div className="tb-container">
          <motion.div
            className="text-center tb-mb-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="tb-heading-2 tb-mb-md">태깅박스의 3단계 성장 프로세스</h2>
            <p className="tb-body-lg tb-text-gray-600 max-w-2xl mx-auto">
              중요한 정보를 수집하고 관리하여 지속적인 성장을 경험해보세요.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 tb-gap-lg">
            {/* 1. Highlighting */}
            <motion.div 
              className="tb-card tb-p-lg tb-flex tb-flex-col tb-items-center text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="tb-bg-pastel-yellow tb-rounded-full p-4 tb-mb-md">
                <Highlighter size={32} className="tb-text-accent-yellow" />
              </div>
              <h3 className="tb-heading-3 tb-mb-sm">Highlighting</h3>
              <p className="tb-body tb-text-gray-600">
                중요한 정보를 표시하고 태그를 지정하여 필요한 내용을 즉시 식별할 수 있습니다.
                웹페이지의 어떤 텍스트든 하이라이트하고 분류할 수 있습니다.
              </p>
            </motion.div>

            {/* 2. Archiving */}
            <motion.div 
              className="tb-card tb-p-lg tb-flex tb-flex-col tb-items-center text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="tb-bg-pastel-blue tb-rounded-full p-4 tb-mb-md">
                <Archive size={32} className="tb-text-accent-blue" />
              </div>
              <h3 className="tb-heading-3 tb-mb-sm">Archiving</h3>
              <p className="tb-body tb-text-gray-600">
                하이라이트된 정보를 자동으로 분류하고 저장합니다.
                언제든지 필요할 때 쉽게 검색하고 접근할 수 있는 개인 아카이브를 구축하세요.
              </p>
            </motion.div>

            {/* 3. Growing */}
            <motion.div 
              className="tb-card tb-p-lg tb-flex tb-flex-col tb-items-center text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="tb-bg-pastel-green tb-rounded-full p-4 tb-mb-md">
                <TrendingUp size={32} className="tb-text-accent-green" />
              </div>
              <h3 className="tb-heading-3 tb-mb-sm">Growing</h3>
              <p className="tb-body tb-text-gray-600">
                수집된 정보를 분석하고 연결하여 새로운 인사이트를 발견하세요.
                지식이 쌓일수록 더 많은 가치를 창출합니다.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 최종 CTA 섹션 */}
      <section className="tb-py-2xl tb-bg-gray-50">
        <div className="tb-container">
          <motion.div 
            className="max-w-2xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="tb-heading-2 tb-mb-lg">지금 바로 당신의 성장 계좌를 만들어보세요</h2>
            <p className="tb-body-lg tb-text-gray-600 tb-mb-xl">
              태깅박스와 함께라면 웹에서 얻는 모든 정보가 당신의 자산이 됩니다.
              지금 시작하고 지식의 가치를 극대화하세요.
            </p>
            <Link href="/register" className="tb-btn tb-btn-primary tb-btn-xl">
              Hub 가입하고 시작하기
            </Link>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  );
}
        <section className="tb-section-sm">
          <h2 className="tb-heading-3 tb-mb-lg">카테고리 배지</h2>
          <div className="tb-flex tb-gap-sm tb-flex-wrap tb-mb-md">
            <span className="tb-badge tb-badge-pink">Pink Category</span>
            <span className="tb-badge tb-badge-purple">Purple Category</span>
            <span className="tb-badge tb-badge-blue">Blue Category</span>
            <span className="tb-badge tb-badge-green">Green Category</span>
            <span className="tb-badge tb-badge-orange">Orange Category</span>
          </div>
          
          <h3 className="tb-heading-4 tb-mb-sm">상태 배지</h3>
          <div className="tb-flex tb-gap-sm tb-flex-wrap">
            <span className="tb-badge tb-badge-success">Success</span>
            <span className="tb-badge tb-badge-warning">Warning</span>
            <span className="tb-badge tb-badge-error">Error</span>
            <span className="tb-badge tb-badge-info">Info</span>
          </div>
        </section>

        {/* 타이포그래피 섹션 */}
        <section className="tb-section-sm">
          <h2 className="tb-heading-3 tb-mb-lg">타이포그래피</h2>
          <div className="tb-flex tb-flex-col tb-gap-md">
            <h1 className="tb-heading-1">Heading 1 - 메인 제목</h1>
            <h2 className="tb-heading-2">Heading 2 - 섹션 제목</h2>
            <h3 className="tb-heading-3">Heading 3 - 서브 섹션</h3>
            <h4 className="tb-heading-4">Heading 4 - 소제목</h4>
            <p className="tb-body-lg">Large Body Text - 중요한 본문 텍스트입니다.</p>
            <p className="tb-body">Regular Body Text - 일반적인 본문 텍스트입니다.</p>
            <p className="tb-body-sm">Small Body Text - 작은 본문 텍스트입니다.</p>
            <p className="tb-caption">Caption Text - 캡션이나 부가 설명 텍스트입니다.</p>
          </div>
        </section>

        {/* 컬러 팔레트 섹션 */}
        <section className="tb-section-sm">
          <h2 className="tb-heading-3 tb-mb-lg">컬러 팔레트</h2>
          
          <h3 className="tb-heading-4 tb-mb-sm">브랜드 컬러</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 tb-gap-md tb-mb-lg">
            <div className="tb-flex tb-flex-col tb-items-center tb-gap-sm">
              <div className="w-16 h-16 tb-bg-primary tb-rounded-lg tb-border"></div>
              <span className="tb-caption">Primary BG</span>
            </div>
            <div className="tb-flex tb-flex-col tb-items-center tb-gap-sm">
              <div className="w-16 h-16 tb-bg-yellow tb-rounded-lg"></div>
              <span className="tb-caption">Yellow</span>
            </div>
            <div className="tb-flex tb-flex-col tb-items-center tb-gap-sm">
              <div className="w-16 h-16 tb-bg-green tb-rounded-lg"></div>
              <span className="tb-caption">Green</span>
            </div>
            <div className="tb-flex tb-flex-col tb-items-center tb-gap-sm">
              <div className="w-16 h-16 tb-bg-blue tb-rounded-lg"></div>
              <span className="tb-caption">Blue</span>
            </div>
          </div>

          <h3 className="tb-heading-4 tb-mb-sm">파스텔 카테고리 컬러</h3>
          <div className="grid grid-cols-3 md:grid-cols-5 tb-gap-md">
            <div className="tb-flex tb-flex-col tb-items-center tb-gap-sm">
              <div className="w-16 h-16 tb-rounded-lg" style={{backgroundColor: 'var(--tb-pastel-pink)'}}></div>
              <span className="tb-caption">Pink</span>
            </div>
            <div className="tb-flex tb-flex-col tb-items-center tb-gap-sm">
              <div className="w-16 h-16 tb-rounded-lg" style={{backgroundColor: 'var(--tb-pastel-purple)'}}></div>
              <span className="tb-caption">Purple</span>
            </div>
            <div className="tb-flex tb-flex-col tb-items-center tb-gap-sm">
              <div className="w-16 h-16 tb-rounded-lg" style={{backgroundColor: 'var(--tb-pastel-blue)'}}></div>
              <span className="tb-caption">Blue</span>
            </div>
            <div className="tb-flex tb-flex-col tb-items-center tb-gap-sm">
              <div className="w-16 h-16 tb-rounded-lg" style={{backgroundColor: 'var(--tb-pastel-green)'}}></div>
              <span className="tb-caption">Green</span>
            </div>
            <div className="tb-flex tb-flex-col tb-items-center tb-gap-sm">
              <div className="w-16 h-16 tb-rounded-lg" style={{backgroundColor: 'var(--tb-pastel-orange)'}}></div>
              <span className="tb-caption">Orange</span>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="tb-border-t tb-bg-white tb-py-xl">
        <div className="tb-container">
          <div className="tb-flex tb-items-center tb-justify-center">
            <p className="tb-body-sm tb-text-gray-500">
              taggingBox Brand Design System - Next.js 15 & Tailwind CSS 4
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
