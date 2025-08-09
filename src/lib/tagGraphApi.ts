import { apiClient } from './apiClient';
import tokenUtils from './tokenUtils';

/**
 * 태그 그래프 노드 타입
 */
export interface TagNode {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  cluster_id?: number;
  weight: number;
}

/**
 * 태그 그래프 엣지 타입
 */
export interface TagEdge {
  source: string;
  target: string;
  strength: number;
}

/**
 * 태그 그래프 데이터 타입
 */
export interface TagGraphData {
  nodes: TagNode[];
  edges: TagEdge[];
  clusters: Record<number, string[]>;
}

/**
 * 관련 태그 타입
 */
export interface RelatedTag {
  id: string;
  name: string;
  score: number;
}

/**
 * 추천 태그 타입
 */
export interface RecommendedTag {
  id: string;
  name: string;
  score: number;
  reason?: string;
}

/**
 * 컨텍스트 아이템 타입
 */
export interface ContextItem {
  id: string;
  title: string;
  content: string;
  source_type: string;
  relevance_score: number;
  metadata?: Record<string, any>;
}

/**
 * 채팅 쿼리 타입
 */
export interface ChatQuery {
  query: string;
  user_id?: string;
  context_items?: ContextItem[];
  max_tokens?: number;
  temperature?: number;
}

/**
 * 채팅 응답 타입
 */
export interface ChatResponse {
  response: string;
  context_items_used: ContextItem[];
  tokens_used: number;
}

/**
 * 태그 그래프 데이터 가져오기
 * 
 * @param userId 사용자 ID (선택적)
 * @param tagIds 태그 ID 목록 (선택적)
 * @param minStrength 최소 관계 강도 (기본값: 0.1)
 * @param maxTags 최대 태그 수 (기본값: 100)
 * @returns 태그 그래프 데이터
 */
export const getTagGraph = async (
  userId?: string,
  tagIds?: string[],
  minStrength: number = 0.1,
  maxTags: number = 100
): Promise<TagGraphData> => {
  const params = new URLSearchParams();
  
  if (userId) {
    params.append('user_id', userId);
  }
  
  if (tagIds && tagIds.length > 0) {
    tagIds.forEach(id => params.append('tag_ids', id));
  }
  
  params.append('min_strength', minStrength.toString());
  params.append('max_tags', maxTags.toString());
  
  const response = await apiClient.fetchWithAuth<TagGraphData>(`/tags/graph?${params.toString()}`);
  return response.data as TagGraphData;
};

/**
 * 관련 태그 가져오기
 * 
 * @param tagIds 기준 태그 ID 목록
 * @param userId 사용자 ID (선택적)
 * @param maxResults 최대 결과 수 (기본값: 10)
 * @returns 관련 태그 목록
 */
export const getRelatedTags = async (
  tagIds: string[],
  userId?: string,
  maxResults: number = 10
): Promise<RelatedTag[]> => {
  const params = new URLSearchParams();
  
  tagIds.forEach(id => params.append('tag_ids', id));
  
  if (userId) {
    params.append('user_id', userId);
  }
  
  params.append('max_results', maxResults.toString());
  
  const response = await apiClient.fetchWithAuth<RelatedTag[]>(`/tags/related?${params.toString()}`);
  return response.data as RelatedTag[];
};

/**
 * 추천 태그 가져오기
 * 
 * @param maxRecommendations 최대 추천 수 (기본값: 10)
 * @returns 추천 태그 목록
 */
export const getTagRecommendations = async (
  maxRecommendations: number = 10
): Promise<RecommendedTag[]> => {
  const params = new URLSearchParams();
  params.append('max_recommendations', maxRecommendations.toString());
  
  const response = await apiClient.fetchWithAuth<RecommendedTag[]>(`/tags/recommendations?${params.toString()}`);
  return response.data as RecommendedTag[];
};

/**
 * 쿼리에 대한 개인화된 컨텍스트 가져오기
 * 
 * @param query 사용자 쿼리
 * @param userId 사용자 ID (선택적)
 * @param maxItems 최대 컨텍스트 아이템 수 (기본값: 5)
 * @returns 컨텍스트 아이템 목록
 */
export const getQueryContext = async (
  query: string,
  userId?: string,
  maxItems: number = 5
): Promise<ContextItem[]> => {
  const params = new URLSearchParams();
  
  params.append('query', query);
  
  if (userId) {
    params.append('user_id', userId);
  }
  
  params.append('max_items', maxItems.toString());
  
  const response = await apiClient.fetchWithAuth<ContextItem[]>(`/llm/context?${params.toString()}`);
  return response.data as ContextItem[];
};

/**
 * LLM 채팅 쿼리 전송
 * 
 * @param chatQuery 채팅 쿼리 정보
 * @returns 채팅 응답
 */
export const chatWithLLM = async (chatQuery: ChatQuery): Promise<ChatResponse> => {
  const response = await apiClient.fetchWithAuth<ChatResponse>('/llm/chat', {
    method: 'POST',
    body: JSON.stringify(chatQuery)
  });
  return response.data as ChatResponse;
};
