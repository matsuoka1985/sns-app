<script setup lang="ts">
interface Props {
  isLoading: boolean
  hasMore: boolean
  postsCount: number
}

defineProps<Props>()
</script>

<template>
  <div>
    <!-- 無限スクロール用ローディング -->
    <div v-if="isLoading" class="text-center py-8">
      <LoadingSpinner />
      <p class="text-gray-400 text-sm mt-2">読み込み中...</p>
    </div>

    <!-- すべて読み込み完了 -->
    <div v-else-if="!hasMore && postsCount > 0" class="text-center py-8">
      <p class="text-gray-400 text-sm">すべての投稿を表示しました</p>
    </div>
  </div>
</template>