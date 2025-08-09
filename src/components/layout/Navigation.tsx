'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Home, Search, Box, FileText, User, LogOut, Menu, X } from 'lucide-react';
import TaggingBoxLogo from '@/components/brand/TaggingBoxLogo';

export default function Navigation() {
  const pathname = usePathname();
  const { isLoggedIn, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 모바일 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('#mobile-menu') && !target.closest('#menu-button')) {
        setIsMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMobileMenuOpen]);
  
  // 페이지 변경 시 모바일 메뉴 닫기
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);
  
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const handleLogout = () => {
    logout();
  };
  
  // 임시로 네비게이션을 항상 표시하도록 수정
  // if (!isLoggedIn) {
  //   return null; // 로그인하지 않은 경우 네비게이션 표시 안함
  // }
  
  return (
    <>
      {/* 데스크톱 네비게이션 - 좌측 사이드바 */}
      <div className="fixed top-0 left-0 w-[250px] h-screen bg-white border-r border-notion-gray-200 shadow-md z-50 p-4 hidden md:block">
        <div className="pb-4 mb-4 border-b border-notion-gray-200">
          <div className="mb-2">
            <div className="w-[70%]">
              <TaggingBoxLogo type="full" size="large" className="w-full" />
            </div>
          </div>
          <p className="text-sm text-text-secondary">당신의 지식 관리 플랫폼</p>
          
          {/* 빠른 검색 버튼 */}
          <div className="mt-3">
            <Link
              href="/search"
              className="flex items-center w-full p-2 bg-notion-gray-50 rounded text-notion-gray-700"
            >
              <Search size={16} className="mr-2" />
              <span className="text-sm">태그로 검색하기...</span>
            </Link>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            <li>
              <Link
                href="/"
                className={`flex items-center p-3 rounded-md ${
                  isActive('/') ? 'bg-notion-gray-100 text-notion-blue' : 'text-notion-gray-700 hover:bg-notion-gray-50'
                } transition-all duration-150`}
              >
                <Home size={18} className="mr-3" />
                <span>홈</span>
              </Link>
            </li>
            <li>
              <Link
                href="/boxes"
                className={`flex items-center p-3 rounded-md ${
                  isActive('/boxes') ? 'bg-notion-gray-100 text-notion-blue' : 'text-notion-gray-700 hover:bg-notion-gray-50'
                } transition-all duration-150`}
              >
                <Box size={18} className="mr-3" />
                <span>박스</span>
              </Link>
            </li>
            <li>
              <Link
                href="/search"
                className={`flex items-center p-3 rounded-md ${
                  isActive('/search') ? 'bg-notion-gray-100 text-notion-blue' : 'text-notion-gray-700 hover:bg-notion-gray-50'
                } transition-all duration-150`}
              >
                <Search size={18} className="mr-3" />
                <span>검색</span>
              </Link>
            </li>
          </ul>
          
          <div className="mt-8 pt-4 border-t border-notion-gray-200">
            <h3 className="text-xs font-normal text-notion-gray-500 uppercase tracking-wider mb-2">
              사용자
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/profile"
                  className={`flex items-center p-2 rounded-md ${
                    isActive('/profile') ? 'bg-notion-gray-100 text-notion-blue' : 'text-notion-gray-700 hover:bg-notion-gray-50'
                  } transition-all duration-150`}
                >
                  <User size={18} className="mr-3" />
                  <span className="font-light">프로필</span>
                </Link>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="flex items-center p-2 rounded-md text-notion-gray-700 hover:bg-notion-gray-50 w-full text-left transition-all duration-150"
                >
                  <LogOut size={18} className="mr-3" />
                  <span className="font-light">로그아웃</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </div>
      
      {/* 모바일 네비게이션 - 상단 바 */}
      <div className="md:hidden bg-white border-b border-notion-gray-200 fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <TaggingBoxLogo type="simple" size="medium" />
          </div>
          <button
            id="menu-button"
            onClick={toggleMobileMenu}
            className="p-2 rounded-md text-notion-gray-700 hover:bg-notion-gray-50 transition-all duration-150"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        
        {/* 모바일 메뉴 */}
        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="fixed inset-0 bg-white z-50 pt-16"
          >
            <nav className="p-4">
              {/* 모바일 검색 바 */}
              <div className="mb-4 p-2">
                <Link
                  href="/search"
                  className="flex items-center w-full p-3 bg-notion-gray-50 rounded-md hover:bg-notion-gray-100 transition-all duration-150"
                >
                  <Search size={18} className="text-notion-gray-700 mr-2" />
                  <span className="text-notion-gray-700">태그로 검색하기...</span>
                </Link>
              </div>
              
              <ul className="space-y-4">
                <li>
                  <Link
                    href="/"
                    className={`flex items-center p-3 rounded-md ${
                      isActive('/') ? 'bg-notion-gray-100 text-notion-blue' : 'text-notion-gray-700 hover:bg-notion-gray-50'
                    } transition-all duration-150`}
                  >
                    <Home size={18} className="mr-3" />
                    <span className="font-light">홈</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/boxes"
                    className={`flex items-center p-3 rounded-md ${
                      isActive('/boxes') ? 'bg-notion-gray-100 text-notion-blue' : 'text-notion-gray-700 hover:bg-notion-gray-50'
                    } transition-all duration-150`}
                  >
                    <Box size={18} className="mr-3" />
                    <span className="font-light">박스</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/search"
                    className={`flex items-center p-3 rounded-md ${
                      isActive('/search') ? 'bg-notion-gray-100 text-notion-blue' : 'text-notion-gray-700 hover:bg-notion-gray-50'
                    } transition-all duration-150`}
                  >
                    <Search size={18} className="mr-3" />
                    <span className="font-light">검색</span>
                  </Link>
                </li>
                <li className="pt-4 border-t border-notion-gray-200">
                  <Link
                    href="/profile"
                    className={`flex items-center p-3 rounded-md ${
                      isActive('/profile') ? 'bg-notion-gray-100 text-notion-blue' : 'text-notion-gray-700 hover:bg-notion-gray-50'
                    } transition-all duration-150`}
                  >
                    <User size={18} className="mr-3" />
                    <span className="font-light">프로필</span>
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="flex items-center p-3 rounded-md text-notion-gray-700 hover:bg-notion-gray-50 w-full text-left transition-all duration-150"
                  >
                    <LogOut size={18} className="mr-3" />
                    <span className="font-light">로그아웃</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
      
      {/* 모바일 하단 메뉴 바 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-notion-gray-200 z-10">
        <div className="flex justify-around">
          <Link
            href="/"
            className={`flex flex-col items-center py-3 ${
              isActive('/') ? 'text-notion-blue' : 'text-notion-gray-700'
            }`}
          >
            <Home size={20} />
            <span className="text-xs mt-1">홈</span>
          </Link>
          <Link
            href="/boxes"
            className={`flex flex-col items-center py-3 ${
              isActive('/boxes') ? 'text-notion-blue' : 'text-notion-gray-700'
            }`}
          >
            <Box size={20} />
            <span className="text-xs mt-1">박스</span>
          </Link>
          <Link
            href="/search"
            className={`flex flex-col items-center py-3 ${
              isActive('/search') ? 'text-notion-blue' : 'text-notion-gray-700'
            }`}
          >
            <Search size={20} />
            <span className="text-xs mt-1">검색</span>
          </Link>
          <Link
            href="/profile"
            className={`flex flex-col items-center py-3 ${
              isActive('/profile') ? 'text-notion-blue' : 'text-notion-gray-700'
            }`}
          >
            <User size={20} />
            <span className="text-xs mt-1">프로필</span>
          </Link>
        </div>
      </div>
    </>
  );
}
