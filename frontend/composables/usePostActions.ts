import type { Post } from '~/types'

/**
 * 投稿の削除・復元処理を管理するcomposable
 * 楽観的更新とエラーハンドリングを一元管理
 */
export const usePostActions = () => {
  const { error: showErrorToast, success: showSuccessToast } = useToast()

  /**
   * 投稿削除ハンドラー（一覧用 - 楽観的更新対応）
   * @param postId 削除する投稿ID
   * @param posts 投稿一覧のref
   * @returns Promise<void>
   */
  const handlePostDeletedInList = async (postId: number, posts: Ref<Post[]>) => {
    // 削除確認
    if (!confirm('この投稿を削除してもよろしいですか？')) {
      return
    }

    // 削除対象の投稿とその位置を保存
    const targetIndex = posts.value.findIndex(post => post.id === postId)
    if (targetIndex === -1) return

    const targetPost = posts.value[targetIndex]

    // 楽観的更新：即座にUIから削除
    posts.value = posts.value.filter(post => post.id !== postId)
    console.log('🚀 楽観的削除実行:', postId, '元のindex:', targetIndex)

    try {
      // バックグラウンドでAPI呼び出し
      const response = await $fetch(`/api/posts/${postId}`, {
        method: 'DELETE'
      })

      if (response.success) {
        console.log('✅ 投稿削除成功:', response.message)
        // 成功時は何もしない（既にUIから削除済み）
        // 復元アクション付きトーストを表示
        showSuccessToast('投稿を削除しました', 8000, {
          label: '復元しますか？',
          action: () => restorePostInList(postId, targetPost, targetIndex, posts)
        })
      } else {
        console.error('❌ 投稿削除失敗:', response.error)
        // 失敗時は元の位置に投稿を復元
        posts.value.splice(targetIndex, 0, targetPost)
        console.log('🔄 投稿復元完了 (index:', targetIndex, '):', targetPost)
        showErrorToast('投稿の削除に失敗しました')
      }
    } catch (error: any) {
      console.error('投稿削除エラー:', error)

      // エラー時は元の位置に投稿を復元
      posts.value.splice(targetIndex, 0, targetPost)
      console.log('🔄 投稿復元完了 (index:', targetIndex, '):', targetPost)

      // エラー種別に応じたメッセージ
      if (error.status === 403) {
        showErrorToast('他のユーザーの投稿は削除できません')
      } else if (error.status === 404) {
        showErrorToast('投稿が見つかりません')
      } else if (error.status === 401) {
        showErrorToast('ログインが必要です')
      } else {
        showErrorToast('ネットワークエラーが発生しました')
      }
    }
  }

  /**
   * 投稿削除ハンドラー（詳細ページ用）
   * @param postId 削除する投稿ID
   * @returns Promise<void>
   */
  const handlePostDeletedInDetail = async (postId: number) => {
    if (!confirm('この投稿を削除してもよろしいですか？')) {
      return
    }

    try {
      const response = await $fetch(`/api/posts/${postId}`, {
        method: 'DELETE'
      })

      if (response.success) {
        showSuccessToast('投稿を削除しました', 8000, {
          label: '復元しますか？',
          action: () => restorePostInDetail(postId)
        })
        setTimeout(async () => {
          await navigateTo('/')
        }, 2000)
      } else {
        showErrorToast('投稿の削除に失敗しました')
      }
    } catch (error: any) {
      console.error('投稿削除エラー:', error)
      if (error.status === 403) {
        showErrorToast('他のユーザーの投稿は削除できません')
      } else if (error.status === 404) {
        showErrorToast('投稿が見つかりません')
      } else {
        showErrorToast('ネットワークエラーが発生しました')
      }
    }
  }

  /**
   * 投稿復元処理（一覧用）
   * @param postId 復元する投稿ID
   * @param post 復元する投稿オブジェクト
   * @param originalIndex 元の位置
   * @param posts 投稿一覧のref
   * @returns Promise<void>
   */
  const restorePostInList = async (postId: number, post: Post, originalIndex: number, posts: Ref<Post[]>) => {
    try {
      console.log('🔄 投稿復元開始:', postId)

      const response = await $fetch(`/api/posts/${postId}/restore`, {
        method: 'POST'
      })

      if (response.success) {
        console.log('✅ 投稿復元成功:', response.message)
        // 元の位置に投稿を復元
        posts.value.splice(originalIndex, 0, post)
        showSuccessToast('投稿を復元しました')
      } else {
        console.error('❌ 投稿復元失敗:', response.error)
        showErrorToast('投稿の復元に失敗しました')
      }
    } catch (error) {
      console.error('投稿復元エラー:', error)
      showErrorToast('投稿の復元でエラーが発生しました')
    }
  }

  /**
   * 投稿復元処理（詳細ページ用）
   * @param postId 復元する投稿ID
   * @returns Promise<void>
   */
  const restorePostInDetail = async (postId: number) => {
    try {
      console.log('🔄 投稿復元開始:', postId)

      const response = await $fetch(`/api/posts/${postId}/restore`, {
        method: 'POST'
      })

      if (response.success) {
        console.log('✅ 投稿復元成功:', response.message)
        showSuccessToast('投稿を復元しました')
        await navigateTo(`/posts/${postId}`)
      } else {
        console.error('❌ 投稿復元失敗:', response.error)
        showErrorToast('投稿の復元に失敗しました')
      }
    } catch (error) {
      console.error('投稿復元エラー:', error)
      showErrorToast('投稿の復元でエラーが発生しました')
    }
  }

  return {
    handlePostDeletedInList,
    handlePostDeletedInDetail,
    restorePostInList,
    restorePostInDetail
  }
}