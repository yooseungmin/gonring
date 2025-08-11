/**
 * 더미 데이터를 위한 타입 정의
 */

import { Tag } from './models';

/**
 * 더미 컨텐츠 검색 결과 아이템
 */
export interface MockContentSearchResult {
  id: string;
  title: string;
  text_preview: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  box_id: string;
  box_name: string;
}
