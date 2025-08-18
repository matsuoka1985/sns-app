export default defineEventHandler(async (event) => {
  const postId = getRouterParam(event, 'id');

  // HTTP-Only クッキーから JWT を取得（オプショナル）
  const jwt = getCookie(event, 'auth_jwt')

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    }

    // JWT があれば Cookie ヘッダーを追加
    if (jwt) {
      headers['Cookie'] = `auth_jwt=${jwt}`
    }

    // Laravel API にプロキシ (Docker環境ではnginxコンテナ名を使用)
    const baseURL = 'http://nginx'
    const response = await $fetch(`${baseURL}/api/posts/${postId}`, {
      method: 'GET',
      headers
    })

    return response
  } catch (error: any) {
    console.error(' [POST DETAIL API] 投稿詳細取得エラー:', error);

    return {
      success: false,
      error: '投稿詳細の取得に失敗しました'
    }
  }
})