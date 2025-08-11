/**
 * 카드 컴포넌트 관련 타입 정의
 */
import { ReactNode } from 'react';
import { Box } from '../models';
import { Search } from '../search';
import { ContentBrief } from '../box';

export namespace Card {
  /**
   * 카드 컴포넌트 변형 타입
   */
  export type Variant = 'box' | 'content' | 'search-result' | 'feature' | 'quick-action';
  
  /**
   * 카드 레이아웃 타입
   */
  export type Layout = 'compact' | 'default' | 'detailed';
  
  /**
   * 카드 액션 인터페이스
   */
  export interface Action {
    label: string;
    icon?: ReactNode;
    onClick: (e: React.MouseEvent) => void;
  }
  
  /**
   * 기본 카드 속성
   */
  export interface BaseProps {
    variant: Variant;
    layout?: Layout;
    actions?: Action[];
    className?: string;
    onClick?: () => void;
  }
  
  /**
   * 박스 카드 속성
   */
  export interface BoxCardProps extends BaseProps {
    variant: 'box';
    data: Box;
  }
  
  /**
   * 콘텐츠 카드 속성
   */
  export interface ContentCardProps extends BaseProps {
    variant: 'content';
    data: ContentBrief;
  }
  
  /**
   * 검색 결과 카드 속성
   */
  export interface SearchResultCardProps extends BaseProps {
    variant: 'search-result';
    data: Search.ResultItem;
  }
  
  /**
   * 기능 소개 카드 속성
   */
  export interface FeatureCardProps extends BaseProps {
    variant: 'feature';
    title: string;
    description: string;
    icon: ReactNode;
  }
  
  /**
   * 빠른 액션 카드 속성
   */
  export interface QuickActionCardProps extends BaseProps {
    variant: 'quick-action';
    title: string;
    description: string;
    icon: ReactNode;
    buttonLabel: string;
    buttonAction: () => void;
  }
  
  /**
   * 통합 카드 속성 (판별 유니온 타입)
   */
  export type UniversalCardProps = 
    | BoxCardProps 
    | ContentCardProps 
    | SearchResultCardProps 
    | FeatureCardProps 
    | QuickActionCardProps;
}
