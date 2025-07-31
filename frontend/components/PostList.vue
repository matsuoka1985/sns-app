<script setup lang="ts">
interface User {
  id: number
  name: string
  email: string
}

interface Post {
  id: number
  body: string
  user: User
  likes_count: number
  created_at: string
  is_liked: boolean
}

interface Props {
  posts: Post[]
  currentUserId?: number
  showDetailButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetailButton: true
})

const emit = defineEmits<{
  deleted: [id: number]
}>()

const handlePostDeleted = (postId: number) => {
  emit('deleted', postId)
}
</script>

<template>
  <div>
    <TransitionGroup
      name="post-list"
      tag="div"
      class="space-y-0"
    >
      <Message
        v-for="post in posts"
        :key="post.id"
        :id="post.id"
        :body="post.body"
        :user="post.user"
        :likes-count="post.likes_count"
        :created-at="post.created_at"
        :is-liked="post.is_liked"
        :current-user-id="currentUserId"
        :show-detail-button="props.showDetailButton"
        @deleted="handlePostDeleted"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* 投稿一覧のアニメーション */
.post-list-enter-active {
  transition: all 0.4s ease-out;
}

.post-list-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.post-list-leave-active {
  transition: all 0.3s ease-in;
}

.post-list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.post-list-move {
  transition: transform 0.3s ease;
}
</style>