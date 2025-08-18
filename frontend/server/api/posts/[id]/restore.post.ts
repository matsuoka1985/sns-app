export default defineEventHandler(async (event) => {
  try {
    // HttpOnly CookieからJWTを取得
    const authJwt = getCookie(event, 'auth_jwt');

    if (!authJwt) {
      return {
        success: false,
        error: '認証が必要です'
      };
    }

    // URLから投稿IDを取得
    const postId = getRouterParam(event, 'id');

    // Laravel APIにプロキシ（投稿復元）
    const baseURL = 'http://nginx';
    const response = await $fetch(`${baseURL}/api/posts/${postId}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_jwt=${authJwt}`
      }
    });

    return response;

  } catch (error) {
    console.error(' [RESTORE API] 投稿復元エラー:', error);
    return {
      success: false,
      error: '投稿の復元でエラーが発生しました'
    };
  }
})