<script setup lang="ts">
interface User {
  id: number
  name: string
  email: string
}

interface CommentData {
  id: number
  content: string
  user: User
}

interface Props {
  comments: CommentData[]
}

defineProps<Props>()
</script>

<template>
  <div>
    <!-- コメントがない場合 -->
    <div v-if="comments.length === 0" class="text-center py-8">
      <div class="text-gray-400 text-base">
        <p>まだコメントがありません</p>
        <p class="text-sm mt-2">最初のコメントを投稿してみましょう！</p>
      </div>
    </div>

    <!-- コメント一覧 -->
    <div v-else>
      <TransitionGroup
        name="comment-list"
        tag="div"
        class="space-y-0"
      >
        <Comment
          v-for="comment in comments"
          :key="comment.id"
          :id="comment.id"
          :content="comment.content"
          :user="comment.user"
        />
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
/* コメント一覧のアニメーション */
.comment-list-enter-active {
  transition: all 0.3s ease-out;
}

.comment-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.comment-list-leave-active {
  transition: all 0.2s ease-in;
}

.comment-list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.comment-list-move {
  transition: transform 0.2s ease;
}
</style>