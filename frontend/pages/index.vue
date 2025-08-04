<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'

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

// いいね機能（デバウンス付き楽観的更新）
const likingPosts = ref<Set<number>>(new Set()) // 処理中のpostIdを追跡
const likeTimeouts = ref<Map<number, NodeJS.Timeout>>(new Map()) // デバウンス用タイマー
const pendingLikes = ref<Map<number, boolean>>(new Map()) // 保留中のいいね状態

const handleLike = (postId: number) => {
  const post = posts.value.find(p => p.id === postId)
  if (!post) return

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

  // 最終的ないいね状態を保存
  pendingLikes.value.set(postId, post.is_liked)

  // 処理中状態にマーク（409防止の重要なロック）
  likingPosts.value.add(postId)

  // 500msデバウンス（より長い時間で安全性向上）
  const timeout = setTimeout(async () => {
    await executeLikeRequest(postId)
  }, 500)

  likeTimeouts.value.set(postId, timeout)
}

// 実際のいいねリクエストを実行
const executeLikeRequest = async (postId: number) => {
  // ダブルチェック：処理中でない場合は実行しない
  if (!likingPosts.value.has(postId)) {
    console.log('🚫 既に処理完了済み:', postId)
    return
  }

  const post = posts.value.find(p => p.id === postId)
  if (!post) {
    likingPosts.value.delete(postId)
    pendingLikes.value.delete(postId)
    likeTimeouts.value.delete(postId)
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
      // サーバーからの正確な値で更新（Vue reactivity確保のため新しいオブジェクトで更新）
      Object.assign(post, {
        is_liked: response.is_liked !== undefined ? response.is_liked : finalLikeState,
        likes_count: response.likes_count
      })
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

  // いいね機能のタイマーをすべてクリア
  likeTimeouts.value.forEach(timeout => clearTimeout(timeout))
  likeTimeouts.value.clear()
  likingPosts.value.clear()
  pendingLikes.value.clear()
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

// モバイル投稿用バリデーションスキーマ
const mobileValidationSchema = toTypedSchema(
  yup.object({
    mobileContent: yup.string().max(120, '120文字以内で入力してください')
  })
)

// vee-validateのフォーム設定（モバイル用）
const { errors: mobileErrors, defineField: mobileDefineField, handleSubmit: mobileHandleSubmit, resetForm: mobileResetForm, setFieldError: mobileSetFieldError } = useForm({
  validationSchema: mobileValidationSchema,
  validateOnMount: false
})

const [mobileContent, mobileContentAttrs] = mobileDefineField('mobileContent')

// モバイル投稿の文字数カウント関連（共有コンテンツベース）
const maxLength = 120
const mobileCurrentLength = computed(() => sharedPostBody.value?.length || 0)
const mobileRemainingChars = computed(() => maxLength - mobileCurrentLength.value)
const mobileIsNearLimit = computed(() => mobileRemainingChars.value <= 10 && mobileRemainingChars.value >= 0)
const mobileIsOverLimit = computed(() => mobileRemainingChars.value < 0)

// モバイル用ゲージの色とパーセンテージ
const mobileGaugeColor = computed(() => {
  if (mobileIsOverLimit.value) return '#ef4444' // 赤色
  if (mobileIsNearLimit.value) return '#f59e0b' // 黄色
  return '#3b82f6' // 青色
})

const mobileGaugePercentage = computed(() => {
  const percentage = (mobileCurrentLength.value / maxLength) * 100
  return Math.min(percentage, 100)
})

// モバイル用SVGドーナツゲージの計算
const mobileRadius = 16
const mobileCircumference = 2 * Math.PI * mobileRadius
const mobileStrokeDasharray = computed(() => {
  const progress = (mobileGaugePercentage.value / 100) * mobileCircumference
  return `${progress} ${mobileCircumference}`
})

// 共有bodyとモバイルフィールドを同期
watch(sharedPostBody, (newValue) => {
  mobileContent.value = newValue
})

watch(mobileContent, (newValue) => {
  sharedPostBody.value = newValue
})

// 入力時にエラーをクリア（ただし文字数超過時は除く）
watch(mobileContent, () => {
  if (mobileErrors.value.mobileContent && mobileCurrentLength.value <= maxLength) {
    mobileSetFieldError('mobileContent', undefined)
  }
})

// モバイル投稿処理
const createMobilePost = mobileHandleSubmit(async () => {
  // submit時のみバリデーション実行
  if (!mobileContent.value || mobileContent.value.trim() === '') {
    mobileSetFieldError('mobileContent', '投稿内容を入力してください')
    return
  }
  
  if (mobileContent.value.length > maxLength) {
    return // バリデーションスキーマでエラーが表示される
  }

  isMobilePosting.value = true
  try {
    const response = await $fetch('/api/posts', {
      method: 'POST',
      body: { body: mobileContent.value.trim() }
    })

    if (response.success && response.post) {
      handleNewPost(response.post)
      sharedPostBody.value = '' // 共有bodyもクリア
      mobileResetForm()
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
})

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
              @like="handleLike"
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
          <img src="/images/logo.png" alt="SHARE" class="w-20 h-auto object-contain" />
        </div>
        <div class="flex justify-between items-center">
          <h1 class="text-white text-xl font-bold">ホーム</h1>
          <button @click="handleLogout" class="hover:opacity-80 transition-opacity">
            <img src="/images/logout.png" alt="ログアウト" class="w-6 h-6" />
          </button>
        </div>
      </header>

      <!-- コンテンツ: スクロール可能エリア -->
      <main ref="mobileScrollRef" class="flex-1 overflow-y-auto" :style="{ height: mobilePostsListHeight }">
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
            @like="handleLike"
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
    <div v-if="showMobileModal" class="fixed inset-0 z-50 md:hidden">
      <div class="absolute inset-0 bg-black/60" @click="showMobileModal = false"></div>
      <div class="absolute inset-x-4 top-1/2 -translate-y-1/2 bg-custom-dark rounded-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-white text-lg font-medium">シェア</h2>
          <button @click="showMobileModal = false" class="text-gray-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- 投稿フォーム（モバイル用シンプル版） -->
        <form @submit.prevent="createMobilePost">
          <div class="border-2 border-white rounded-lg mb-4 focus-within:border-purple-500 transition-colors">
            <textarea
              v-model="mobileContent"
              v-bind="mobileContentAttrs"
              :disabled="isMobilePosting"
              placeholder="今何してる？"
              class="w-full h-32 p-3 bg-transparent text-white placeholder-gray-400 resize-none outline-none border-none focus:outline-none focus:ring-0"
            />
          </div>
          
          <!-- 文字数ゲージと情報 -->
          <div v-if="mobileCurrentLength > 0" class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <!-- ドーナツゲージ -->
              <div class="relative">
                <svg width="36" height="36" class="transform -rotate-90">
                  <!-- 背景の円 -->
                  <circle
                    cx="18"
                    cy="18"
                    :r="mobileRadius"
                    stroke="#374151"
                    stroke-width="3"
                    fill="none"
                  />
                  <!-- プログレス円 -->
                  <circle
                    cx="18"
                    cy="18"
                    :r="mobileRadius"
                    :stroke="mobileGaugeColor"
                    stroke-width="3"
                    fill="none"
                    stroke-linecap="round"
                    :stroke-dasharray="mobileStrokeDasharray"
                    :stroke-dashoffset="0"
                    class="transition-all duration-300"
                  />
                </svg>
              </div>
              
              <!-- 文字数表示 -->
              <span 
                v-if="mobileIsNearLimit || mobileIsOverLimit"
                :class="{
                  'text-yellow-500': mobileIsNearLimit && !mobileIsOverLimit,
                  'text-red-500': mobileIsOverLimit
                }"
                class="text-sm font-medium"
              >
                {{ mobileRemainingChars }}
              </span>
            </div>
          </div>
          
          <!-- エラーメッセージ -->
          <div class="h-6 mb-2">
            <p v-if="mobileErrors.mobileContent" class="text-red-500 text-sm">{{ mobileErrors.mobileContent }}</p>
          </div>
          
          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="isMobilePosting || mobileIsOverLimit"
              class="bg-purple-gradient hover:opacity-90 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-6 rounded-full font-medium transition-all"
              :class="{ 'opacity-50': mobileIsOverLimit && !isMobilePosting }"
            >
              {{ isMobilePosting ? '投稿中...' : 'シェアする' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <ToastContainer />
  </div>
</template>

