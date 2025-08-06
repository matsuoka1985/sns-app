<script setup lang="ts">
import type { Comment } from '~/types'

interface Props {
  postId: number
  sharedCommentBody: string
  commentsListHeight: string
}

interface Emits {
  (e: 'update:sharedCommentBody', value: string): void
  (e: 'commentCreated', comment: Comment): void
  (e: 'mounted'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// コメントデータ
const comments = ref<Comment[]>([])

// 無限スクロール
const { isLoading, hasMore, handleScroll, loadNextPage, reset } = useInfiniteScroll()

// コメント一覧を取得（ページネーション対応）
const fetchComments = async (page: number = 1) => {
  try {
    const response = await $fetch(`/api/posts/${props.postId}/comments`, {
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
    reset() // 無限スクロール状態をリセット

    const result = await fetchComments(1)
    comments.value = result.data
  } catch (error) {
    console.error('初期コメント読み込みエラー:', error)
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

// 新しいコメントを追加するハンドラー
const handleNewComment = (newComment: Comment) => {
  comments.value.unshift(newComment)
  emit('commentCreated', newComment)
}

// ref要素
const commentScrollRef = ref<HTMLElement | null>(null)
const commentFormRef = ref<HTMLElement | null>(null)
const commentsHeaderRef = ref<HTMLElement | null>(null)

// クリーンアップ関数を格納する変数
let cleanupCommentScroll: (() => void) | null = null

// コンポーネントマウント時の処理
onMounted(async () => {
  await loadInitialComments()

  // コメント無限スクロール設定
  nextTick(() => {
    if (commentScrollRef.value) {
      cleanupCommentScroll = handleScroll(loadMoreComments, commentScrollRef.value)
    }
    // 親コンポーネントに高さ再計算を通知
    emit('mounted')
  })
})

// クリーンアップ処理
onUnmounted(() => {
  if (cleanupCommentScroll) cleanupCommentScroll()
})

// 親コンポーネントからアクセスできるようにexpose
defineExpose({
  commentsHeaderRef,
  commentFormRef
})
</script>

<template>
  <!-- コメントヘッダー -->
  <div ref="commentsHeaderRef" class="border-l border-b border-white p-4 md:p-6 flex-shrink-0 text-left">
    <h3 class="text-white text-lg md:text-lg font-bold">コメント</h3>
  </div>

  <!-- コメント一覧 -->
  <div
    ref="commentScrollRef"
    class="overflow-y-auto pb-0 md:pb-0 border-white"
    :style="{
      maxHeight: commentsListHeight,
      minHeight: '200px'
    }"
  >
    <div v-if="comments.length === 0" class="p-4 md:p-6  border-white">
      <p class="text-gray-400 text-center">まだコメントはありません</p>
    </div>
    <div v-else>
      <article
        v-for="comment in comments"
        :key="comment.id"
        class="border-b border-l border-white p-4 md:p-6"
      >
        <div class="flex items-center space-x-3 mb-2">
          <h4 class="text-white font-bold">{{ comment.user.name }}</h4>
          <span class="text-gray-400 text-sm">{{ comment.created_at }}</span>
        </div>
        <p class="text-white break-words">{{ comment.body }}</p>
      </article>
      <div class="-ml-px">
        <InfiniteScrollLoader :is-loading="isLoading" :has-more="hasMore" :posts-count="comments.length" />
      </div>
    </div>
  </div>

  <!-- コメント送信フォーム（borderなし - デザインデータ通り） -->
  <div ref="commentFormRef" class="p-4 md:p-6 pb-24 md:pb-6">
    <CommentForm
      :post-id="postId"
      :model-value="sharedCommentBody"
      @update:model-value="emit('update:sharedCommentBody', $event)"
      @comment-created="handleNewComment"
    />
  </div>
</template>