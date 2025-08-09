import { apiClient } from '@/lib/apiClient';

export interface TagCloudItem {
  id: string;
  name: string;
  count: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  text_preview: string;
  html_content?: string;
  created_at: string;
  updated_at?: string;
  tags: TagCloudItem[];
  box_id: string;
  box_name: string;
  relevance_score?: number;
}

export interface SearchResponse {
  items: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface SearchQuery {
  keyword?: string;
  tags?: string[];
  box_id?: string;
  user_id?: string;
  page?: number;
  limit?: number;
  sort_by?: 'relevance' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface TagCloudResponse {
  tags: TagCloudItem[];
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: any;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// 목업 태그 클라우드 데이터
const mockTagCloud: TagCloudItem[] = [
  { id: "1", name: "AI", count: 42 },
  { id: "2", name: "Machine Learning", count: 35 },
  { id: "3", name: "Python", count: 28 },
  { id: "4", name: "Research", count: 22 },
  { id: "5", name: "Neural Networks", count: 19 },
  { id: "6", name: "Deep Learning", count: 17 },
  { id: "7", name: "Data Science", count: 15 },
  { id: "8", name: "Statistics", count: 12 },
  { id: "9", name: "Programming", count: 10 },
  { id: "10", name: "Algorithm", count: 8 }
];

// 목업 관련 태그 데이터
const mockRelatedTags: Record<string, TagCloudItem[]> = {
  "AI": [
    { id: "5", name: "Neural Networks", count: 19 },
    { id: "6", name: "Deep Learning", count: 17 },
    { id: "2", name: "Machine Learning", count: 35 }
  ],
  "Machine Learning": [
    { id: "1", name: "AI", count: 42 },
    { id: "7", name: "Data Science", count: 15 },
    { id: "10", name: "Algorithm", count: 8 }
  ],
  "Python": [
    { id: "9", name: "Programming", count: 10 },
    { id: "7", name: "Data Science", count: 15 },
    { id: "3", name: "Research", count: 22 }
  ]
};

// 목업 검색 결과 데이터
const mockSearchResults: SearchResultItem[] = [
  {
    id: "1",
    title: "인공지능의 기초와 활용 방안",
    text_preview: "이 문서는 인공지능의 기본 개념과 다양한 산업에서의 활용 사례를 소개합니다. 머신러닝, 딥러닝 등의 핵심 개념을 설명하고 있습니다.",
    created_at: "2023-05-15T09:30:00Z",
    updated_at: "2023-06-20T14:22:00Z",
    tags: [
      { id: "1", name: "AI", count: 42 },
      { id: "2", name: "Machine Learning", count: 35 }
    ],
    box_id: "box1",
    box_name: "기술 문서"
  },
  {
    id: "2",
    title: "파이썬으로 시작하는 데이터 분석",
    text_preview: "파이썬 프로그래밍 언어를 활용한 데이터 분석 방법론을 소개합니다. Pandas, NumPy, Matplotlib 등의 라이브러리 활용법을 다룹니다.",
    created_at: "2023-07-10T11:15:00Z",
    updated_at: "2023-08-05T16:40:00Z",
    tags: [
      { id: "3", name: "Python", count: 28 },
      { id: "7", name: "Data Science", count: 15 }
    ],
    box_id: "box2",
    box_name: "프로그래밍 가이드"
  },
  {
    id: "3",
    title: "딥러닝 신경망의 이해",
    text_preview: "딥러닝 신경망의 구조와 작동 원리에 대한 심층적인 설명을 제공합니다. CNN, RNN, Transformer 등 주요 아키텍처를 비교 분석합니다.",
    created_at: "2023-09-22T13:45:00Z",
    updated_at: "2023-10-10T09:20:00Z",
    tags: [
      { id: "5", name: "Neural Networks", count: 19 },
      { id: "6", name: "Deep Learning", count: 17 },
      { id: "1", name: "AI", count: 42 }
    ],
    box_id: "box1",
    box_name: "기술 문서"
  },
  {
    id: "4",
    title: "통계적 기계학습 방법론",
    text_preview: "기계학습에 활용되는 통계적 방법론에 대한 설명과 실제 적용 사례를 소개합니다. 베이지안 접근법과 빈도주의 접근법을 비교합니다.",
    created_at: "2023-11-05T10:30:00Z",
    updated_at: "2023-12-15T14:10:00Z",
    tags: [
      { id: "2", name: "Machine Learning", count: 35 },
      { id: "8", name: "Statistics", count: 12 }
    ],
    box_id: "box3",
    box_name: "연구 자료"
  }
];

// 검색 API 함수
export const searchApi = {
  /**
   * 콘텐츠 검색
   */
  async searchContents(query: SearchQuery): Promise<ApiResponse<SearchResponse>> {
    // Mock API 응답
    console.log('검색 쿼리:', query);
    
    // 실제 API가 구현되어 있지 않으므로 목업 데이터 반환
    return {
      success: true,
      data: {
        items: mockSearchResults,
        total: mockSearchResults.length,
        page: query.page || 1,
        limit: query.limit || 20,
        has_more: false
      }
    };
  },

  /**
   * 태그 클라우드 가져오기
   */
  async getTagCloud(limit?: number, boxId?: string): Promise<ApiResponse<TagCloudResponse>> {
    // Mock API 응답
    return {
      success: true,
      data: {
        tags: mockTagCloud
      }
    };
  },

  /**
   * 관련 태그 가져오기
   */
  async getRelatedTags(tagName: string, limit?: number): Promise<ApiResponse<TagCloudResponse>> {
    // Mock API 응답
    const relatedTags = mockRelatedTags[tagName] || [];
    
    return {
      success: true,
      data: {
        tags: relatedTags
      }
    };
  }
};
