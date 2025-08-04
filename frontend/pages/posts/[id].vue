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

interface Comment {
  id: number
  body: string
  user: User
  created_at: string
}

// パラメーターから投稿IDを取得
const route = useRoute()
const postId = Number(route.params.id)

// 投稿データ
const post = ref<Post | null>(null)
const comments = ref<Comment[]>([])
const isPostLoading = ref(true)
const isCommentsLoading = ref(false)
const currentUserId = ref<number | null>(null)

// 無限スクロール
const { isLoading, hasMore, handleScroll, loadNextPage, reset } = useInfiniteScroll()

// トースト機能
const { error: showErrorToast, success: showSuccessToast } = useToast()

// 投稿データを取得
const fetchPost = async () => {
  try {
    const response = await $fetch(`/api/posts/${postId}`)

    if (response.success) {
      post.value = response.post
      currentUserId.value = response.current_user_id
      console.log('✅ 投稿詳細取得成功:', response.post)
    } else {
      console.error('❌ 投稿詳細取得失敗:', response.error)
      throw new Error(response.error)
    }
  } catch (error) {
    console.error('投稿詳細取得エラー:', error)
    if (error.status === 404) {
      throw createError({ statusCode: 404, statusMessage: '投稿が見つかりません' })
    }
    throw error
  }
}

// コメント一覧を取得（ページネーション対応）
const fetchComments = async (page: number = 1) => {
  try {
    const response = await $fetch(`/api/posts/${postId}/comments`, {
      method: 'GET',
      query: {
        page: page,
        per_page: 20
      }
    })

    if (response.success) {
      console.log(`✅ コメント一覧取得成功 (ページ${page}):`, response.comments)
      return {
        data: response.comments,
        pagination: response.pagination
      }
    } else {
      console.error('❌ コメント一覧取得失敗:', response.error)
      throw new Error(response.error)
    }
  } catch (error) {
    console.error('コメント一覧取得エラー:', error)
    throw error
  }
}

// 初期コメントデータを読み込み
const loadInitialComments = async () => {
  try {
    isCommentsLoading.value = true
    reset() // 無限スクロール状態をリセット

    const result = await fetchComments(1)
    comments.value = result.data
  } catch (error) {
    console.error('初期コメント読み込みエラー:', error)
  } finally {
    isCommentsLoading.value = false
  }
}

// 次のページを読み込み
const loadMoreComments = async () => {
  try {
    const result = await loadNextPage(fetchComments)
    comments.value.push(...result.data)
  } catch (error) {
    console.error('追加コメント読み込みエラー:', error)
  }
}

// いいね機能
const { likingPosts, handleLike, cleanup: cleanupLike } = useLike()

// いいねハンドラー（投稿詳細用）
const handlePostLike = () => {
  handleLike(post.value)
}

// 投稿削除ハンドラー
const handlePostDeleted = async () => {
  if (!post.value || !confirm('この投稿を削除してもよろしいですか？')) {
    return
  }

  try {
    const response = await $fetch(`/api/posts/${postId}`, {
      method: 'DELETE'
    })

    if (response.success) {
      showSuccessToast('投稿を削除しました', 8000, {
        label: '復元しますか？',
        action: () => restorePost(postId)
      })
      setTimeout(async () => {
        await navigateTo('/')
      }, 2000)
    } else {
      showErrorToast('投稿の削除に失敗しました')
    }
  } catch (error) {
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

// 投稿復元処理
const restorePost = async (postId: number) => {
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

// 新しいコメントを追加するハンドラー
const handleNewComment = (newComment: Comment) => {
  comments.value.unshift(newComment)
  post.value.comments_count += 1
  updateCommentsListHeight()
}

// 新しい投稿を処理するハンドラー
const handleNewPost = (newPost: any) => {
  sharedPostBody.value = ''
  // 投稿成功通知はDesktopSidebar内で処理済み
}



// クリーンアップ関数を格納する変数
let cleanupCommentScroll: (() => void) | null = null
let cleanupMobileCommentScroll: (() => void) | null = null

// 動的高さ計算用のref
const headerRef = ref<HTMLElement | null>(null)
const postSectionRef = ref<HTMLElement | null>(null)
const commentsHeaderRef = ref<HTMLElement | null>(null)
const commentFormRef = ref<HTMLElement | null>(null)
const commentScrollRef = ref<HTMLElement | null>(null)
const commentsListHeight = ref('auto')

// モバイル用ref
const mobileHeaderRef = ref<HTMLElement | null>(null)
const mobilePostSectionRef = ref<HTMLElement | null>(null)
const mobileCommentsHeaderRef = ref<HTMLElement | null>(null)
const mobileCommentFormRef = ref<HTMLElement | null>(null)
const mobileCommentScrollRef = ref<HTMLElement | null>(null)
const mobileCommentsListHeight = ref('auto')

// モバイル投稿モーダル用の状態
const showMobileModal = ref(false)
const isMobilePosting = ref(false)

// デスクトップとモバイルで共有する投稿内容
const sharedPostBody = ref('')

// デスクトップとモバイルで共有するコメント内容
const sharedCommentBody = ref('')



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
      sharedPostBody.value = ''
      showMobileModal.value = false
      showSuccessToast('投稿しました！', 5000, {
        label: '詳細を見る',
        to: `/posts/${response.post.id}`
      })
      // 投稿詳細ページなので一覧には追加しない
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

const updateCommentsListHeight = () => {
  nextTick(() => {
    // デスクトップ版
    if (headerRef.value && postSectionRef.value && commentsHeaderRef.value) {
      const headerHeight = headerRef.value.offsetHeight
      const postHeight = postSectionRef.value.offsetHeight
      const commentsHeaderHeight = commentsHeaderRef.value.offsetHeight
      const screenHeight = window.innerHeight

      // コメント送信フォームの高さを取得して、コメント一覧の高さを計算
      const formHeight = commentFormRef.value ? commentFormRef.value.offsetHeight : 168 // デフォルト値
      const availableHeight = screenHeight - headerHeight - postHeight - commentsHeaderHeight - formHeight
      commentsListHeight.value = `${Math.max(availableHeight, 200)}px`
    }

    // モバイル版
    if (mobileHeaderRef.value && mobilePostSectionRef.value && mobileCommentsHeaderRef.value) {
      const headerHeight = mobileHeaderRef.value.offsetHeight
      const postHeight = mobilePostSectionRef.value.offsetHeight
      const commentsHeaderHeight = mobileCommentsHeaderRef.value.offsetHeight
      const screenHeight = window.innerHeight

      // コメント送信フォームの高さを取得して、コメント一覧の高さを計算 + フローティングボタン用余白
      const formHeight = mobileCommentFormRef.value ? mobileCommentFormRef.value.offsetHeight : 144 // デフォルト値
      const availableHeight = screenHeight - headerHeight - postHeight - commentsHeaderHeight - formHeight - 32
      mobileCommentsListHeight.value = `${Math.max(availableHeight, 200)}px`
    }
  })
}

// ページ読み込み時の処理
onMounted(async () => {
  try {
    isPostLoading.value = true
    await fetchPost()
    await loadInitialComments()
  } catch (error) {
    console.error('ページ読み込みエラー:', error)
  } finally {
    isPostLoading.value = false
  }

  // 高さ計算とリサイズイベント設定
  updateCommentsListHeight()
  window.addEventListener('resize', updateCommentsListHeight)

  // コメント無限スクロール設定
  nextTick(() => {
    // デスクトップ用
    if (commentScrollRef.value) {
      cleanupCommentScroll = handleScroll(loadMoreComments, commentScrollRef.value)
    }
    // モバイル用
    if (mobileCommentScrollRef.value) {
      cleanupMobileCommentScroll = handleScroll(loadMoreComments, mobileCommentScrollRef.value)
    }
  })
})

// クリーンアップ処理
onUnmounted(() => {
  window.removeEventListener('resize', updateCommentsListHeight)
  if (cleanupCommentScroll) cleanupCommentScroll()
  if (cleanupMobileCommentScroll) cleanupMobileCommentScroll()

  // いいね機能のクリーンアップ
  cleanupLike()
})

// ページタイトル設定
useHead({
  title: computed(() => post.value ? `${post.value.user.name}の投稿 - SHARE` : '投稿詳細 - SHARE')
})
</script>

<template>
  <div class="h-screen bg-custom-dark overflow-hidden">
    <!-- デスクトップ: 左右分割レイアウト -->
    <div class="hidden md:flex h-full">
      <!-- 左サイドバー -->
      <DesktopSidebar
        :post-body="sharedPostBody"
        @new-post="handleNewPost"
        @update-body="sharedPostBody = $event"
      />

      <!-- 右メインコンテンツ: borderがある部分 -->
      <div class="flex-1 flex flex-col min-w-0">
        <main class="flex-1 flex flex-col">
          <!-- コンテンツ（ヘッダー〜コメント一覧）: 左境界線あり -->
          <div class="flex flex-col border-l border-b border-white">
            <!-- ヘッダー -->
            <header ref="headerRef" class="border-b border-white p-6 flex-shrink-0">
              <h1 class="text-white text-xl font-bold">コメント</h1>
            </header>

            <!-- 投稿詳細セクション -->
            <section ref="postSectionRef" class="flex-shrink-0">
              <div v-if="isPostLoading" class="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
              <PostItem
                v-else-if="post"
                :post="post"
                :current-user-id="currentUserId"
                :is-liking="likingPosts.has(post?.id || 0)"
                :show-detail-link="false"
                @like="handlePostLike"
                @delete="handlePostDeleted"
              />
            </section>

            <!-- コメントヘッダー -->
            <div ref="commentsHeaderRef" class="border-b border-white p-6 flex-shrink-0 text-center">
              <h3 class="text-white text-lg font-bold">コメント</h3>
            </div>

            <!-- コメント一覧 -->
            <div ref="commentScrollRef" class="overflow-y-auto" :style="{ maxHeight: commentsListHeight }">
              <div v-if="isCommentsLoading" class="flex justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
              <div v-else-if="comments.length === 0" class="p-6">
                <p class="text-gray-400 text-center">まだコメントはありません</p>
              </div>
              <div v-else>
                <article v-for="comment in comments" :key="comment.id" class="border-b border-white p-6">
                  <div class="flex items-center space-x-3 mb-2">
                    <h4 class="text-white font-bold">{{ comment.user.name }}</h4>
                    <span class="text-gray-400 text-sm">{{ comment.created_at }}</span>
                  </div>
                  <p class="text-white break-words">{{ comment.body }}</p>
                </article>
                <InfiniteScrollLoader :is-loading="isLoading" :has-more="hasMore" :posts-count="comments.length" />
              </div>
            </div>
          </div>

          <!-- コメント送信フォーム: 左境界線無し -->
          <div ref="commentFormRef" class="p-6">
            <CommentForm
              :post-id="postId"
              v-model="sharedCommentBody"
              @comment-created="handleNewComment"
            />
          </div>
        </main>
      </div>
    </div>

    <!-- モバイル: 縦積みレイアウト -->
    <div class="md:hidden h-full flex flex-col">
      <!-- borderがある部分 -->
      <div class="flex flex-col border-l border-b border-white">
        <!-- ヘッダー -->
        <header ref="mobileHeaderRef" class="bg-custom-dark border-b border-white p-4 flex-shrink-0">
          <div class="flex justify-center mb-2">
            <NuxtLink to="/">
              <img src="/images/logo.png" alt="SHARE" class="w-20 h-auto object-contain hover:opacity-80 transition-opacity cursor-pointer" />
            </NuxtLink>
          </div>
          <div class="flex justify-between items-center">
            <h1 class="text-white text-xl font-bold">コメント</h1>
            <button @click="handleLogout" class="text-gray-400 hover:text-white">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </header>

        <!-- 投稿詳細セクション -->
        <section ref="mobilePostSectionRef" class="flex-shrink-0">
          <div v-if="isPostLoading" class="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
          <PostItem
            v-else-if="post"
            :post="post"
            :current-user-id="currentUserId"
            :is-liking="likingPosts.has(post?.id || 0)"
            :show-detail-link="false"
            :is-mobile="true"
            @like="handlePostLike"
            @delete="handlePostDeleted"
          />
        </section>

        <!-- コメントヘッダー -->
        <div ref="mobileCommentsHeaderRef" class="border-b border-white p-4 flex-shrink-0 text-center">
          <h3 class="text-white font-bold">コメント</h3>
        </div>

        <!-- コメント一覧: 内容に応じた高さ、最大高さのみ制限 -->
        <div ref="mobileCommentScrollRef" class="overflow-y-auto pb-24" :style="{ maxHeight: mobileCommentsListHeight }">
          <div v-if="isCommentsLoading" class="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
          <div v-else-if="comments.length === 0" class="p-4">
            <p class="text-gray-400 text-center">まだコメントはありません</p>
          </div>
          <div v-else>
            <article v-for="comment in comments" :key="comment.id" class="border-b border-white p-4">
              <div class="flex items-center space-x-3 mb-2">
                <h4 class="text-white font-bold">{{ comment.user.name }}</h4>
                <span class="text-gray-400 text-sm">{{ comment.created_at }}</span>
              </div>
              <p class="text-white break-words">{{ comment.body }}</p>
            </article>
            <InfiniteScrollLoader :is-loading="isLoading" :has-more="hasMore" :posts-count="comments.length" />
          </div>
        </div>
      </div>

      <!-- コメント送信フォーム（コメント一覧の直下） -->
      <div ref="mobileCommentFormRef" class="p-4 pb-24">
        <CommentForm
          :post-id="postId"
          v-model="sharedCommentBody"
          @comment-created="handleNewComment"
        />
      </div>

      <!-- フローティング投稿ボタン（コメント入力時は非表示） -->
      <button
        v-show="!sharedCommentBody.trim()"
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
