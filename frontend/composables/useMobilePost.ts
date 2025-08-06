import type { Post } from '~/types'

/**
 * モバイル投稿処理を管理するcomposable
 * フォームのバリデーション、API呼び出し、エラーハンドリングを一元管理
 */
export const useMobilePost = () => {
  const { error: showErrorToast, success: showSuccessToast } = useToast()
  
  /**
   * モバイル投稿処理（一覧ページ用）
   * @param postBody 投稿内容
   * @param onSuccess 投稿成功時のコールバック
   * @param onComplete 処理完了時のコールバック
   * @returns Promise<boolean> - 成功時true
   */
  const createMobilePostForList = async (
    postBody: string,
    onSuccess?: (post: Post) => void,
    onComplete?: () => void
  ): Promise<boolean> => {
    // バリデーション
    if (!postBody || postBody.trim() === '') {
      return false
    }
    
    if (postBody.length > 120) {
      return false
    }

    try {
      const response = await $fetch('/api/posts', {
        method: 'POST',
        body: { body: postBody.trim() }
      })

      if (response.success && response.post) {
        // 成功時の処理
        if (onSuccess) {
          onSuccess(response.post)
        }
        
        showSuccessToast('投稿しました！', 5000, {
          label: '詳細を見る',
          to: `/posts/${response.post.id}`
        })
        
        return true
      } else {
        showErrorToast('投稿の作成に失敗しました')
        return false
      }
    } catch (error) {
      console.error('投稿作成エラー:', error)
      showErrorToast('投稿の作成に失敗しました')
      return false
    } finally {
      if (onComplete) {
        onComplete()
      }
    }
  }

  /**
   * モバイル投稿処理（詳細ページ用）
   * @param postBody 投稿内容
   * @param onComplete 処理完了時のコールバック
   * @returns Promise<boolean> - 成功時true
   */
  const createMobilePostForDetail = async (
    postBody: string,
    onComplete?: () => void
  ): Promise<boolean> => {
    // バリデーション
    if (!postBody || postBody.trim() === '') {
      return false
    }
    
    if (postBody.length > 120) {
      return false
    }

    try {
      const response = await $fetch('/api/posts', {
        method: 'POST',
        body: { body: postBody.trim() }
      })

      if (response.success && response.post) {
        showSuccessToast('投稿しました！', 5000, {
          label: '詳細を見る',
          to: `/posts/${response.post.id}`
        })
        // 投稿詳細ページなので一覧には追加しない
        return true
      } else {
        showErrorToast('投稿の作成に失敗しました')
        return false
      }
    } catch (error) {
      console.error('投稿作成エラー:', error)
      showErrorToast('投稿の作成に失敗しました')
      return false
    } finally {
      if (onComplete) {
        onComplete()
      }
    }
  }

  return {
    createMobilePostForList,
    createMobilePostForDetail
  }
}