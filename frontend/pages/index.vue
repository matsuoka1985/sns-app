<script setup lang="ts">
// 認証必須ページ
definePageMeta({
  middleware: 'require-auth'
})

// 型定義
interface User {
  id: number
  name: string
}

interface Post {
  id: number
  body: string
  user: User
  likes_count: number
  created_at: string
  is_liked: boolean
}

// 投稿一覧データ
const posts = ref<Post[]>([])
const isInitialLoading = ref(true)
const currentUserId = ref<number | null>(null)

// 無限スクロール
const { isLoading, hasMore, handleScroll, loadNextPage, reset } = useInfiniteScroll()

// トースト機能
const { error: showErrorToast } = useToast()

// 投稿一覧を取得（ページネーション対応）
const fetchPosts = async (page: number = 1) => {
  try {
    const response = await $fetch(`http://localhost/api/posts?page=${page}&per_page=20`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include'
    })

    if (response.success) {
      currentUserId.value = response.current_user_id
      console.log(`✅ 投稿一覧取得成功 (ページ${page}):`, response.posts)

      return {
        data: response.posts,
        pagination: response.pagination
      }
    } else {
      console.error('❌ 投稿一覧取得失敗:', response.error)
      throw new Error(response.error)
    }

  } catch (error) {
    console.error('投稿一覧取得エラー:', error)
    throw error
  }
}

// 初期データを読み込み
const loadInitialPosts = async () => {
  try {
    isInitialLoading.value = true
    reset() // 無限スクロール状態をリセット

    const result = await fetchPosts(1)
    posts.value = result.data
  } catch (error) {
    console.error('初期投稿読み込みエラー:', error)
  } finally {
    isInitialLoading.value = false
  }
}

// 次のページを読み込み
const loadMore = async () => {
  try {
    const result = await loadNextPage(fetchPosts)
    posts.value.push(...result.data)
  } catch (error) {
    console.error('追加投稿読み込みエラー:', error)
  }
}

// 投稿削除ハンドラー（楽観的更新）
const handlePostDeleted = async (postId: number) => {
  // 削除対象の投稿とその位置を保存
  const targetIndex = posts.value.findIndex(post => post.id === postId)
  if (targetIndex === -1) return
  
  const targetPost = posts.value[targetIndex]
  
  // 楽観的更新：即座にUIから削除
  posts.value = posts.value.filter(post => post.id !== postId)
  console.log('🚀 楽観的削除実行:', postId, '元のindex:', targetIndex)

  try {
    // バックグラウンドでAPI呼び出し
    const response = await $fetch(`http://localhost/api/posts/${postId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (response.success) {
      console.log('✅ 投稿削除成功:', response.message)
      // 成功時は何もしない（既にUIから削除済み）
    } else {
      console.error('❌ 投稿削除失敗:', response.error)
      // 失敗時は元の位置に投稿を復元
      posts.value.splice(targetIndex, 0, targetPost)
      console.log('🔄 投稿復元完了 (index:', targetIndex, '):', targetPost)
      showErrorToast('投稿の削除に失敗しました')
    }
  } catch (error) {
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

// 新しい投稿を追加するハンドラー
const handleNewPost = (newPost: Post) => {
  posts.value.unshift(newPost)
}

// 子コンポーネントで使える関数をprovide
provide('addNewPost', handleNewPost)

// ページ読み込み時に投稿一覧を取得とスクロールイベント設定
onMounted(async () => {
  await loadInitialPosts()

  // スクロールイベントを設定
  const cleanup = handleScroll(loadMore)

  // コンポーネントがアンマウントされる時にクリーンアップ
  onUnmounted(() => {
    cleanup()
  })
})

// ページタイトル設定
useHead({
  title: 'ホーム - SHARE'
})
</script>

<template>
  <div class="min-h-screen bg-custom-dark">
    <div class="flex">
      <!-- サイドナビゲーション -->
      <SideNav />

      <!-- メインコンテンツエリア -->
      <div class="flex-1 min-h-screen">
        <MainContent title="ホーム">
        <!-- 初期ローディング表示 -->
        <LoadingState v-if="isInitialLoading" />

        <!-- 投稿がない場合 -->
        <EmptyState v-else-if="posts.length === 0" />

        <!-- 投稿一覧 -->
        <div v-else>
          <PostList 
            :posts="posts"
            :current-user-id="currentUserId"
            @deleted="handlePostDeleted"
          />

          <!-- 無限スクロール用ローディング -->
          <InfiniteScrollLoader 
            :is-loading="isLoading"
            :has-more="hasMore"
            :posts-count="posts.length"
          />
        </div>
        </MainContent>
      </div>
    </div>

    <!-- トーストコンテナ -->
    <ToastContainer />
  </div>
</template>

