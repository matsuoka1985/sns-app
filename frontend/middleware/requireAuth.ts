export default defineNuxtRouteMiddleware(async (to, from) => {
  // サーバーサイドでの認証チェック（ちらつき防止）
  if (import.meta.server) {
    try {
      console.log('🔐 [AUTH MIDDLEWARE SERVER] 認証必須ページ - 認証チェック開始')
      
      // リクエストイベントからCookieを取得
      const event = useRequestEvent()
      const cookieHeader = event.node.req.headers.cookie || ''
      console.log('🔐 [AUTH MIDDLEWARE SERVER] Cookie header:', cookieHeader.includes('auth_jwt') ? 'JWT あり' : 'JWT なし')
      
      // Nuxt APIを使用してJWT検証
      const authCheck = await $fetch('/api/auth/check', {
        headers: {
          'Cookie': cookieHeader
        }
      })
      
      console.log('🔐 [AUTH MIDDLEWARE SERVER] 認証チェック結果:', authCheck)
      
      if (!authCheck.authenticated) {
        console.log('🔐 [AUTH MIDDLEWARE SERVER] 未認証 - ログインページにリダイレクト')
        return navigateTo('/login')
      } else {
        console.log('🔐 [AUTH MIDDLEWARE SERVER] 認証済み - ページ表示許可')
      }
    } catch (error) {
      console.error('🔐 [AUTH MIDDLEWARE SERVER] 認証チェックエラー:', error)
      // エラーの場合はログインページにリダイレクト（安全側に倒す）
      return navigateTo('/login')
    }
    return
  }
  
  // クライアントサイドでの認証チェック（フォールバック）
  console.log('🔐 [AUTH MIDDLEWARE CLIENT] クライアントサイド認証チェック開始')
  
  try {
    const authCheck = await $fetch('/api/auth/check', {
      credentials: 'include'
    })
    console.log('🔐 [AUTH MIDDLEWARE CLIENT] 認証チェック結果:', authCheck)
    
    if (!authCheck.authenticated) {
      console.log('🔐 [AUTH MIDDLEWARE CLIENT] 未認証 - ログインページにリダイレクト')
      await navigateTo('/login')
      return
    }
  } catch (error) {
    console.error('🔐 [AUTH MIDDLEWARE CLIENT] 認証チェックエラー:', error)
    // エラーの場合はログインページにリダイレクト
    await navigateTo('/login')
  }
})