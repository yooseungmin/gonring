/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Notion 기반 주요 색상
        'notion-black': '#37352f',  // Notion 실제 메인 텍스트 색상
        'notion-white': '#FFFFFF',
        'notion-gray-50': '#F8F9FA',
        'notion-gray-100': '#F1F3F5',
        'notion-gray-200': '#E9ECEF',
        'notion-gray-300': '#DEE2E6',
        'notion-gray-400': '#CED4DA',
        'notion-gray-500': '#787774',  // Notion 실제 부제목 색상
        'notion-gray-600': '#868E96',
        'notion-gray-700': '#37352f',  // 본문 텍스트용
        'notion-gray-800': '#1f2937',  // 제목 텍스트용
        'notion-gray-900': '#212529',
        'notion-blue': '#0073F5',
        'notion-green': '#0CA678',
        'notion-red': '#FA5252',
        // TaggingBox 브랜드 색상
        'tb-yellow': '#F5ED7B',     // 강조, 하이라이트용
        'tb-black': '#0D0D0D',      // 로고, 특별 강조용
        'tb-blue': '#4185F4',       // 링크, 버튼 액션용
        // 확장 가독성 텍스트 컬러
        'text-primary': '#1f2937',    // 제목 (기존보다 진함)
        'text-secondary': '#374151',  // 본문 (기존보다 진함)
        'text-tertiary': '#6b7280',   // 힌트 (기존보다 진함)
      },
      fontFamily: {
        sans: ['LINESeedKR', 'sans-serif'],
      },
      fontWeight: {
        thin: 200,
        light: 300,
        normal: 400,
        medium: 500,
      },
      borderRadius: {
        'sm': '0.125rem', // 2px
        'md': '0.25rem',  // 4px
        'lg': '0.375rem', // 6px
        'xl': '0.5rem',   // 8px
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'md': '0 1px 3px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.05)',
        'lg': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '350ms',
      },
      transitionTimingFunction: {
        'notion': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
