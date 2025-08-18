import type { LikeResponse } from '~/types';

export default defineEventHandler(async (event): Promise<LikeResponse> => {
  try {
    // HttpOnly CookieからJWTを取得
    const authJwt = getCookie(event, 'auth_jwt');

    if (!authJwt) {
      return {
        success: false,
        error: '認証が必要です'
      }
    }

    // URLから投稿IDを取得
    const postId = getRouterParam(event, 'id');

    // リクエストボディから最終的ないいね状態を取得
    const body = await readBody(event);
    const isLiked = body.isLiked;

    // いいね状態に応じて適切なHTTPメソッドを選択
    const method = isLiked ? 'POST' : 'DELETE';

    // Laravel APIにプロキシ (Docker環境ではnginxコンテナ名を使用)
    const baseURL = 'http://nginx';
    const response = await $fetch<LikeResponse>(`${baseURL}/api/posts/${postId}/like`, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_jwt=${authJwt}`
      }
    });

    // 型ガードでレスポンスの安全性を確保
    if (response && typeof response === 'object' && 'likes_count' in response) {
      return {
        success: true,
        is_liked: isLiked,
        likes_count: response.likes_count
      };
    }

    // 型ガード失敗時のフォールバック
    return {
      success: true,
      is_liked: isLiked,
      likes_count: 0
    };

  } catch (error) {
    console.error('[LIKE API] いいね処理エラー:', error);
    return {
      success: false,
      error: 'いいね処理でエラーが発生しました'
    }
  }
});