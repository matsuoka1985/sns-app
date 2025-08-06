<script setup lang="ts">
import type { Post } from '~/types'

interface Props {
  posts: Post[]
  currentUserId: number | null
  likingPosts: Set<number>
  isInitialLoading: boolean
  isLoading: boolean
  hasMore: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  like: [postId: number]
  delete: [postId: number]
  mounted: []
}>()

// 投稿一覧のスクロール要素
const scrollRef = ref<HTMLElement | null>(null)

// いいねハンドラー
const handlePostLike = (postId: number) => {
  emit('like', postId)
}

// 削除ハンドラー
const handlePostDeleted = (postId: number) => {
  emit('delete', postId)
}

// マウント時に親に通知
onMounted(() => {
  emit('mounted')
})

// 親コンポーネントからアクセスできるようにexpose
defineExpose({
  scrollRef
})
</script>

<template>
  <!-- 投稿一覧: スクロール可能エリア -->
  <div
    ref="scrollRef"
    class="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch min-h-0"
  >
    <LoadingState v-if="isInitialLoading" />
    <EmptyState v-else-if="posts.length === 0" />
    <div v-else>
      <PostItem
        v-for="post in posts"
        :key="post.id"
        :post="post"
        :current-user-id="currentUserId"
        :is-liking="likingPosts.has(post.id)"
        :is-mobile="false"
        @like="handlePostLike"
        @delete="handlePostDeleted"
      />
      <InfiniteScrollLoader :is-loading="isLoading" :has-more="hasMore" :posts-count="posts.length" />
    </div>
  </div>
</template>