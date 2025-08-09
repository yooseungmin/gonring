import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import Navigation from "@/components/layout/Navigation";
import "./globals.css";
import "@/styles/homepage.css";
import "@/styles/brand.css";

// 기본 폰트로 Inter 사용 (LINESeedKR은 CSS에서 로드)
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TB Hub - 지식 관리 플랫폼",
  description: "당신의 지식을 체계적으로 관리하는 플랫폼",
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  themeColor: '#F2EC7A',
  appleWebApp: {
    capable: true,
    title: "TaggingBox",
    statusBarStyle: "default"
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link 
          href="https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_11-01@1.0/LINESeedKR-Rg.woff2"
          rel="preload"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <AuthProvider>
          <div className="flex min-h-screen">
            <Navigation />
            <main className="flex-1 ml-[250px] p-8 md:ml-[250px] md:p-8 sm:ml-0 sm:mb-16 sm:p-4">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
