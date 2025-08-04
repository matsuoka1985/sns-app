export default defineEventHandler(async (event) => {
  const postId = getRouterParam(event, 'id')
  const query = getQuery(event)
  
  // HTTP-Only クッキーから JWT を取得（オプショナル）
  const jwt = getCookie(event, 'auth_jwt')

  try {
    // クエリパラメータを準備
    const queryParams = new URLSearchParams()
    if (query.page) queryParams.set('page', query.page as string)
    if (query.per_page) queryParams.set('per_page', query.per_page as string)
    
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    }
    
    // JWT があれば Cookie ヘッダーを追加
    if (jwt) {
      headers['Cookie'] = `auth_jwt=${jwt}`
    }

    // Laravel API にプロキシ (Docker環境ではnginxコンテナ名を使用)
    const baseURL = 'http://nginx'
    const url = `${baseURL}/api/posts/${postId}/comments?${queryParams.toString()}`
    console.log('コメント取得URL:', url)
    
    const response = await $fetch(url, {
      method: 'GET',
      headers
    })

    console.log('コメント取得レスポンス:', response)
    return response
  } catch (error: any) {
    console.error('🔐 [COMMENTS API] コメント一覧取得エラー:', error)
    
    return {
      success: false,
      error: 'コメントの取得に失敗しました'
    }
  }
})