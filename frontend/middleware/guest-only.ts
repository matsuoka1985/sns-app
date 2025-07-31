import { verifyFirebaseToken } from '~/utils/firebase-auth'

export default defineNuxtRouteMiddleware(async () => {
  // サーバーサイドでのFirebase JWT検証（キャッシュ付き超高速）
  if (import.meta.server) {
    try {
      const event = useRequestEvent()
      if (!event) return
      
      // Cookieから直接JWTを取得
      const cookieHeader = event.node.req.headers.cookie || ''
      const authJwtMatch = cookieHeader.match(/auth_jwt=([^;]+)/)
      const authJwtCookie = authJwtMatch ? authJwtMatch[1] : null
      
      if (!authJwtCookie) {
        console.log('🚫 [GUEST MIDDLEWARE] JWT Cookie なし - ページ表示許可')
        return
      }
      
      // Firebase JWT検証（キャッシュ利用で2回目以降は超高速）
      const authResult = await verifyFirebaseToken(authJwtCookie)
      
      if (authResult.authenticated) {
        console.log('🚫 [GUEST MIDDLEWARE] 認証済み - ホームページにリダイレクト')
        return navigateTo('/')
      } else {
        console.log('🚫 [GUEST MIDDLEWARE] JWT無効 - ページ表示許可')
      }
    } catch (error) {
      console.error('🚫 [GUEST MIDDLEWARE] 認証チェックエラー:', error)
      // エラーの場合はページ表示を許可（ゲスト扱い）
    }
  }
})