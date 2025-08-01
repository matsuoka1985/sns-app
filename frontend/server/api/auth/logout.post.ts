export default defineEventHandler(async (event) => {
  try {
    // HttpOnly Cookieを削除
    setCookie(event, 'auth_jwt', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // 即座に期限切れ
      path: '/'
    })

    console.log('🔐 [LOGOUT API] HttpOnly Cookie削除完了')

    return {
      success: true,
      message: 'ログアウトしました'
    }

  } catch (error) {
    console.error('🔐 [LOGOUT API] ログアウトエラー:', error)
    return {
      success: false,
      error: 'ログアウト処理でエラーが発生しました'
    }
  }
})