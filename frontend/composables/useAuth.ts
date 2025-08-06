// Firebase認証状態を管理するコンポザブル
export const useAuth = () => {
  const user = ref(null)
  const loading = ref(true)


  // Firebase認証状態の監視
  const checkAuthState = () => {
    const { $firebaseAuth } = useNuxtApp()
    
    return new Promise((resolve) => {
      const unsubscribe = $firebaseAuth.onAuthStateChanged((firebaseUser) => {
        user.value = firebaseUser
        loading.value = false
        console.log('🔍 認証状態確認:', firebaseUser ? 'ログイン中' : 'ログアウト中')
        resolve(firebaseUser)
        unsubscribe() // 一度確認したら監視を停止
      })
    })
  }

  // ログイン状態をチェックして、必要に応じてリダイレクト
  const redirectIfAuthenticated = async (redirectTo: string = '/') => {
    await checkAuthState()
    
    if (user.value) {
      console.log('👤 ログイン中のユーザーを', redirectTo, 'にリダイレクト')
      await navigateTo(redirectTo)
      return true
    }
    return false
  }

  // 未ログイン状態をチェックして、必要に応じてリダイレクト
  const redirectIfNotAuthenticated = async (redirectTo: string = '/login') => {
    await checkAuthState()
    
    if (!user.value) {
      console.log('🚫 未ログインユーザーを', redirectTo, 'にリダイレクト')
      await navigateTo(redirectTo)
      return true
    }
    return false
  }

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST'
      })
      await navigateTo('/login')
    } catch (error) {
      console.error('ログアウトエラー:', error)
      // エラーが発生してもログイン画面に遷移
      await navigateTo('/login')
    }
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    checkAuthState,
    redirectIfAuthenticated,
    redirectIfNotAuthenticated,
    handleLogout
  }
}