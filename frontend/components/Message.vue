<script setup lang="ts">
interface MessageProps {
  id: number
  body: string
  user: {
    id: number
    name: string
    email: string
  }
  likesCount: number
  isLiked: boolean
  currentUserId?: number
  showDetailButton?: boolean
}

defineProps<MessageProps>()

const emit = defineEmits<{
  deleted: [id: number]
  restore: [data: { id: number, post: any }]
}>()

// 削除イベントハンドラー
const handleDeleted = (postId: number) => {
  emit('deleted', postId)
}
</script>

<template>
  <article class="bg-custom-dark border-l border-b border-white p-4 hover:bg-gray-800 transition-colors duration-200">
    <!-- 上段：投稿者名とアクションボタン -->
    <div class="flex items-center space-x-3 mb-3">
      <!-- ユーザー名 -->
      <span class="text-white font-bold">{{ user.name }}</span>
      
      <!-- アクションボタン -->
      <PostActions 
        :post-id="id"
        :initial-likes-count="likesCount"
        :initial-is-liked="isLiked"
        :current-user-id="currentUserId"
        :author-user-id="user.id"
        :show-detail-button="showDetailButton"
        size="md"
        @deleted="handleDeleted"
      />
    </div>

    <!-- 下段：投稿内容 -->
    <div class="text-white text-base leading-relaxed">
      {{ body }}
    </div>
  </article>
</template>