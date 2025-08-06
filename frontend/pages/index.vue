<script setup lang="ts">

// 認証必須ページ
definePageMeta({
  middleware: 'require-auth'
})

import type { User, Post } from '~/types'

// 投稿一覧データ
const posts = ref<Post[]>([])
const isInitialLoading = ref(true)
const currentUserId = ref<number | null>(null)

// 無限スクロール
const { isLoading, hasMore, handleScroll, loadNextPage, reset } = useInfiniteScroll()

// トースト機能
const { error: showErrorToast, success: showSuccessToast } = useToast()

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


// いいね機能
const { likingPosts, handleLike, cleanup: cleanupLike } = useLike()

// 認証機能
const { handleLogout } = useAuth()

// 投稿アクション機能
const { handlePostDeletedInList } = usePostActions()

// モバイル投稿機能
const { createMobilePostForList } = useMobilePost()

// いいねハンドラー（投稿一覧用）
const handlePostLike = (postId: number) => {
  const post = posts.value.find(p => p.id === postId)
  handleLike(post, posts)
}

// 投稿削除ハンドラー（一覧用）
const handlePostDeleted = (postId: number) => {
  handlePostDeletedInList(postId, posts)
}

// 新しい投稿を追加するハンドラー
const handleNewPost = (newPost: Post) => {
  posts.value.unshift(newPost)
}

// 子コンポーネントで使える関数をprovide
provide('addNewPost', handleNewPost)

// クリーンアップ関数を格納する変数
let cleanup: (() => void) | null = null

// ページ読み込み時に投稿一覧を取得とスクロールイベント設定
onMounted(async () => {
  await loadInitialPosts()

  // スクロールイベントを設定
  nextTick(() => {
    if (desktopScrollRef.value?.scrollRef) {
      cleanup = handleScroll(loadMore, desktopScrollRef.value.scrollRef)
      console.log('🔄 Infinite scroll setup completed for element:', desktopScrollRef.value.scrollRef)
    } else {
      console.warn('⚠️ desktopScrollRef not found, infinite scroll not set up')
    }
  })
})

// クリーンアップ処理
onUnmounted(() => {
  if (cleanup) cleanup()

  // いいね機能のクリーンアップ
  cleanupLike()
})

// ページタイトル設定
useHead({
  title: 'ホーム - SHARE'
})

// ヘッダーの高さを動的に取得して投稿一覧の高さを計算
const headerRef = ref<HTMLElement | null>(null)
const postsListHeight = ref('auto')

const updatePostsListHeight = () => {
  // Flexboxで自動的にサイズが決まるため、固定の高さ設定は不要
  console.log('📏 Using flexbox auto height calculation')
}

// ref要素
const desktopScrollRef = ref<InstanceType<typeof PostsList> | null>(null)

// 共有投稿状態（デスクトップとモバイル同期）
const sharedPostBody = ref('')

// モバイル投稿モーダル用の状態
const showMobileModal = ref(false)
const isMobilePosting = ref(false)


// モバイル投稿処理
const createMobilePost = async () => {
  isMobilePosting.value = true

  const success = await createMobilePostForList(
    sharedPostBody.value,
    (newPost) => {
      handleNewPost(newPost)
      sharedPostBody.value = ''
      showMobileModal.value = false
    },
    () => {
      isMobilePosting.value = false
    }
  )
}

</script>

<template>
  <div class="h-screen bg-custom-dark overflow-hidden">
    <div class="h-full flex flex-col md:flex-row">
      <!-- サイドバー（デスクトップのみ） -->
      <DesktopSidebar
        class="hidden md:block"
        :post-body="sharedPostBody"
        @new-post="handleNewPost"
        @update-body="(body) => sharedPostBody = body"
      />

      <!-- メインコンテンツ -->
      <main class="flex-1 flex flex-col min-w-0  h-full">
        <!-- ヘッダー -->
        <PageHeader ref="headerRef" title="ホーム" />

        <!-- 投稿一覧 -->
        <PostsList
          ref="desktopScrollRef"
          :posts="posts"
          :current-user-id="currentUserId"
          :liking-posts="likingPosts"
          :is-initial-loading="isInitialLoading"
          :is-loading="isLoading"
          :has-more="hasMore"
          @like="handlePostLike"
          @delete="handlePostDeleted"
        />
      </main>
    </div>

    <!-- フローティング投稿ボタン（モバイルのみ） -->
    <FloatingPostButton @click="showMobileModal = true" />

    <!-- モバイル投稿モーダル -->
    <MobilePostModal
      :show="showMobileModal"
      v-model:post-body="sharedPostBody"
      :is-posting="isMobilePosting"
      @close="showMobileModal = false"
      @submit="createMobilePost"
    />

    <ToastContainer />
  </div>
</template>
