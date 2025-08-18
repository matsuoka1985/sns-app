// === Nuxt サーバーAPI：ログイン処理 ===
// ファイル名 login.post.ts → POST /api/auth/login にマッピング
export default defineEventHandler(async (event) => {
  try {
    // === リクエストボディ取得 ===
    // readBody: Nuxt標準関数でPOSTデータを取得
    const body = await readBody(event);
    // 分割代入でidTokenプロパティを抽出
    const { idToken } = body;

    // === バリデーション ===
    if (!idToken) {
      // 早期リターン：必須パラメータがない場合
      return {
        success: false,
        error: 'IDトークンが必要です'
      }
    }

    // === Firebase トークン検証 ===
    // 動的インポート：必要時のみモジュールを読み込み（パフォーマンス向上）
    const { verifyFirebaseToken } = await import('~/utils/firebase-auth');
    const verificationResult = await verifyFirebaseToken(idToken);

    if (!verificationResult.authenticated) {
      return {
        success: false,
        error: 'トークンの検証に失敗しました'
      }
    }

    // === セキュアなCookie設定 ===
    // setCookie: Nuxt標準のCookie設定関数
    setCookie(event, 'auth_jwt', idToken, {
      httpOnly: true, // JavaScript からアクセス不可（XSS対策）
      secure: process.env.NODE_ENV === 'production', // HTTPS必須（本番環境のみ）
      sameSite: 'lax', // CSRF攻撃対策（適度な制限）
      maxAge: 60 * 60, // 有効期限：1時間（秒単位）
      path: '/' // Cookie の適用範囲：全パス
    });

    console.log('[LOGIN API] HttpOnly Cookie設定完了');

    // === 成功レスポンス ===
    return {
      success: true,
      user: {
        uid: verificationResult.uid, // Firebase ユーザーID
        email: verificationResult.email // ユーザーメールアドレス
      }
    }

  } catch (error) {
    // === エラーハンドリング ===
    console.error('[LOGIN API] ログインエラー:', error);
    // 統一された形式でエラーレスポンス返却
    return {
      success: false,
      error: 'ログイン処理でエラーが発生しました'
    };
  }
});