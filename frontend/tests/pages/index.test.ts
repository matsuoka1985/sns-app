import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import IndexPage from '~/pages/index.vue';
import type { Post, PostsListResponse, User } from '~/types';

// $fetchをモック
const mockFetch = vi.fn();
global.$fetch = mockFetch as unknown as typeof $fetch;

// useRuntimeConfigをモック
const mockApiBaseUrl = process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost';
vi.mock('#app', () => ({
  useRuntimeConfig: vi.fn(() => ({
    public: {
      apiBaseUrl: mockApiBaseUrl
    },
    apiBaseUrlServer: mockApiBaseUrl
  })),
  definePageMeta: vi.fn(),
  nextTick: vi.fn().mockImplementation(() => Promise.resolve())
}));

// コンポーザブルのモック
vi.mock('~/composables/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({
    isLoading: ref(false),
    hasMore: ref(true),
    handleScroll: vi.fn(),
    loadNextPage: vi.fn(),
    reset: vi.fn()
  })
}));

vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn()
  })
}));

vi.mock('~/composables/usePostActions', () => ({
  usePostActions: () => ({
    handlePostDeleted: vi.fn()
  })
}));

// useLikeコンポーザブルをモック
const mockHandleLike = vi.fn();
vi.mock('~/composables/useLike', () => ({
  useLike: () => ({
    likingPosts: ref(new Set()),
    handleLike: mockHandleLike,
    cleanup: vi.fn()
  })
}));

describe('IndexPage - いいね機能統合テスト', () => {
  const testUser: User = {
    id: 1,
    name: 'テストユーザー'
  };

  const testPost: Post = {
    id: 1,
    body: 'テスト投稿',
    user: testUser,
    likes_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    is_liked: false,
    is_owner: false
  };

  const postsListResponse: PostsListResponse = {
    success: true,
    posts: [testPost],
    current_user_id: 1,
    pagination: {
      current_page: 1,
      total: 1,
      per_page: 20
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // 投稿一覧取得のデフォルトレスポンス
    mockFetch.mockResolvedValue(postsListResponse);
    
    // useLikeのhandleLikeをリセット
    mockHandleLike.mockClear();
  });


  it('いいね済み投稿とそうでない投稿でハートアイコンのスタイルが異なる', async () => {
    // いいねしていない投稿でのハートアイコンのスタイルを取得
    const unlikedWrapper = mount(IndexPage);
    await new Promise(resolve => setTimeout(resolve, 100));
    await unlikedWrapper.vm.$nextTick();
    
    const unlikedHeartIcon = unlikedWrapper.find('img[alt="いいね"]');
    expect(unlikedHeartIcon.exists()).toBe(true);
    const unlikedClasses = unlikedHeartIcon.classes();

    // いいね済みの投稿データ
    const likedPost: Post = {
      id: 1,
      body: 'テスト投稿',
      user: testUser,
      likes_count: 1,
      created_at: '2024-01-01T00:00:00Z',
      is_liked: true,
      is_owner: false
    };

    const likedPostsResponse: PostsListResponse = {
      success: true,
      posts: [likedPost],
      current_user_id: 1,
      pagination: {
        current_page: 1,
        total: 1,
        per_page: 20
      }
    };

    // いいね済み状態でレスポンスを設定
    mockFetch.mockResolvedValue(likedPostsResponse);

    const likedWrapper = mount(IndexPage);
    await new Promise(resolve => setTimeout(resolve, 100));
    await likedWrapper.vm.$nextTick();

    // いいね済み投稿のハートアイコンのスタイルを取得
    const likedHeartIcon = likedWrapper.find('img[alt="いいね"]');
    expect(likedHeartIcon.exists()).toBe(true);
    const likedClasses = likedHeartIcon.classes();

    // 両者のスタイル（CSSクラス）が異なることを確認
    expect(likedClasses).not.toEqual(unlikedClasses);
  });
});