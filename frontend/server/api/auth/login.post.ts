export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { idToken } = body

    if (!idToken) {
      return {
        success: false,
        error: 'IDトークンが必要です'
      }
    }

    // Firebase Admin SDKでトークンを検証
    const { verifyFirebaseToken } = await import('~/utils/firebase-auth')
    const verificationResult = await verifyFirebaseToken(idToken)

    if (!verificationResult.authenticated) {
      return {
        success: false,
        error: 'トークンの検証に失敗しました'
      }
    }

    // HttpOnly Cookieを設定
    setCookie(event, 'auth_jwt', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1時間
      path: '/'
    })

    console.log('🔐 [LOGIN API] HttpOnly Cookie設定完了')

    return {
      success: true,
      user: {
        uid: verificationResult.uid,
        email: verificationResult.email
      }
    }

  } catch (error) {
    console.error('🔐 [LOGIN API] ログインエラー:', error)
    return {
      success: false,
      error: 'ログイン処理でエラーが発生しました'
    }
  }
})