// サーバーサイド専用のFirebase認証ユーティリティ（超高速化版）

// Firebase Admin インスタンスをキャッシュ（シングルトン）
let _firebaseAuth: any = null

// JWT検証結果のキャッシュ（5分間有効）
const jwtCache = new Map<string, { result: any, expiry: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5分

async function getFirebaseAuth() {
  if (_firebaseAuth) {
    return _firebaseAuth
  }

  // 動的インポートでサーバーサイドのみで読み込み
  const { getAuth } = await import('firebase-admin/auth')
  const { initializeApp, getApps } = await import('firebase-admin/app')
  
  // Firebase Admin アプリの初期化（一度だけ）
  let adminApp
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'sns-app-23ac6'
    console.log('🔥 [FIREBASE AUTH] Firebase Admin SDK初期化（一度だけ）', { projectId })
    
    adminApp = initializeApp({
      projectId: projectId,
    })
  } else {
    adminApp = getApps()[0]
  }
  
  _firebaseAuth = getAuth(adminApp)
  return _firebaseAuth
}

export async function verifyFirebaseToken(idToken: string) {
  // クライアントサイドでは実行しない
  if (import.meta.client) {
    return {
      authenticated: false,
      error: 'クライアントサイドでは実行できません'
    }
  }

  try {
    // キャッシュチェック（超高速）
    const now = Date.now()
    const cached = jwtCache.get(idToken)
    if (cached && cached.expiry > now) {
      console.log('🔥 [FIREBASE AUTH] キャッシュヒット（超高速）')
      return cached.result
    }

    // 期限切れキャッシュエントリの削除
    for (const [key, value] of jwtCache.entries()) {
      if (value.expiry <= now) {
        jwtCache.delete(key)
      }
    }

    // Firebase Admin SDKで検証
    const auth = await getFirebaseAuth()
    const decodedToken = await auth.verifyIdToken(idToken)
    
    const result = {
      authenticated: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      exp: decodedToken.exp
    }

    // 結果をキャッシュ（次回超高速）
    jwtCache.set(idToken, {
      result,
      expiry: now + CACHE_DURATION
    })

    console.log('🔥 [FIREBASE AUTH] Firebase検証完了（次回キャッシュ利用）')
    return result
  } catch (error) {
    console.error('🔥 [FIREBASE AUTH] JWT検証エラー:', error)
    const result = {
      authenticated: false,
      error: error instanceof Error ? error.message : 'JWT検証に失敗しました'
    }

    // エラー結果も短期間キャッシュして重複検証を避ける
    jwtCache.set(idToken, {
      result,
      expiry: now + 60000 // 1分間
    })

    return result
  }
}