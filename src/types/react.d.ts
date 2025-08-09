// src/types/react.d.ts
import 'react';

declare module 'react' {
  interface CSSProperties {
    [key: string]: any;
  }
}

// 다른 필요한 글로벌 타입 확장이 있다면 여기에 추가
