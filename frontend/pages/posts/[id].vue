<script setup lang="ts">

// 認証必須ページ
definePageMeta({
  middleware: 'require-auth'
})

import type { User, Post, Comment } from '~/types'

// パラメーターから投稿IDを取得
const route = useRoute()
const postId = Number(route.params.id)

// 投稿データ
const post = ref<Post | null>(null)
const isPostLoading = ref(true)
const currentUserId = ref<number | null>(null)


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


// いいね機能
const { likingPosts, handleLike, cleanup: cleanupLike } = useLike()

// 認証機能
const { handleLogout } = useAuth()

// 投稿アクション機能
const { handlePostDeletedInDetail } = usePostActions()

// モバイル投稿機能
const { createMobilePostForDetail } = useMobilePost()

// いいねハンドラー（投稿詳細用）
const handlePostLike = () => {
  handleLike(post.value)
}

// 投稿削除ハンドラー（詳細ページ用）
const handlePostDeleted = () => {
  if (!post.value) return
  handlePostDeletedInDetail(postId)
}


// 新しいコメントを追加するハンドラー
const handleNewComment = (newComment: Comment) => {
  if (post.value) {
    post.value.comments_count += 1
  }
  updateCommentsListHeight()
}

// 新しい投稿を処理するハンドラー
const handleNewPost = (newPost: any) => {
  sharedPostBody.value = ''
  // 投稿成功通知はDesktopSidebar内で処理済み
}



// 動的高さ計算用のref（統合）
const headerRef = ref<HTMLElement | null>(null)
const postSectionRef = ref<HTMLElement | null>(null)
const commentsSectionRef = ref<HTMLElement | null>(null)
const commentsListHeight = ref('auto')

// モバイル投稿モーダル用の状態
const showMobileModal = ref(false)
const isMobilePosting = ref(false)

// デスクトップとモバイルで共有する投稿内容
const sharedPostBody = ref('')

// デスクトップとモバイルで共有するコメント内容
const sharedCommentBody = ref('')



// モバイル投稿処理
const createMobilePost = async () => {
  isMobilePosting.value = true

  const success = await createMobilePostForDetail(
    sharedPostBody.value,
    () => {
      isMobilePosting.value = false
    }
  )

  if (success) {
    sharedPostBody.value = ''
    showMobileModal.value = false
  }
}


const updateCommentsListHeight = () => {
  nextTick(() => {
    if (headerRef.value && postSectionRef.value && commentsSectionRef.value) {
      const headerHeight = headerRef.value?.offsetHeight || 0
      const postHeight = postSectionRef.value.offsetHeight
      const screenHeight = window.innerHeight

      // CommentsSection内のヘッダーとフォームの高さを取得
      const commentsHeaderHeight = commentsSectionRef.value.commentsHeaderRef?.offsetHeight || 88 // デフォルト値
      const formHeight = commentsSectionRef.value.commentFormRef?.offsetHeight || 168 // デフォルト値
      // ドーナツゲージとエラーメッセージ領域の高さを追加で考慮
      const donutGaugeHeight = 56 // ドーナツゲージ32px + エラーメッセージ24px
      // モバイルの場合はフローティングボタン用余白も考慮
      const mobileBottomPadding = window.innerWidth < 768 ? 32 : 0
      const availableHeight = screenHeight - headerHeight - postHeight - commentsHeaderHeight - formHeight - donutGaugeHeight - mobileBottomPadding
      const finalHeight = Math.max(availableHeight, 200)
      commentsListHeight.value = `${finalHeight}px`
      
      // デバッグログを追加
      console.log('高さ計算デバッグ:', {
        screenHeight,
        headerHeight,
        postHeight,
        commentsHeaderHeight,
        formHeight,
        donutGaugeHeight,
        mobileBottomPadding,
        availableHeight,
        finalHeight,
        commentsListHeightValue: commentsListHeight.value
      })
    } else {
      console.log('要素が見つからない:', {
        headerRef: !!headerRef.value,
        postSectionRef: !!postSectionRef.value,
        commentsSectionRef: !!commentsSectionRef.value
      })
    }
  })
}

// ページ読み込み時の処理
onMounted(async () => {
  try {
    isPostLoading.value = true
    await fetchPost()
  } catch (error) {
    console.error('ページ読み込みエラー:', error)
  } finally {
    isPostLoading.value = false
    // ローディング終了後、コンポーネントがマウントされるのを待つ
    nextTick(() => {
      updateCommentsListHeight()
    })
  }

  // リサイズイベント設定
  window.addEventListener('resize', updateCommentsListHeight)
})

// クリーンアップ処理
onUnmounted(() => {
  window.removeEventListener('resize', updateCommentsListHeight)

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
    <div class="h-full flex flex-col md:flex-row">
      <!-- サイドバー（デスクトップのみ） -->
      <DesktopSidebar
        class="hidden md:block"
        :post-body="sharedPostBody"
        @new-post="handleNewPost"
        @update-body="sharedPostBody = $event"
      />

      <!-- メインコンテンツ -->
      <div class="flex-1 flex flex-col min-w-0">
        <main class="flex-1 flex flex-col">
          <!-- コンテンツエリア -->
          <div class="flex flex-col">
            <!-- ヘッダー -->
            <PageHeader ref="headerRef" title="コメント" />

            <!-- 投稿詳細セクション -->
            <section ref="postSectionRef" class="flex-shrink-0">
              <PostItem
                v-if="post"
                :post="post"
                :current-user-id="currentUserId"
                :is-liking="likingPosts.has(post?.id || 0)"
                :show-detail-link="false"
                :is-mobile="false"
                @like="handlePostLike"
                @delete="handlePostDeleted"
              />
            </section>

            <!-- コメントセクション -->
            <CommentsSection
              v-if="!isPostLoading"
              ref="commentsSectionRef"
              :post-id="postId"
              :shared-comment-body="sharedCommentBody"
              :comments-list-height="commentsListHeight"
              @update:shared-comment-body="sharedCommentBody = $event"
              @comment-created="handleNewComment"
              @mounted="updateCommentsListHeight"
            />
            
            <!-- ローディング時はコメントセクション全体をローディング表示 -->
            <div v-else class="flex-1 flex items-center justify-center">
              <div class="flex flex-col items-center py-16">
                <LoadingSpinner size="lg" />
                <p class="text-gray-400 text-sm mt-4">読み込み中...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- フローティング投稿ボタン（モバイルのみ、コメント入力時は非表示） -->
    <FloatingPostButton 
      :hide-when-typing="true" 
      :comment-body="sharedCommentBody" 
      @click="showMobileModal = true" 
    />

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
