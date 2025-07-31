export default defineEventHandler(async (event) => {
  const DEBUG_LOGS = false; // ログのON/OFF切り替え
  
  try {
    if (DEBUG_LOGS) console.log('🔥 [NUXT API] 認証チェック開始')
    
    // クライアントからのCookieを取得
    const cookies = parseCookies(event)
    const authJwtCookie = cookies.auth_jwt
    
    if (DEBUG_LOGS) {
      console.log('🔥 [NUXT API] 利用可能なCookie:', Object.keys(cookies))
      console.log('🔥 [NUXT API] auth_jwt Cookie:', authJwtCookie ? 'あり' : 'なし')
      console.log('🔥 [NUXT API] auth_jwt Cookie値（一部）:', authJwtCookie ? authJwtCookie.substring(0, 50) + '...' : 'なし')
    }
    
    if (!authJwtCookie) {
      console.log('🔥 [NUXT API] JWTCookieなし')
      return {
        authenticated: false,
        message: 'JWTCookieが見つかりません'
      }
    }
    
    console.log('🔥 [NUXT API] Laravel APIにJWT認証チェック委譲')
    
    // Laravel APIに認証チェックを委譲
    const response = await $fetch('http://nginx/api/auth/check', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': `auth_jwt=${authJwtCookie}`
      }
    })
    
    console.log('🔥 [NUXT API] Laravel API レスポンス:', response)
    
    return response
    
  } catch (error) {
    console.error('🔥 [NUXT API] 認証チェックエラー:', error)
    return {
      authenticated: false,
      error: 'サーバーサイド認証チェックエラー'
    }
  }
})