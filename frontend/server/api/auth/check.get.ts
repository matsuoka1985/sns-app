// === Nuxt サーバーAPI：認証チェック ===
// ファイル名 check.get.ts → GET /api/auth/check にマッピング
import type { AuthCheckResponse } from '~/types';

export default defineEventHandler(async (event): Promise<AuthCheckResponse> => {
  const DEBUG_LOGS = false; // デバッグログの表示制御

  try {
    if (DEBUG_LOGS) console.log(' [NUXT API] 認証チェック開始')

    // === Cookie解析 ===
    // parseCookies: Nuxt標準関数でHTTPリクエストからCookieを抽出
    const cookies = parseCookies(event);
    const authJwtCookie = cookies.auth_jwt; // JWTトークンを取得

    if (DEBUG_LOGS) {
      console.log(' [NUXT API] 利用可能なCookie:', Object.keys(cookies));
      console.log(' [NUXT API] auth_jwt Cookie:', authJwtCookie ? 'あり' : 'なし');
      // substring()でJWTの一部のみログ出力（セキュリティ考慮）
      console.log(' [NUXT API] auth_jwt Cookie値（一部）:', authJwtCookie ? authJwtCookie.substring(0, 50) + '...' : 'なし');
    }

    // === JWT存在チェック ===
    if (!authJwtCookie) {
      console.log(' [NUXT API] JWTCookieなし');
      // 早期リターン：JWTがない場合は未認証として即座に応答
      return {
        authenticated: false,
        message: 'JWTCookieが見つかりません'
      }
    }

    console.log(' [NUXT API] Laravel APIにJWT認証チェック委譲');

    // === Laravel API への認証処理委譲 ===
    // $fetch: Nuxt標準のHTTPクライアント
    // 環境変数からLaravelサーバーURLを取得
    const config = useRuntimeConfig()
    const laravelUrl = config.apiBaseUrlServer || 'http://nginx'
    const response = await $fetch<AuthCheckResponse>(`${laravelUrl}/api/auth/check`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        // Cookieヘッダーを手動で構築してLaravel側に転送
        'Cookie': `auth_jwt=${authJwtCookie}`
      }
    })

    console.log(' [NUXT API] Laravel API レスポンス:', response)

    // Laravel APIのレスポンスをそのままクライアントに返す
    return response

  } catch (error) {
    // === エラーハンドリング ===
    console.error('[NUXT API] 認証チェックエラー:', error)
    // 統一された形式でエラーレスポンス返却
    return {
      authenticated: false,
      message: 'サーバーサイド認証チェックエラー',
      error: error instanceof Error ? error.message : '未知のエラー'
    }
  }
})