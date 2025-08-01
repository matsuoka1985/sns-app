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

    // URLから投稿IDを取得
    const postId = getRouterParam(event, 'id')

    // Laravel APIにプロキシ（いいね追加）
    const baseURL = 'http://nginx'
    const response = await $fetch(`${baseURL}/api/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_jwt=${authJwt}`
      }
    })

    return response

  } catch (error) {
    console.error('🔐 [LIKE API] いいね追加エラー:', error)
    return {
      success: false,
      error: 'いいね追加でエラーが発生しました'
    }
  }
})