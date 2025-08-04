import type { Post } from '~/types'

export const useLike = () => {
  // 処理中のpostIdを追跡
  const likingPosts = ref<Set<number>>(new Set())
  // デバウンス用タイマー
  const likeTimeouts = ref<Map<number, NodeJS.Timeout>>(new Map())
  // 保留中のいいね状態
  const pendingLikes = ref<Map<number, boolean>>(new Map())

  // トースト機能
  const { error: showErrorToast } = useToast()

  // いいねハンドラー（デバウンス付き楽観的更新）
  const handleLike = (post: Post | null, posts?: Ref<Post[]>) => {
    if (!post) return

    const postId = post.id

    // 既にリクエスト中の場合は処理しない（409防止）
    if (likingPosts.value.has(postId)) {
      console.log('🔒 いいね処理中のため無視:', postId)
      return
    }

    // 既存のタイマーをクリア
    if (likeTimeouts.value.has(postId)) {
      clearTimeout(likeTimeouts.value.get(postId)!)
      likeTimeouts.value.delete(postId)
    }

    // 楽観的更新（即座にUIを更新）
    const wasLiked = post.is_liked
    post.is_liked = !wasLiked
    post.likes_count += wasLiked ? -1 : 1

    // 投稿一覧がある場合は一覧側も更新
    if (posts?.value) {
      const listPost = posts.value.find(p => p.id === postId)
      if (listPost) {
        listPost.is_liked = post.is_liked
        listPost.likes_count = post.likes_count
      }
    }

    // 最終的ないいね状態を保存
    pendingLikes.value.set(postId, post.is_liked)

    // 処理中状態にマーク（409防止の重要なロック）
    likingPosts.value.add(postId)

    // 500msデバウンス（より長い時間で安全性向上）
    const timeout = setTimeout(async () => {
      await executeLikeRequest(postId, post, posts)
    }, 500)

    likeTimeouts.value.set(postId, timeout)
  }

  // 実際のいいねリクエストを実行
  const executeLikeRequest = async (postId: number, post: Post, posts?: Ref<Post[]>) => {
    // ダブルチェック：処理中でない場合は実行しない
    if (!likingPosts.value.has(postId)) {
      console.log('🚫 既に処理完了済み:', postId)
      return
    }

    const finalLikeState = pendingLikes.value.get(postId)
    if (finalLikeState === undefined) {
      likingPosts.value.delete(postId)
      likeTimeouts.value.delete(postId)
      return
    }

    try {
      console.log('📤 いいねリクエスト送信:', { postId, finalLikeState })
      const response = await $fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        body: {
          isLiked: finalLikeState
        }
      })

      if (response.success) {
        // サーバーからの正確な値で更新
        Object.assign(post, {
          is_liked: response.is_liked !== undefined ? response.is_liked : finalLikeState,
          likes_count: response.likes_count
        })

        // 投稿一覧がある場合は一覧側も更新
        if (posts?.value) {
          const listPost = posts.value.find(p => p.id === postId)
          if (listPost) {
            Object.assign(listPost, {
              is_liked: post.is_liked,
              likes_count: post.likes_count
            })
          }
        }

        console.log('✅ いいね更新完了:', { postId, is_liked: post.is_liked, likes_count: response.likes_count })
      } else {
        console.error('❌ いいね失敗:', response.error)
        showErrorToast('いいねの処理に失敗しました')
      }
    } catch (error) {
      // エラー時も無言で処理（UIは既に楽観的更新済み）
      console.log('いいねリクエスト完了 (エラー):', { postId })
    } finally {
      // クリーンアップ
      likingPosts.value.delete(postId)
      pendingLikes.value.delete(postId)
      likeTimeouts.value.delete(postId)
    }
  }

  // クリーンアップ関数
  const cleanup = () => {
    // すべてのタイマーをクリア
    likeTimeouts.value.forEach(timeout => clearTimeout(timeout))
    likeTimeouts.value.clear()
    likingPosts.value.clear()
    pendingLikes.value.clear()
  }

  return {
    likingPosts: readonly(likingPosts),
    handleLike,
    cleanup
  }
}