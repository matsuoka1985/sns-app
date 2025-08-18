import { verifyFirebaseToken } from '~/utils/firebase-auth'

// 未認証ユーザー専用ページへのアクセス制御（ログイン済みの場合は/にリダイレクト）
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) { // サーバーサイドでのみ実行（SSR最適化、ページフラッシュ防止）
    try {
      const event = useRequestEvent()
      if (!event) {
        console.log('[GUEST-ONLY] リクエストイベント取得不可 - 処理をスキップ');
        return // 早期リターンでページ表示を許可
      }

      const cookieHeader = event.node.req.headers.cookie || '' // HTTPリクエストのCookieヘッダー文字列を取得
      const authJwtMatch = cookieHeader.match(/auth_jwt=([^;]+)/) // 正規表現でauth_jwt=値を抽出
      const authJwtCookie = authJwtMatch ? authJwtMatch[1] : null // [1]でキャプチャグループの値部分のみ取得（[0]は"auth_jwt=値"全体）

      if (!authJwtCookie) {
        console.log(' [GUEST-ONLY] JWT Cookie なし - ページ表示許可')
        return // JWTなし = 未認証 = ゲストページ表示OK
      }

      console.log(' [GUEST-ONLY] Firebase JWT検証を開始');

      const authResult = await verifyFirebaseToken(authJwtCookie) // Firebase Admin SDKでJWT検証（キャッシュ利用）

      if (authResult.authenticated) {
        console.log(' [GUEST-ONLY] 認証済みユーザー検出 - ホームページにリダイレクト')
        console.log(' [GUEST-ONLY] ユーザーUID:', authResult.uid)
        return navigateTo('/') // 既にログイン済みなのでメインページに案内
      } else {
        console.log(' [GUEST-ONLY] JWT無効 - 未認証として扱いページ表示許可')
        console.log(' [GUEST-ONLY] JWT無効の理由:', authResult.error)
        // return文なし = ページ表示継続（ゲストとしてログイン・登録ページの利用を許可）
      }
    } catch (error) {
      // フェールセーフ設計：エラー時は制限的ではなく許可的に動作（アプリケーションの可用性を最優先）
      console.error(' [GUEST-ONLY] 認証チェック中に予期しないエラーが発生:', error)
      console.error(' [GUEST-ONLY] エラーの詳細:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        cause: error instanceof Error ? error.cause : undefined
      })
      console.log('[GUEST-ONLY] エラー時はフェールセーフでゲスト扱い - ページ表示許可')
      // エラーの場合はページ表示を許可（return文なし = 処理継続）
    }
  }
  // クライアントサイドでは何も実行しない（サーバーで十分、パフォーマンス最適化）
})