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

// 投稿削除ハンドラー（確認ダイアログ付き楽観的更新）
const handlePostDeleted = async (postId: number) => {
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
        action: () => restorePost(postId, targetPost, targetIndex)
      })
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

// いいね機能
const { likingPosts, handleLike, cleanup: cleanupLike } = useLike()

// いいねハンドラー（投稿一覧用）
const handlePostLike = (postId: number) => {
  const post = posts.value.find(p => p.id === postId)
  handleLike(post, posts)
}

// 投稿復元処理
const restorePost = async (postId: number, post: Post, originalIndex: number) => {
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

// 新しい投稿を追加するハンドラー
const handleNewPost = (newPost: Post) => {
  posts.value.unshift(newPost)
}

// 子コンポーネントで使える関数をprovide
provide('addNewPost', handleNewPost)

// クリーンアップ関数を格納する変数
let cleanupDesktop: (() => void) | null = null
let cleanupMobile: (() => void) | null = null

// ページ読み込み時に投稿一覧を取得とスクロールイベント設定
onMounted(async () => {
  await loadInitialPosts()

  // 高さ計算とリサイズイベント設定
  updatePostsListHeight()
  window.addEventListener('resize', updatePostsListHeight)

  // スクロールイベントを設定
  nextTick(() => {
    // デスクトップ用無限スクロール設定
    if (desktopScrollRef.value) {
      cleanupDesktop = handleScroll(loadMore, desktopScrollRef.value)
    }

    // モバイル用無限スクロール設定
    if (mobileScrollRef.value) {
      cleanupMobile = handleScroll(loadMore, mobileScrollRef.value)
    }
  })
})

// クリーンアップ処理
onUnmounted(() => {
  window.removeEventListener('resize', updatePostsListHeight)
  if (cleanupDesktop) cleanupDesktop()
  if (cleanupMobile) cleanupMobile()

  // いいね機能のクリーンアップ
  cleanupLike()
})

// ページタイトル設定
useHead({
  title: 'ホーム - SHARE'
})

// ヘッダーの高さを動的に取得して投稿一覧の高さを計算
const headerRef = ref<HTMLElement | null>(null)
const mobileHeaderRef = ref<HTMLElement | null>(null)
const postsListHeight = ref('auto')
const mobilePostsListHeight = ref('auto')

const updatePostsListHeight = () => {
  nextTick(() => {
    // デスクトップ版
    if (headerRef.value) {
      const headerHeight = headerRef.value.offsetHeight
      const screenHeight = window.innerHeight
      postsListHeight.value = `${screenHeight - headerHeight}px`
    }

    // モバイル版
    if (mobileHeaderRef.value) {
      const headerHeight = mobileHeaderRef.value.offsetHeight
      const screenHeight = window.innerHeight
      mobilePostsListHeight.value = `${screenHeight - headerHeight - 80}px` // 80pxはフローティングボタン用の余白
    }
  })
}

// ref要素
const desktopScrollRef = ref<HTMLElement | null>(null)
const mobileScrollRef = ref<HTMLElement | null>(null)

// 共有投稿状態（デスクトップとモバイル同期）
const sharedPostBody = ref('')

// モバイル投稿モーダル用の状態
const showMobileModal = ref(false)
const isMobilePosting = ref(false)

// モバイル投稿用の文字数超過フラグ（不要になったが一旦残す）
const mobileIsOverLimit = ref(false)

// モバイル投稿処理
const createMobilePost = async () => {
  if (!sharedPostBody.value || sharedPostBody.value.trim() === '') {
    return
  }
  
  if (sharedPostBody.value.length > 120) {
    return
  }

  isMobilePosting.value = true
  try {
    const response = await $fetch('/api/posts', {
      method: 'POST',
      body: { body: sharedPostBody.value.trim() }
    })

    if (response.success && response.post) {
      handleNewPost(response.post)
      sharedPostBody.value = ''
      showMobileModal.value = false
      showSuccessToast('投稿しました！', 5000, {
        label: '詳細を見る',
        to: `/posts/${response.post.id}`
      })
    }
  } catch (error) {
    console.error('投稿作成エラー:', error)
    showErrorToast('投稿の作成に失敗しました')
  } finally {
    isMobilePosting.value = false
  }
}

// ログアウト処理
async function handleLogout() {
  await $fetch('/api/auth/logout', {
    method: 'POST'
  })
  await navigateTo('/login')
}
</script>

<template>
  <div class="h-screen bg-custom-dark overflow-hidden">
    <!-- デスクトップ: 左右分割レイアウト -->
    <div class="hidden md:flex h-full">
      <!-- 左サイドバー -->
      <DesktopSidebar 
        :post-body="sharedPostBody"
        @new-post="handleNewPost" 
        @update-body="(body) => sharedPostBody = body"
      />

      <!-- 右メインコンテンツ: 可変幅 -->
      <main class="flex-1 flex flex-col min-w-0 border-l border-white">
        <!-- ヘッダー -->
        <header ref="headerRef" class="border-b border-white p-6 flex-shrink-0">
          <h1 class="text-white text-xl font-bold">ホーム</h1>
        </header>

        <!-- 投稿一覧: スクロール可能エリア -->
        <div ref="desktopScrollRef" class="flex-1 overflow-y-auto" :style="{ height: postsListHeight }">
          <LoadingState v-if="isInitialLoading" />
          <EmptyState v-else-if="posts.length === 0" />
          <div v-else>
            <PostItem
              v-for="post in posts"
              :key="post.id"
              :post="post"
              :current-user-id="currentUserId"
              :is-liking="likingPosts.has(post.id)"
              @like="handlePostLike"
              @delete="handlePostDeleted"
            />
            <InfiniteScrollLoader :is-loading="isLoading" :has-more="hasMore" :posts-count="posts.length" />
          </div>
        </div>
      </main>
    </div>

    <!-- モバイル: 縦積みレイアウト -->
    <div class="md:hidden h-full flex flex-col">
      <!-- ヘッダー -->
      <header ref="mobileHeaderRef" class="bg-custom-dark border-b border-white p-4 flex-shrink-0">
        <div class="flex justify-center mb-2">
          <NuxtLink to="/">
            <img src="/images/logo.png" alt="SHARE" class="w-20 h-auto object-contain hover:opacity-80 transition-opacity cursor-pointer" />
          </NuxtLink>
        </div>
        <div class="flex justify-between items-center">
          <h1 class="text-white text-xl font-bold">ホーム</h1>
          <button @click="handleLogout" class="hover:opacity-80 transition-opacity">
            <img src="/images/logout.png" alt="ログアウト" class="w-6 h-6" />
          </button>
        </div>
      </header>

      <!-- コンテンツ: スクロール可能エリア -->
      <main ref="mobileScrollRef" class="flex-1 overflow-y-auto pb-24" :style="{ height: mobilePostsListHeight }">
        <LoadingState v-if="isInitialLoading" />
        <EmptyState v-else-if="posts.length === 0" />
        <div v-else>
          <PostItem
            v-for="post in posts"
            :key="post.id"
            :post="post"
            :current-user-id="currentUserId"
            :is-liking="likingPosts.has(post.id)"
            :is-mobile="true"
            @like="handlePostLike"
            @delete="handlePostDeleted"
          />
          <InfiniteScrollLoader :is-loading="isLoading" :has-more="hasMore" :posts-count="posts.length" />
        </div>
      </main>

      <!-- フローティング投稿ボタン -->
      <button
        @click="showMobileModal = true"
        class="fixed bottom-6 right-6 w-14 h-14 bg-purple-gradient hover:opacity-90 text-white rounded-full shadow-lg z-50 flex items-center justify-center transition-all"
      >
        <img src="/images/feather.png" alt="投稿" class="w-6 h-6" />
      </button>
    </div>

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

