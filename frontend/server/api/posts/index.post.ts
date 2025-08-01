export default defineEventHandler(async (event) => {
  try {
    // HttpOnly CookieからJWTを取得
    const authJwt = getCookie(event, 'auth_jwt')
    
    if (!authJwt) {
      return {
        success: false,
        error: '認証が必要です'
      }
    }

    // リクエストボディを取得
    const body = await readBody(event)

    // Laravel APIにプロキシ (Docker環境ではnginxコンテナ名を使用)
    const baseURL = 'http://nginx'
    const response = await $fetch(`${baseURL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_jwt=${authJwt}`
      },
      body: body
    })

    return response

  } catch (error) {
    console.error('🔐 [POSTS API] 投稿作成エラー:', error)
    return {
      success: false,
      error: '投稿作成でエラーが発生しました'
    }
  }
})