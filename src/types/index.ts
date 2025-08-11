/**
 * 타입 정의 중앙화를 위한 인덱스 파일
 * 이 파일을 통해 모든 타입을 가져올 수 있습니다.
 */

// API 관련 타입 재내보내기
export * from './api';

// 모델 관련 타입 재내보내기
export * from './models';

// 태그 그래프 관련 타입 재내보내기
export * from './tagGraph';

// 컴포넌트 관련 타입 재내보내기
export * from './components';

// 분석 관련 타입 재내보내기
export * from './analysis';

// Box 관련 타입 재내보내기
export * from './box';

// 검색 관련 타입 재내보내기
export * from './search';

/**
 * 유틸리티 타입 정의
 */

// Nullable 타입 - 값이 해당 타입이거나 null일 수 있음
export type Nullable<T> = T | null;

// Optional 타입 - 값이 해당 타입이거나 undefined일 수 있음
export type Optional<T> = T | undefined;

// DeepPartial 타입 - 중첩된 객체의 모든 속성을 선택적으로 만듦
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

// RecordWithId 타입 - id 속성을 가진 레코드
export type RecordWithId<T> = T & { id: string };

// AsyncResult 타입 - 비동기 함수의 결과
export type AsyncResult<T> = Promise<T>;

// ErrorWithCode 타입 - 코드가 포함된 에러
export interface ErrorWithCode extends Error {
  code: string;
}
