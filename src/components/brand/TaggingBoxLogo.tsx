'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface TaggingBoxLogoProps {
  type?: 'full' | 'normal' | 'simple';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  linkToHome?: boolean;
}

export default function TaggingBoxLogo({ 
  type = 'full',
  size = 'medium',
  className = '',
  linkToHome = true
}: TaggingBoxLogoProps) {
  
  // 이미지 사이즈 계산
  const imageSize = {
    small: { width: 24, height: 24 },
    medium: { width: 32, height: 32 },
    large: { width: 48, height: 48 }
  };
  
  // 로고 타입별 추가 스타일 적용
  const logoStyle = {
    full: "aspect-ratio-auto",
    normal: "aspect-ratio-auto max-h-10", // normal_y 로고의 최대 높이 제한
    simple: "aspect-ratio-auto"
  };
  
  // 로고 타입에 따라 이미지 경로 결정
  const logoSrc = {
    full: '/logo.svg',
    normal: '/normal_y.svg',
    simple: '/simple_y.svg'
  };
  
  return (
    <div className={`logo-container ${className} flex items-center`}>
      {linkToHome ? (
        <Link href="/" className="cursor-pointer hover:opacity-90 transition-opacity">
          <Image
            src={logoSrc[type]}
            alt="TaggingBox Logo"
            width={imageSize[size].width * 2}
            height={imageSize[size].height}
            className={`object-contain w-auto h-auto ${logoStyle[type]}`}
            priority
          />
        </Link>
      ) : (
        <Image
          src={logoSrc[type]}
          alt="TaggingBox Logo"
          width={imageSize[size].width * 2}
          height={imageSize[size].height}
          className={`object-contain w-auto h-auto ${logoStyle[type]}`}
          priority
        />
      )}
    </div>
  );
}
