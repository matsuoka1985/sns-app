<script setup lang="ts">
// 認証必須ページ
definePageMeta({ middleware: 'require-auth' })

/* 型定義 ---------------------------------------------------- */
interface User { id: number; name: string; email: string }
interface Post {
  id: number; body: string; user: User;
  likes_count: number; is_liked: boolean
}
interface CommentData { id: number; content: string; user: User }

/* ルートパラメータ ------------------------------------------ */
const postId = parseInt(useRoute().params.id as string)

/* 状態 ------------------------------------------------------ */
const post = ref<Post | null>(null)
const comments = ref<CommentData[]>([])
const isLoading = ref(true)
const currentUserId = ref<number | null>(null)

const headerRef = ref<HTMLElement | null>(null)
const postRef = ref<HTMLElement | null>(null)
const headingRef = ref<HTMLElement | null>(null)
const formRef = ref<HTMLElement | null>(null)
const listMax = ref<number>(0)

const updateListHeight = () => {
  nextTick(() => {
    const headerH = headerRef.value?.offsetHeight ?? 0
    const postH = postRef.value?.offsetHeight ?? 0
    const headingH = headingRef.value?.offsetHeight ?? 0
    const formH = formRef.value?.offsetHeight ?? 0
    listMax.value = window.innerHeight - headerH - postH - headingH - formH
  })
}

/* 無限スクロール -------------------------------------------- */
const {
  isLoading: isLoadingMore,
  hasMore,
  handleScroll,
  loadNextPage,
  reset: resetInfiniteScroll,
  setHasMore
} = useInfiniteScroll()

const listRef = ref<HTMLElement | null>(null)

/* トースト --------------------------------------------------- */
const { error: showErr, success: showOk } = useToast()

/* API ------------------------------------------------------- */
const fetchPost = async () => {
  const res = await $fetch(`http://localhost/api/posts/${postId}`, {
    credentials: 'include'
  })
  if (res.success) {
    post.value = res.post
    currentUserId.value = res.current_user_id
  } else { showErr('投稿が見つからない'); await navigateTo('/') }
}

const fetchComments = async (p = 1) => {
  const res = await $fetch(
    `http://localhost/api/posts/${postId}/comments?page=${p}&per_page=10`,
    { credentials: 'include' }
  )
  if (!res.success) throw new Error(res.error)
  return { data: res.comments, pagination: res.pagination }
}

/* ハンドラー ------------------------------------------------ */
const loadMore = async () => {
  const r = await loadNextPage(fetchComments)
  comments.value.push(...r.data)
  if (r.pagination) setHasMore?.(r.pagination.has_more_pages)
}
const handleDeleted = async (id: number) => {
  console.log('handleDeleted called with id:', id)
  try {
    const r = await $fetch(`/api/posts/${id}`, {
      method: 'DELETE'
    })
    console.log('Delete response:', r)
    if (r.success) {
      console.log('Delete successful, showing toast')
      // 復元アクション付きトーストを表示
      showOk('投稿を削除しました', 8000, {
        label: '復元しますか？',
        action: () => restorePostFromDetail(id)
      })
      // トーストが表示されるまで少し待ってからリダイレクト
      setTimeout(async () => {
        await navigateTo('/')
      }, 2000)
    } else {
      console.log('Delete failed')
      showErr('削除に失敗しました')
    }
  } catch (error) {
    console.log('Delete error:', error)
    showErr('削除に失敗しました')
  }
}

// 詳細ページから復元処理
const restorePostFromDetail = async (postId: string) => {
  try {
    console.log('🔄 投稿復元開始:', postId)
    
    const response = await $fetch(`/api/posts/${postId}/restore`, {
      method: 'POST'
    })

    if (response.success) {
      console.log('✅ 投稿復元成功:', response.message)
      showOk('投稿を復元しました')
      // 復元後は詳細ページに戻る
      await navigateTo(`/posts/${postId}`)
    } else {
      console.error('❌ 投稿復元失敗:', response.error)
      showErr('投稿の復元に失敗しました')
    }
  } catch (error) {
    console.error('投稿復元エラー:', error)
    showErr('投稿の復元でエラーが発生しました')
  }
}

const handleSubmit = (c: CommentData) => comments.value.unshift(c)

/* 初期ロード ----------------------------------------------- */
const load = async () => {
  isLoading.value = true
  resetInfiniteScroll()
  const [, com] = await Promise.all([fetchPost(), fetchComments(1)])
  comments.value = com.data
  setHasMore?.(com.pagination?.has_more_pages)
  isLoading.value = false
}
onMounted(async () => {
  await load()
  nextTick(() => {
    if (listRef.value) {
      const off = handleScroll(loadMore, listRef.value)
      onUnmounted(off)
    }
  })
  updateListHeight()
  window.addEventListener('resize', updateListHeight)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateListHeight)
})

/* タイトル --------------------------------------------------- */
useHead(() => ({
  title: post.value ? `${post.value.user.name}の投稿 - SHARE` : 'コメント - SHARE'
}))
</script>

<template>
  <div class="bg-custom-dark min-h-screen">
    <div class="flex">
      <SideNav />

      <div class="flex-1 flex flex-col">
        <!-- ヘッダー (常に表示) -->
        <div ref="headerRef" class="bg-custom-dark border-l border-b border-white p-4">
          <h1 class="text-white text-xl font-bold">コメント</h1>
        </div>

        <!-- 投稿エリア -->
        <div ref="postRef">
          <div v-if="isLoading" class="flex justify-center items-center py-8">
            <LoadingSpinner size="lg" />
          </div>
          <Message v-else-if="post" :id="post.id" :body="post.body" :user="post.user" :likes-count="post.likes_count" :is-liked="post.is_liked" :current-user-id="currentUserId || undefined" :show-detail-button="false" @deleted="handleDeleted" />
        </div>

        <template v-if="!isLoading">
          <!-- コメント見出し -->
          <div ref="headingRef" class="bg-custom-dark border-l border-b border-white py-4 px-6 text-center">
            <span class="text-white text-lg font-medium">コメント</span>
          </div>

          <!-- コメント一覧エリア -->
          <div ref="listRef" :style="{ maxHeight: listMax + 'px', overflowY: 'auto' }">
            <CommentList :comments="comments" />
            <InfiniteScrollLoader :is-loading="isLoadingMore" :has-more="hasMore" :posts-count="comments.length" />
          </div>

          <!-- コメントフォーム -->
          <div ref="formRef" class="bg-custom-dark">
            <CommentForm :post-id="post?.id || 0" @submitted="handleSubmit" />
          </div>
        </template>
      </div>
    </div>

    <ToastContainer />
  </div>
</template>
