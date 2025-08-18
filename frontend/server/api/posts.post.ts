export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // HTTP-Only クッキーから JWT を取得
  const jwt = getCookie(event, 'auth_jwt');

  if (!jwt) {
    throw createError({
      statusCode: 401,
      statusMessage: '認証が必要です'
    });
  }

  try {
    // Laravel API にプロキシ (Docker環境ではnginxコンテナ名を使用)
    const baseURL = 'http://nginx';
    const response = await $fetch(`${baseURL}/api/posts`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': `auth_jwt=${jwt}`
      },
      body: {
        body: body.body
      }
    })

    return response
  } catch (error: any) {
    console.error(' [POSTS API] 投稿作成エラー:', error);

    return {
      success: false,
      error: '投稿の作成に失敗しました'
    };
  }
});