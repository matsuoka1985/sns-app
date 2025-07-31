// JWT（Firebase IDトークン）の期限チェック用ユーティリティ

/**
 * Firebase IDトークン（JWT）の有効期限をチェック
 * @param token Firebase IDトークン
 * @returns boolean 有効ならtrue、期限切れならfalse
 */
export function verifyJWTExpiration(token: string): boolean {
  try {
    if (!token || typeof token !== 'string') {
      console.log('🔍 JWT検証: 無効なトークン形式')
      return false
    }

    // JWTは 'header.payload.signature' の形式
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.log('🔍 JWT検証: 不正なJWT形式')
      return false
    }

    // payloadをデコード（Base64URL）
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    
    // 必要なフィールドが存在するかチェック
    if (!payload.exp) {
      console.log('🔍 JWT検証: 期限情報(exp)が見つかりません')
      return false
    }

    // 現在時刻とexpire時刻を比較（UNIXタイムスタンプ秒単位）
    const currentTime = Math.floor(Date.now() / 1000)
    const expirationTime = payload.exp
    
    const isValid = currentTime < expirationTime
    
    if (isValid) {
      const remainingTime = expirationTime - currentTime
      console.log(`🔍 JWT検証: 有効 (残り${Math.floor(remainingTime / 60)}分)`)
    } else {
      const expiredTime = currentTime - expirationTime
      console.log(`🔍 JWT検証: 期限切れ (${Math.floor(expiredTime / 60)}分前に期限切れ)`)
    }
    
    return isValid
    
  } catch (error) {
    console.log('🔍 JWT検証エラー:', error)
    return false
  }
}

/**
 * JWTペイロードをデコードして内容を確認（デバッグ用）
 * @param token Firebase IDトークン
 * @returns object|null ペイロード情報
 */
export function decodeJWTPayload(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload
  } catch (error) {
    console.log('JWT デコードエラー:', error)
    return null
  }
}