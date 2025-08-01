<script setup lang="ts">

interface Props {
  postId: number
  initialLikesCount: number
  initialIsLiked: boolean
  currentUserId?: number
  authorUserId: number
  size?: 'sm' | 'md' | 'lg'
  showDetailButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showDetailButton: true
})

const emit = defineEmits<{
  deleted: [id: number]
}>()

// ベースURL取得
const { $config } = useNuxtApp()
const getImagePath = (path: string) => {
  const baseURL = $config?.public?.baseURL || ''
  return baseURL + path
}

// トースト機能
const { error: showErrorToast } = useToast();

// リアクティブな状態管理
const likeCount = ref(props.initialLikesCount)
const isLiked = ref(props.initialIsLiked)
const isLiking = ref(false)
const isUnliking = ref(false)
const isLoading = ref(false)

// サイズに応じたスタイル
const iconSize = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-4 h-4'
    case 'lg': return 'w-6 h-6'
    default: return 'w-5 h-5'
  }
})

const textSize = computed(() => {
  switch (props.size) {
    case 'sm': return 'text-xs'
    case 'lg': return 'text-base'
    default: return 'text-sm'
  }
})

// いいね機能（楽観的更新）
const toggleLike = async () => {
  if (isLoading.value) return

  isLoading.value = true

  const originalIsLiked = isLiked.value
  const originalLikeCount = likeCount.value

  // アニメーション開始
  if (originalIsLiked) {
    isUnliking.value = true
    setTimeout(() => { isUnliking.value = false }, 200)
  } else {
    isLiking.value = true
    setTimeout(() => { isLiking.value = false }, 300)
  }

  // 楽観的更新
  isLiked.value = !isLiked.value
  likeCount.value = isLiked.value ? originalLikeCount + 1 : originalLikeCount - 1

  try {
    const method = originalIsLiked ? 'DELETE' : 'POST'
    const response = await $fetch(`/api/posts/${props.postId}/like`, {
      method: method
    })

    if ((response as any).success) {
      likeCount.value = (response as any).likes_count
    } else {
      isLiked.value = originalIsLiked
      likeCount.value = originalLikeCount
      showErrorToast('いいね操作に失敗しました')
    }
  } catch (error) {
    isLiked.value = originalIsLiked
    likeCount.value = originalLikeCount
    showErrorToast('ネットワークエラーが発生しました')
  } finally {
    isLoading.value = false
  }
}

// 削除機能
const deletePost = () => {
  if (!confirm('この投稿を削除しますか？')) {
    return
  }
  emit('deleted', props.postId)
}

// 詳細ページ遷移
const goToDetail = () => {
  navigateTo(`/posts/${props.postId}`)
}
</script>

<template>
  <div class="flex items-center space-x-3">
    <!-- いいねボタン -->
    <button @click="toggleLike" class="flex items-center hover:opacity-75 transition-opacity">
      <img
        :src="getImagePath('/images/heart.png')"
        alt="いいね"
        class="transition-all duration-200 heart-icon"
        :class="[
          iconSize,
          {
            'opacity-100': isLiked,
            'opacity-60': !isLiked,
            'heart-bounce': isLiking,
            'heart-shrink': isUnliking,
            'heart-liked': isLiked
          }
        ]"
        :style="{
          filter: isLiked ? 'brightness(0) saturate(100%) invert(25%) sepia(89%) saturate(4878%) hue-rotate(346deg) brightness(98%) contrast(107%)' : 'none'
        }"
      />
    </button>

    <!-- いいね数 -->
    <span class="text-white" :class="textSize">{{ likeCount }}</span>

    <!-- 削除ボタン（自分の投稿のみ表示） -->
    <button
      v-if="currentUserId && authorUserId === currentUserId"
      @click="deletePost"
      class="hover:opacity-75 transition-opacity"
    >
      <img :src="getImagePath('/images/cross.png')" alt="削除" :class="iconSize" />
    </button>

    <!-- 詳細ページボタン -->
    <button 
      v-if="showDetailButton"
      @click="goToDetail" 
      class="hover:opacity-75 transition-opacity ml-2"
    >
      <img :src="getImagePath('/images/detail.png')" alt="詳細" :class="iconSize" />
    </button>
  </div>
</template>

<style scoped>
/* ハートアニメーション */
.heart-icon {
  transform-origin: center;
}

.heart-bounce {
  animation: heartBounce 0.3s ease-out;
}

.heart-shrink {
  animation: heartShrink 0.2s ease-in;
}

.heart-liked {
  animation: heartPulse 0.6s ease-in-out;
}

@keyframes heartBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

@keyframes heartShrink {
  0% { transform: scale(1); }
  50% { transform: scale(0.8); }
  100% { transform: scale(1); }
}

@keyframes heartPulse {
  0% { transform: scale(1); }
  15% { transform: scale(1.2); }
  30% { transform: scale(1); }
  45% { transform: scale(1.1); }
  60% { transform: scale(1); }
}
</style>