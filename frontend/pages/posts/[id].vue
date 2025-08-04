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

// いいね機能（デバウンス付き楽観的更新）
const likingPost = ref(false)
const likeTimeout = ref<NodeJS.Timeout | null>(null)
const pendingLikeState = ref<boolean | null>(null)

const handlePostLike = () => {
  if (!post.value) return

  // 既存のタイマーをクリア
  if (likeTimeout.value) {
    clearTimeout(likeTimeout.value)
    likeTimeout.value = null
  }

  // 楽観的更新（即座にUIを更新）
  const wasLiked = post.value.is_liked
  post.value.is_liked = !wasLiked
  post.value.likes_count += wasLiked ? -1 : 1

  // 最終的ないいね状態を保存
  pendingLikeState.value = post.value.is_liked

  // 処理中状態にマーク
  likingPost.value = true

  // 300msデバウンス - この間に追加クリックがあればタイマーをリセット
  likeTimeout.value = setTimeout(async () => {
    await executeLikeRequest()
  }, 300)
}

// 実際のいいねリクエストを実行
const executeLikeRequest = async () => {
  if (!post.value || pendingLikeState.value === null) {
    likingPost.value = false
    return
  }

  const finalLikeState = pendingLikeState.value

  try {
    const response = await $fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      body: {
        isLiked: finalLikeState
      }
    })

    if (response.success) {
      // サーバーからの正確な値で更新（Vue reactivity確保のため新しいオブジェクトで更新）
      Object.assign(post.value, {
        is_liked: response.is_liked,
        likes_count: response.likes_count
      })
      console.log('✅ いいね更新完了:', { postId, is_liked: post.value.is_liked, likes_count: response.likes_count })
    } else {
      console.error('❌ いいね失敗:', response.error)
      showErrorToast('いいねの処理に失敗しました')
    }
  } catch (error) {
    // エラー時も無言で処理（UIは既に楽観的更新済み）
    console.log('いいねリクエスト完了 (エラー):', { postId })
  } finally {
    // クリーンアップ
    likingPost.value = false
    pendingLikeState.value = null
    likeTimeout.value = null
  }
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
}

// コメント作成処理とバリデーション
const isCommenting = ref(false)

// vee-validateのスキーマ
const commentValidationSchema = toTypedSchema(
  yup.object({
    commentContent: yup.string().max(120, '120文字以内で入力してください')
  })
)

// vee-validateのフォーム設定
const { errors: commentErrors, defineField: commentDefineField, handleSubmit: commentHandleSubmit, resetForm: commentResetForm, setFieldError: commentSetFieldError } = useForm({
  validationSchema: commentValidationSchema,
  validateOnMount: false
})

const [commentContent, commentContentAttrs] = commentDefineField('commentContent')

// コメント文字数カウント関連
const maxLength = 120
const commentCurrentLength = computed(() => commentContent.value?.length || 0)
const commentRemainingChars = computed(() => maxLength - commentCurrentLength.value)
const commentIsNearLimit = computed(() => commentRemainingChars.value <= 10 && commentRemainingChars.value >= 0)
const commentIsOverLimit = computed(() => commentRemainingChars.value < 0)

// ゲージの色とパーセンテージ
const commentGaugeColor = computed(() => {
  if (commentIsOverLimit.value) return '#ef4444' // 赤色
  if (commentIsNearLimit.value) return '#f59e0b' // 黄色
  return '#3b82f6' // 青色
})

const commentGaugePercentage = computed(() => {
  const percentage = (commentCurrentLength.value / maxLength) * 100
  return Math.min(percentage, 100)
})

// SVGドーナツゲージの計算
const commentRadius = 16
const commentCircumference = 2 * Math.PI * commentRadius
const commentStrokeDasharray = computed(() => {
  const progress = (commentGaugePercentage.value / 100) * commentCircumference
  return `${progress} ${commentCircumference}`
})

// 入力時にエラーをクリア＆高さ再計算
watch(commentContent, () => {
  if (commentErrors.value.commentContent && commentCurrentLength.value <= maxLength) {
    commentSetFieldError('commentContent', undefined)
  }
  // コメントフォームの高さが変わる可能性があるので再計算
  updateCommentsListHeight()
})

const createComment = commentHandleSubmit(async () => {
  // submit時のみバリデーション実行
  const content = commentContent.value || ''
  if (!content || content.trim() === '') {
    commentSetFieldError('commentContent', 'コメント内容を入力してください')
    return
  }

  if (content.length > maxLength) {
    return // バリデーションスキーマでエラーが表示される
  }

  isCommenting.value = true
  try {
    const response = await $fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: { body: content.trim() }
    })

    if (response.success && response.comment) {
      handleNewComment(response.comment)
      commentResetForm()
      updateCommentsListHeight()
      showSuccessToast('コメントしました！')
    }
  } catch (error) {
    console.error('コメント作成エラー:', error)
    showErrorToast('コメントの作成に失敗しました')
  } finally {
    isCommenting.value = false
  }
})

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

// モバイル投稿の文字数カウント関連
const mobileCurrentLength = computed(() => mobileContent.value?.length || 0)
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
      mobileResetForm()
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
})

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
      const availableHeight = screenHeight - headerHeight - postHeight - commentsHeaderHeight - formHeight - 80
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

  // いいね機能のタイマーをクリア
  if (likeTimeout.value) {
    clearTimeout(likeTimeout.value)
    likeTimeout.value = null
  }
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
        :post-body="''"
        @new-post="() => {}"
        @update-body="() => {}"
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
                :is-liking="likingPost"
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
            <form @submit.prevent="createComment" class="space-y-4">
              <div class="border-2 border-white rounded-lg mb-4 focus-within:border-purple-500 transition-colors">
                <textarea
                  v-model="commentContent"
                  v-bind="commentContentAttrs"
                  :disabled="isCommenting"
                  placeholder="コメントを入力..."
                  class="w-full h-16 p-3 bg-transparent text-white placeholder-gray-400 resize-none outline-none border-none focus:outline-none focus:ring-0"
                />
              </div>

              <!-- エラーメッセージ -->
              <div class="h-6 mb-2">
                <p v-if="commentErrors.commentContent" class="text-red-500 text-sm">{{ commentErrors.commentContent }}</p>
              </div>

              <!-- 文字数ゲージと送信ボタン -->
              <div v-if="commentCurrentLength > 0" class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2">
                  <!-- ドーナツゲージ -->
                  <div class="relative">
                    <svg width="36" height="36" class="transform -rotate-90">
                      <!-- 背景の円 -->
                      <circle
                        cx="18"
                        cy="18"
                        :r="commentRadius"
                        stroke="#374151"
                        stroke-width="3"
                        fill="none"
                      />
                      <!-- プログレス円 -->
                      <circle
                        cx="18"
                        cy="18"
                        :r="commentRadius"
                        :stroke="commentGaugeColor"
                        stroke-width="3"
                        fill="none"
                        stroke-linecap="round"
                        :stroke-dasharray="commentStrokeDasharray"
                        :stroke-dashoffset="0"
                        class="transition-all duration-300"
                      />
                    </svg>
                  </div>

                  <!-- 文字数表示 -->
                  <span
                    v-if="commentIsNearLimit || commentIsOverLimit"
                    :class="{
                      'text-yellow-500': commentIsNearLimit && !commentIsOverLimit,
                      'text-red-500': commentIsOverLimit
                    }"
                    class="text-sm font-medium"
                  >
                    {{ commentRemainingChars }}
                  </span>
                </div>
              </div>

              <div class="flex justify-end">
                <button
                  type="submit"
                  :disabled="!(commentContent || '').trim() || isCommenting || commentIsOverLimit"
                  class="bg-purple-gradient hover:opacity-90 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-6 rounded-full font-medium transition-all"
                  :class="{ 'opacity-50': commentIsOverLimit && !isCommenting }"
                >
                  {{ isCommenting ? 'コメント中...' : 'コメント' }}
                </button>
              </div>
            </form>
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
            <img src="/images/logo.png" alt="SHARE" class="w-20 h-auto object-contain" />
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
            :is-liking="likingPost"
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
      <div ref="mobileCommentFormRef" class="p-4">
        <form @submit.prevent="createComment" class="space-y-3">
          <div class="border-2 border-white rounded-lg mb-3 focus-within:border-purple-500 transition-colors">
            <textarea
              v-model="commentContent"
              v-bind="commentContentAttrs"
              :disabled="isCommenting"
              placeholder="コメントを入力..."
              class="w-full h-16 p-3 bg-transparent text-white placeholder-gray-400 resize-none outline-none border-none focus:outline-none focus:ring-0 text-sm"
            />
          </div>

          <!-- エラーメッセージ -->
          <div class="h-6 mb-2">
            <p v-if="commentErrors.commentContent" class="text-red-500 text-sm">{{ commentErrors.commentContent }}</p>
          </div>

          <!-- 文字数ゲージ -->
          <div v-if="commentCurrentLength > 0" class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <!-- ドーナツゲージ -->
              <div class="relative">
                <svg width="36" height="36" class="transform -rotate-90">
                  <!-- 背景の円 -->
                  <circle
                    cx="18"
                    cy="18"
                    :r="commentRadius"
                    stroke="#374151"
                    stroke-width="3"
                    fill="none"
                  />
                  <!-- プログレス円 -->
                  <circle
                    cx="18"
                    cy="18"
                    :r="commentRadius"
                    :stroke="commentGaugeColor"
                    stroke-width="3"
                    fill="none"
                    stroke-linecap="round"
                    :stroke-dasharray="commentStrokeDasharray"
                    :stroke-dashoffset="0"
                    class="transition-all duration-300"
                  />
                </svg>
              </div>

              <!-- 文字数表示 -->
              <span
                v-if="commentIsNearLimit || commentIsOverLimit"
                :class="{
                  'text-yellow-500': commentIsNearLimit && !commentIsOverLimit,
                  'text-red-500': commentIsOverLimit
                }"
                class="text-sm font-medium"
              >
                {{ commentRemainingChars }}
              </span>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="!(commentContent || '').trim() || isCommenting || commentIsOverLimit"
              class="bg-purple-gradient hover:opacity-90 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-6 rounded-full font-medium transition-all"
              :class="{ 'opacity-50': commentIsOverLimit && !isCommenting }"
            >
              {{ isCommenting ? 'コメント中...' : 'コメント' }}
            </button>
          </div>
        </form>
      </div>

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

        <!-- 投稿フォーム（モバイル用） -->
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
