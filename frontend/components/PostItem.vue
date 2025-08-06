<script setup lang="ts">
import type { User, Post } from '~/types'

interface Props {
  post: Post
  currentUserId: number | null
  isLiking?: boolean
  showDetailLink?: boolean
  isMobile?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLiking: false,
  showDetailLink: true,
  isMobile: false
})

const iconSize = computed(() => props.isMobile ? 'w-4 h-4' : 'w-5 h-5')
const padding = computed(() => props.isMobile ? 'p-4' : 'p-6')

const emit = defineEmits<{
  like: [postId: number]
  delete: [postId: number]
}>()

const handleLike = () => {
  emit('like', props.post.id)
}

const handleDelete = () => {
  emit('delete', props.post.id)
}
</script>

<template>
  <article class="border-l border-b border-white" :class="padding">
    <div class="flex items-center space-x-3 mb-2">
      <h3 class="text-white font-bold">{{ post.user.name }}</h3>

      <button
        @click="handleLike"
        :disabled="isLiking"
        class="flex items-center space-x-1 hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <img
          src="/images/heart.png"
          alt="いいね"
          :class="iconSize"
          class="transition-all duration-300"
          :style="post.is_liked ? 'filter: brightness(0) saturate(100%) invert(23%) sepia(100%) saturate(7500%) hue-rotate(340deg) brightness(1.2) contrast(1);' : 'filter: brightness(0) saturate(100%) invert(100%);'"
        />
        <span class="text-white text-sm">{{ post.likes_count }}</span>
      </button>

      <button
        v-if="post.user.id === currentUserId"
        @click="handleDelete"
        class="hover:opacity-80 transition-opacity"
      >
        <img src="/images/cross.png" alt="削除" :class="iconSize" />
      </button>

      <NuxtLink
        v-if="showDetailLink"
        :to="`/posts/${post.id}`"
        class="hover:opacity-80 transition-opacity"
      >
        <img src="/images/detail.png" alt="詳細" :class="iconSize" />
      </NuxtLink>
    </div>
    <p class="text-white break-words">{{ post.body }}</p>
  </article>
</template>